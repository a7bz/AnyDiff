import * as vscode from 'vscode';
import { t } from '../i18n';
import { createNonce, escapeHtml } from './webview';

export interface TextInputOptions {
  title: string;
  placeholder: string;
  /** Pre-filled content, e.g. the current selection. */
  initialValue?: string;
}

/**
 * Prompts for free-form multi-line text.
 *
 * VSCode has no public multi-line input box, so this renders a small webview
 * with a textarea. The promise resolves with the entered text, or `undefined`
 * when the panel is closed without submitting.
 */
export function promptForMultilineText(
  extensionUri: vscode.Uri,
  options: TextInputOptions,
): Promise<string | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'anydiff.textInput',
    options.title,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    },
  );
  panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.png');

  return new Promise<string | undefined>((resolve) => {
    let settled = false;
    const finish = (value: string | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
      panel.dispose();
    };

    panel.webview.onDidReceiveMessage((message: { command?: string; text?: string }) => {
      if (message?.command === 'submit') {
        finish(message.text ?? '');
      } else if (message?.command === 'cancel') {
        finish(undefined);
      }
    });
    panel.onDidDispose(() => finish(undefined));
    panel.webview.html = renderHtml(options);
  });
}

function renderHtml(options: TextInputOptions): string {
  const nonce = createNonce();
  const submitLabel = t('input.submit');
  const cancelLabel = t('input.cancel');
  return `<!DOCTYPE html>
<html lang="${escapeHtml(vscode.env.language)}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; height: 100vh; display: flex; flex-direction: column;
    font: 13px/1.5 var(--vscode-font-family, sans-serif);
    color: var(--vscode-foreground, #333);
    background: var(--vscode-editor-background, #fff);
  }
  header { padding: 10px 14px; opacity: .85; }
  textarea {
    flex: 1; margin: 0 14px; padding: 10px; resize: none;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-input-foreground, inherit);
    background: var(--vscode-input-background, transparent);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #ccc));
    border-radius: 4px;
  }
  footer { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 14px; }
  button {
    padding: 5px 14px; border: none; border-radius: 2px; cursor: pointer;
    color: var(--vscode-button-foreground, #fff);
    background: var(--vscode-button-background, #0a66c2);
  }
  button.secondary {
    color: var(--vscode-button-secondaryForeground, inherit);
    background: var(--vscode-button-secondaryBackground, #5f6a72);
  }
  button:hover { opacity: .9; }
</style>
</head>
<body>
<header>${escapeHtml(options.placeholder)}</header>
<textarea id="input" spellcheck="false" placeholder="${escapeHtml(options.placeholder)}"></textarea>
<footer>
  <button class="secondary" id="cancel">${escapeHtml(cancelLabel)}</button>
  <button id="submit">${escapeHtml(submitLabel)}</button>
</footer>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const input = document.getElementById('input');
  input.value = ${JSON.stringify(options.initialValue ?? '')};
  input.focus();
  document.getElementById('submit').addEventListener('click', () => {
    vscode.postMessage({ command: 'submit', text: input.value });
  });
  document.getElementById('cancel').addEventListener('click', () => {
    vscode.postMessage({ command: 'cancel' });
  });
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      vscode.postMessage({ command: 'submit', text: input.value });
    } else if (event.key === 'Escape') {
      vscode.postMessage({ command: 'cancel' });
    }
  });
</script>
</body>
</html>`;
}
