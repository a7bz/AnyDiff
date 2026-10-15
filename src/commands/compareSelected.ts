import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { promptForMultilineText } from '../views/textInputPanel';
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
export async function compareSelectedWithInputCommand(
  virtualDocs: VirtualDocProvider,
  extensionUri: vscode.Uri,
): Promise<void> {
  const selection = requireSelection();
  if (!selection) {
    return;
  }

  const input = await promptForMultilineText(extensionUri, {
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

/** One remembered selection, used by the selection-vs-selection command. */
interface StashedSelection extends SelectionContext {
  at: number;
}

const MAX_STASH = 10;

/**
 * Session-scoped stash of captured selections, backing the
 * "compare selection with another selection" workflow: select snippet A, run
 * the command to stash it, select snippet B, run the command again to diff
 * the two.
 */
export class SelectionStash {
  private entries: StashedSelection[] = [];

  push(selection: SelectionContext): void {
    const duplicate = this.entries.some(
      (entry) => entry.text === selection.text && entry.origin === selection.origin,
    );
    if (duplicate) {
      return;
    }
    this.entries = [{ ...selection, at: Date.now() }, ...this.entries].slice(0, MAX_STASH);
  }

  list(): StashedSelection[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }
}

/** `anydiff.compareSelectionWithSelection` */
export async function compareSelectionWithSelectionCommand(
  virtualDocs: VirtualDocProvider,
  stash: SelectionStash,
): Promise<void> {
  const current = requireSelection();
  if (!current) {
    return;
  }

  const previous = stash.list();
  stash.push(current);

  if (previous.length === 0) {
    vscode.window.showInformationMessage(t('selection.stashed'));
    return;
  }

  const chosen = await vscode.window.showQuickPick(
    previous.map((entry, index) => ({
      label: `#${index + 1}  ${entry.origin}`,
      description: preview(entry.text),
      detail: new Date(entry.at).toLocaleTimeString(),
      entry,
    })),
    {
      title: t('selection.pickTitle'),
      placeHolder: t('selection.pickPlaceholder'),
      matchOnDescription: true,
    },
  );
  if (!chosen) {
    return;
  }

  const left = virtualDocs.createSource(chosen.entry.text, chosen.entry.origin, chosen.entry.languageId);
  const right = selectionSource(current, virtualDocs);

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

function preview(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > 70 ? `${single.slice(0, 70)}…` : single;
}
