import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { pickFile } from '../utils/filePicker';
import { languageIdOf } from '../utils/language';
import { fileSource, relativePath } from './compareFiles';

export interface SelectionContext {
  text: string;
  languageId: string;
  /** Label describing where the selection came from. */
  origin: string;
}

/** Captures the current selection, falling back to the whole document. */
export function captureSelection(): SelectionContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const document = editor.document;
  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;

  const text = hasSelection ? document.getText(selection) : document.getText();
  const location = relativePath(document.uri);

  const origin = hasSelection
    ? `${location}:${selection.start.line + 1}`
    : `${location} (${t('source.wholeFileSuffix')})`;

  return { text, languageId: languageIdOf(document.uri), origin };
}

function selectionSource(selection: SelectionContext, virtualDocs: VirtualDocProvider): DiffSource {
  // Selections are diffed as a virtual document so the real file keeps its own
  // editor; the origin label keeps the context visible in the tab title.
  return virtualDocs.createSource(selection.text, selection.origin, selection.languageId);
}

/** `anydiff.compareSelectedWithClipboard` */
export async function compareSelectedWithClipboardCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const selection = requireSelection();
  if (!selection) {
    return;
  }
  const clipboard = await vscode.env.clipboard.readText();
  if (!clipboard) {
    vscode.window.showWarningMessage(t('error.clipboardEmpty'));
    return;
  }

  const left = virtualDocs.createSource(clipboard, t('source.clipboard'), selection.languageId);
  const right = selectionSource(selection, virtualDocs);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

/** `anydiff.compareSelectedWithFile` */
export async function compareSelectedWithFileCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const selection = requireSelection();
  if (!selection) {
    return;
  }
  const picked = await pickFile({ title: t('picker.title.fileToCompare') });
  if (!picked) {
    return;
  }

  const left = selectionSource(selection, virtualDocs);
  const right = fileSource(picked.uri, picked.label);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

/** `anydiff.compareSelectedWithInput` */
export async function compareSelectedWithInputCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const selection = requireSelection();
  if (!selection) {
    return;
  }

  const input = await promptForText({
    title: t('input.title'),
    placeholder: t('input.placeholder'),
  });
  if (input === undefined) {
    return;
  }

  const left = virtualDocs.createSource(input || t('source.empty'), t('source.manualInput'), selection.languageId);
  const right = selectionSource(selection, virtualDocs);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

/** `anydiff.compareClipboardWithFile` */
export async function compareClipboardWithFileCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const clipboard = await vscode.env.clipboard.readText();
  if (!clipboard) {
    vscode.window.showWarningMessage(t('error.clipboardEmpty'));
    return;
  }
  const picked = await pickFile({ title: t('picker.title.fileToCompare') });
  if (!picked) {
    return;
  }

  const left = virtualDocs.createSource(clipboard, t('source.clipboard'), languageIdOf(picked.uri));
  const right = fileSource(picked.uri, picked.label);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

/** Reads the selection, warning the user when no editor is active. */
function requireSelection(): SelectionContext | undefined {
  const selection = captureSelection();
  if (!selection) {
    vscode.window.showWarningMessage(t('error.noActiveEditor'));
    return undefined;
  }
  return selection;
}

/**
 * Asks the user for multi-line text.
 *
 * VSCode has no public multi-line input box, so we use a QuickInput with
 * multi-line support when available (1.87+) and fall back to a Webview panel.
 */
export async function promptForText(options: { title: string; placeholder: string }): Promise<string | undefined> {
  const quickInput = vscode.window.createQuickPick<vscode.QuickPickItem>();
  const anyInput = quickInput as unknown as {
    multiLine?: boolean;
  };
  if (typeof anyInput.multiLine === 'boolean') {
    anyInput.multiLine = true;
  }
  quickInput.title = options.title;
  quickInput.placeholder = options.placeholder;
  quickInput.ignoreFocusOut = true;

  return new Promise<string | undefined>((resolve) => {
    let settled = false;
    quickInput.onDidAccept(() => {
      settled = true;
      resolve(quickInput.value);
      quickInput.hide();
    });
    quickInput.onDidHide(() => {
      if (!settled) {
        resolve(undefined);
      }
      quickInput.dispose();
    });
    quickInput.show();
  });
}
