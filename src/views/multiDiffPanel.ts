import * as vscode from 'vscode';
import { t } from '../i18n';
import { alignColumns, summarize } from '../utils/multiDiff';

export interface MultiDiffColumn {
  /** Header text for the column. */
  title: string;
  /** Text content of the column. */
  text: string;
}

/**
 * Webview panel that renders 2–3 columns side by side with stable rows
 * aligned, giving a diff3-style view of how the versions relate.
 */
export class MultiDiffPanel {
  public static readonly viewType = 'anydiff.multiDiffPanel';

  private static instance: MultiDiffPanel | undefined;

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
    this.panel.webview.onDidReceiveMessage((message) => this.onMessage(message));
    this.update(columns);
  }

  /** Re-renders the panel with new columns. */
  update(columns: MultiDiffColumn[]): void {
    this.panel.title = `${t('panel.title')} — ${columns.map((c) => c.title).join(' | ')}`;
    this.panel.webview.html = this.renderHtml(columns);
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.One);
  }

  private onMessage(message: { command?: string }): void {
    if (message.command === 'ready') {
      // The webview booted; nothing else to push (html already rendered).
      return;
    }
  }

  private renderHtml(columns: MultiDiffColumn[]): string {
    const ignore = {
      ignoreTrimWhitespace: vscode.workspace.getConfiguration('anydiff').get<boolean>('ignoreTrimWhitespace', false),
      ignoreAllWhitespace: vscode.workspace.getConfiguration('anydiff').get<boolean>('ignoreAllWhitespace', false),
      ignoreCase: vscode.workspace.getConfiguration('anydiff').get<boolean>('ignoreCase', false),
    };

    const rows = alignColumns(columns.map((column) => column.text), ignore);
    const stats = summarize(rows, columns.map((column) => column.text));

    const headers = columns
      .map((column) => `<th>${escapeHtml(column.title)}<span class="total">${countLines(column.text)}</span></th>`)
      .join('');

    const body = rows
      .map((row) => `<tr class="${row.kind}">${row.cells.map(renderCell).join('')}</tr>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
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
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; gap: 12px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #ddd);
    background: var(--vscode-editor-background, #fff);
  }
  .bar .stat b { font-weight: 600; }
  .stable { background: color-mix(in srgb, var(--vscode-foreground, #333) 4%, transparent); }
  .changed { background: color-mix(in srgb, var(--vscode-errorForeground, #f00) 12%, transparent); }
  table { border-collapse: collapse; width: 100%; }
  th {
    position: sticky; top: 31px; z-index: 1;
    text-align: left; padding: 6px 10px;
    border-bottom: 2px solid var(--vscode-panel-border, #ddd);
    background: var(--vscode-editor-background, #fff);
    white-space: nowrap;
  }
  th .total { opacity: .6; margin-left: 8px; font-weight: 400; }
  td {
    vertical-align: top; padding: 0 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    white-space: pre; overflow-x: auto;
    border-right: 1px solid var(--vscode-panel-border, #ddd);
    width: ${Math.floor(100 / columns.length)}%;
  }
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
</div>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${body}</tbody>
</table>
<script>
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'ready' });
</script>
</body>
</html>`;
  }
}

function renderCell(cell: string | null): string {
  if (cell === null) {
    return '<td class="empty"></td>';
  }
  return `<td><code>${escapeHtml(cell) || '&nbsp;'}</code></td>`;
}

function countLines(text: string): number {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return lines.length > 1 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
