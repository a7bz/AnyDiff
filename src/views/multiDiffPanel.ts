import * as vscode from 'vscode';
import { t } from '../i18n';
import { alignColumns, summarize } from '../utils/multiDiff';
import { getIgnoreOptions } from '../utils/config';
import { createNonce, escapeHtml } from './webview';

export interface MultiDiffColumn {
  /** Header text for the column. */
  title: string;
  /** Text content of the column. */
  text: string;
  /** Language id, used to label the column header. */
  languageId?: string;
}

/**
 * Webview panel that renders 2–3 columns side by side with stable rows
 * aligned, giving a diff3-style view of how the versions relate.
 *
 * The webview is fully client-side: alignment is computed in the extension
 * host and baked into the HTML, while the toolbar (hiding stable rows,
 * collapsing) is handled by a nonce-guarded script.
 */
export class MultiDiffPanel {
  public static readonly viewType = 'anydiff.multiDiffPanel';

  private static instance: MultiDiffPanel | undefined;

  private current: MultiDiffColumn[] = [];

  /** Columns currently on screen, for the "save session" command. */
  static currentColumns(): MultiDiffColumn[] | undefined {
    return MultiDiffPanel.instance?.columns;
  }

  static createOrShow(extensionUri: vscode.Uri, columns: MultiDiffColumn[]): void {
    if (columns.length < 2) {
      vscode.window.showWarningMessage(t('error.multiDiffNeedsTwo'));
      return;
    }

    if (MultiDiffPanel.instance) {
      MultiDiffPanel.instance.update(columns);
      MultiDiffPanel.instance.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MultiDiffPanel.viewType,
      t('panel.title'),
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      },
    );

    MultiDiffPanel.instance = new MultiDiffPanel(panel, extensionUri, columns);
    panel.onDidDispose(() => {
      MultiDiffPanel.instance = undefined;
    });
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    columns: MultiDiffColumn[],
  ) {
    this.panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.png');
    this.panel.webview.onDidReceiveMessage((message: { command?: string }) => this.onMessage(message));
    this.update(columns);
  }

  /** Columns currently rendered by this panel. */
  get columns(): MultiDiffColumn[] {
    return this.current;
  }

  /** Re-renders the panel with new columns. */
  update(columns: MultiDiffColumn[]): void {
    this.current = columns;
    this.panel.title = `${t('panel.title')} — ${columns.map((c) => c.title).join(' | ')}`;
    this.panel.webview.html = renderHtml(columns);
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.One);
  }

  private onMessage(message: { command?: string }): void {
    if (message?.command === 'ready') {
      // The webview booted; nothing else to push (html already rendered).
      return;
    }
  }
}

function renderHtml(columns: MultiDiffColumn[]): string {
  const nonce = createNonce();
  const rows = alignColumns(columns.map((column) => column.text), getIgnoreOptions());
  const stats = summarize(rows, columns.map((column) => column.text));

  const headers = columns
    .map(
      (column) =>
        `<th><span class="name">${escapeHtml(column.title)}</span>` +
        (column.languageId && column.languageId !== 'plaintext'
          ? `<span class="lang">${escapeHtml(column.languageId)}</span>`
          : '') +
        `<span class="total">${countLines(column.text)}</span></th>`,
    )
    .join('');

  const lineNumbers = columns.map(() => 0);
  const body = rows
    .map((row) => {
      const cells = row.cells.map((cell, index) => {
        if (cell === null) {
          return '<td class="empty"></td>';
        }
        const line = ++lineNumbers[index];
        const changed = row.kind === 'changed' && cell !== row.cells[0];
        return (
          `<td class="cell${changed ? ' cell-changed' : ''}">` +
          `<span class="ln">${line}</span><code>${escapeHtml(cell) || '&nbsp;'}</code></td>`
        );
      });
      return `<tr class="${row.kind}">${cells.join('')}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(vscode.env.language)}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(t('panel.title'))}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 12px/1.5 var(--vscode-font-family, sans-serif);
    color: var(--vscode-foreground, #333);
    background: var(--vscode-editor-background, #fff);
  }
  .bar {
    position: sticky; top: 0; z-index: 3;
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #ddd);
    background: var(--vscode-editor-background, #fff);
  }
  .bar .stat b { font-weight: 600; }
  .bar .spacer { flex: 1; }
  .bar button {
    padding: 3px 10px; cursor: pointer; border: none; border-radius: 2px;
    color: var(--vscode-button-secondaryForeground, inherit);
    background: var(--vscode-button-secondaryBackground, #5f6a72);
  }
  .bar button[aria-pressed="true"] {
    color: var(--vscode-button-foreground, #fff);
    background: var(--vscode-button-background, #0a66c2);
  }
  .stable { background: color-mix(in srgb, var(--vscode-foreground, #333) 4%, transparent); }
  .changed { background: color-mix(in srgb, var(--vscode-errorForeground, #f00) 10%, transparent); }
  body.only-changed tr.stable { display: none; }
  table { border-collapse: collapse; width: 100%; }
  th {
    position: sticky; top: 33px; z-index: 2;
    text-align: left; padding: 6px 10px;
    border-bottom: 2px solid var(--vscode-panel-border, #ddd);
    background: var(--vscode-editor-background, #fff);
    white-space: nowrap;
  }
  th .name { font-weight: 600; }
  th .lang, th .total { opacity: .6; margin-left: 8px; font-weight: 400; }
  td {
    vertical-align: top; padding: 0 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    white-space: pre; overflow-x: auto;
    border-right: 1px solid var(--vscode-panel-border, #ddd);
    width: ${Math.floor(100 / columns.length)}%;
  }
  td .ln {
    display: inline-block; width: 3.5em; margin-right: 8px;
    text-align: right; opacity: .45; user-select: none;
  }
  td.cell-changed { background: color-mix(in srgb, var(--vscode-editor-findMatchHighlightBackground, #ea5c0055) 60%, transparent); }
  td.empty { background: repeating-linear-gradient(45deg, transparent, transparent 6px, color-mix(in srgb, var(--vscode-foreground, #333) 8%, transparent) 6px, color-mix(in srgb, var(--vscode-foreground, #333) 8%, transparent) 12px); }
  td code { font: inherit; }
  tr:hover td { background-color: color-mix(in srgb, var(--vscode-list-hoverBackground, #eee) 60%, transparent); }
</style>
</head>
<body>
<div class="bar">
  <span class="stat"><b>${stats.changed}</b> ${escapeHtml(t('panel.changedRows'))}</span>
  <span class="stat"><b>${stats.stable}</b> ${escapeHtml(t('panel.stableRows'))}</span>
  <span class="stat">${escapeHtml(t('panel.columns'))}: <b>${columns.length}</b></span>
  <span class="spacer"></span>
  <button id="toggle" aria-pressed="false">${escapeHtml(t('panel.onlyChanged'))}</button>
</div>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${body}</tbody>
</table>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const toggle = document.getElementById('toggle');
  toggle.addEventListener('click', () => {
    const active = document.body.classList.toggle('only-changed');
    toggle.setAttribute('aria-pressed', String(active));
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      toggle.click();
    }
  });
  vscode.postMessage({ command: 'ready' });
</script>
</body>
</html>`;
}

function countLines(text: string): number {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return lines.length > 1 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}
