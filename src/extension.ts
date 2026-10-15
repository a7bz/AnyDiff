import * as vscode from 'vscode';
import { initI18n, refreshI18n, t } from './i18n';
import { compareFileWithActiveCommand, compareFilesCommand } from './commands/compareFiles';
import {
  compareClipboardWithFileCommand,
  compareSelectedWithClipboardCommand,
  compareSelectedWithFileCommand,
  compareSelectedWithInputCommand,
  compareSelectionWithSelectionCommand,
  SelectionStash,
} from './commands/compareSelected';
import { ClipboardHistory, showClipboardHistoryCommand } from './commands/clipboardHistory';
import { compareGitRevisionsCommand, compareWithGitHeadCommand } from './commands/gitCompare';
import { exportPatchCommand } from './commands/exportPatch';
import { RecentComparisons, showRecentCommand } from './commands/recentComparisons';
import { compareMultipleFilesCommand } from './commands/compareMultiple';
import { compareJsonSemanticCommand, compareJsonWithActiveCommand } from './commands/compareJson';
import { openMultiDiffPanelCommand } from './commands/multiDiff';
import { openSessionCommand, saveSessionCommand, SessionStore } from './commands/sessions';
import { VirtualDocProvider } from './providers/virtualDocProvider';
import { setDiffRecorder } from './views/diffViewManager';
import { startClipboardWatch } from './utils/clipboardWatcher';
import { maybeShowWelcome } from './utils/welcome';

export function activate(context: vscode.ExtensionContext): void {
  initI18n();

  const virtualDocs = new VirtualDocProvider();
  const history = new ClipboardHistory(context.globalState);
  const recent = new RecentComparisons(context.globalState);
  const stash = new SelectionStash();
  const sessions = new SessionStore(context.globalState);

  // Every comparison opened through the manager is remembered for `showRecent`.
  setDiffRecorder(recent);
  context.subscriptions.push(virtualDocs);
  context.subscriptions.push({ dispose: () => setDiffRecorder(undefined) });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('anydiff.language')) {
        refreshI18n();
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('any-diff', virtualDocs),
  );

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
  register('anydiff.compareSelectedWithInput', () =>
    compareSelectedWithInputCommand(virtualDocs, context.extensionUri));
  register('anydiff.compareSelectionWithSelection', () =>
    compareSelectionWithSelectionCommand(virtualDocs, stash));
  register('anydiff.compareClipboardWithFile', () => compareClipboardWithFileCommand(virtualDocs));
  register('anydiff.compareJsonSemantic', () => compareJsonSemanticCommand(virtualDocs));
  register('anydiff.compareJsonWithActive', () => compareJsonWithActiveCommand(virtualDocs));
  register('anydiff.compareWithGitHead', () => compareWithGitHeadCommand(virtualDocs));
  register('anydiff.compareGitRevisions', () => compareGitRevisionsCommand(virtualDocs));
  register('anydiff.showClipboardHistory', () => showClipboardHistoryCommand(history, virtualDocs));
  register('anydiff.showRecent', () => showRecentCommand(recent, virtualDocs));
  register('anydiff.exportPatch', () => exportPatchCommand());
  register('anydiff.about', () => showAbout());
  register('anydiff.openMultiDiffPanel', () => openMultiDiffPanelCommand(context.extensionUri));
  register('anydiff.saveSession', () => saveSessionCommand(sessions));
  register('anydiff.openSession', () => openSessionCommand(sessions, context.extensionUri));

  // Track clipboard copies in the background for the history feature.
  context.subscriptions.push(startClipboardWatch(history));

  // Show the walkthrough once, on the very first activation.
  void maybeShowWelcome(context);
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
    t('about.message', version()),
    t('about.learnMore'),
  ).then((choice) => {
    if (choice === t('about.learnMore')) {
      void vscode.env.openExternal(vscode.Uri.parse('https://github.com/anydiff/anydiff'));
    }
  });
}

/** Version of the running extension, read from its manifest. */
function version(): string {
  const pkg = vscode.extensions.getExtension('anydiff.anydiff')?.packageJSON as
    | { version?: string }
    | undefined;
  return pkg?.version ?? '0.0.0';
}
