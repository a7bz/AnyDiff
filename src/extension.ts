import * as vscode from 'vscode';
import { initI18n, refreshI18n, t } from './i18n';
import { compareFileWithActiveCommand, compareFilesCommand } from './commands/compareFiles';
import {
  compareClipboardWithFileCommand,
  compareSelectedWithClipboardCommand,
  compareSelectedWithFileCommand,
  compareSelectedWithInputCommand,
} from './commands/compareSelected';
import { ClipboardHistory, showClipboardHistoryCommand } from './commands/clipboardHistory';
import { compareWithGitHeadCommand } from './commands/gitCompare';
import { exportPatchCommand } from './commands/exportPatch';
import { RecentComparisons, showRecentCommand } from './commands/recentComparisons';
import { compareMultipleFilesCommand } from './commands/compareMultiple';
import { openMultiDiffPanelCommand } from './commands/multiDiff';
import { VirtualDocProvider } from './providers/virtualDocProvider';

export function activate(context: vscode.ExtensionContext): void {
  initI18n();

  const virtualDocs = new VirtualDocProvider();
  const history = new ClipboardHistory(context.globalState);
  const recent = new RecentComparisons(context.globalState);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('anydiff.language')) {
        refreshI18n();
      }
    }),
  );

  vscode.workspace.registerTextDocumentContentProvider('any-diff', virtualDocs);

  const register = (id: string, handler: () => Promise<void> | void): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  };

  register('anydiff.compareFiles', () => compareFilesCommand());
  register('anydiff.compareMultipleFiles', (...args: unknown[]) => {
    const uris = (args.filter((arg) => isUriLike(arg)) as vscode.Uri[])
      .flatMap((arg) => (Array.isArray(arg) ? arg : [arg]));
    return compareMultipleFilesCommand(uris);
  });
  register('anydiff.compareFileWithActive', () => compareFileWithActiveCommand());
  register('anydiff.compareSelectedWithClipboard', () => compareSelectedWithClipboardCommand(virtualDocs));
  register('anydiff.compareSelectedWithFile', () => compareSelectedWithFileCommand(virtualDocs));
  register('anydiff.compareSelectedWithInput', () => compareSelectedWithInputCommand(virtualDocs));
  register('anydiff.compareClipboardWithFile', () => compareClipboardWithFileCommand(virtualDocs));
  register('anydiff.compareWithGitHead', () => compareWithGitHeadCommand(virtualDocs));
  register('anydiff.showClipboardHistory', () => showClipboardHistoryCommand(history, virtualDocs));
  register('anydiff.showRecent', () => showRecentCommand(recent));
  register('anydiff.exportPatch', () => exportPatchCommand());
  register('anydiff.about', () => showAbout());
  register('anydiff.openMultiDiffPanel', () => openMultiDiffPanelCommand(context.extensionUri));

  // Track clipboard copies in the background for the history feature.
  const watcher = startClipboardWatch(history);
  context.subscriptions.push({ dispose: () => watcher.stop() });
}

export function deactivate(): void {
  // Nothing to clean up: providers and commands are disposed via subscriptions.
}

/** True when a value looks like a `vscode.Uri` (duck-typed). */
function isUriLike(value: unknown): value is vscode.Uri {
  return typeof value === 'object' && value !== null && 'scheme' in value && 'fsPath' in value;
}

function showAbout(): void {
  vscode.window.showInformationMessage(
    t('about.message', '0.1.0'),
    t('about.learnMore'),
  ).then((choice) => {
    if (choice === t('about.learnMore')) {
      void vscode.env.openExternal(vscode.Uri.parse('https://github.com/anydiff/anydiff'));
    }
  });
}

/** Polls the clipboard and records new copies in the history. */
function startClipboardWatch(history: ClipboardHistory): { stop(): void } {
  let last = '';
  const interval = setInterval(async () => {
    try {
      const current = await vscode.env.clipboard.readText();
      if (current && current !== last) {
        last = current;
        await history.push(current);
      }
    } catch {
      // Clipboard may be unavailable (e.g. remote session); ignore.
    }
  }, 1500);

  return { stop: () => clearInterval(interval) };
}
