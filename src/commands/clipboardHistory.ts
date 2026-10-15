import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { pickFile } from '../utils/filePicker';
import { fileSource, relativePath } from './compareFiles';

interface ClipboardEntry {
  text: string;
  at: number;
}

const LIMIT_DEFAULT = 20;

/**
 * Keeps a rolling history of clipboard copies so users can diff against
 * something they copied a while ago.
 */
export class ClipboardHistory {
  private entries: ClipboardEntry[] = [];

  constructor(private readonly state: vscode.Memento) {
    this.entries = state.get<ClipboardEntry[]>('anydiff.clipboardHistory', []);
  }

  /** Records a copy; ignores duplicates of the most recent entry. */
  async push(text: string): Promise<void> {
    const trimmed = text;
    if (!trimmed || this.entries[0]?.text === trimmed) {
      return;
    }
    this.entries = [{ text: trimmed, at: Date.now() }, ...this.entries].slice(0, this.limit());
    await this.state.update('anydiff.clipboardHistory', this.entries);
  }

  /** Returns recorded entries, newest first. */
  list(): ClipboardEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
    void this.state.update('anydiff.clipboardHistory', []);
  }

  private limit(): number {
    return vscode.workspace
      .getConfiguration('anydiff')
      .get<number>('clipboardHistoryLimit', LIMIT_DEFAULT);
  }
}

/** `anydiff.showClipboardHistory` — pick a past clipboard copy to diff. */
export async function showClipboardHistoryCommand(
  history: ClipboardHistory,
  virtualDocs: VirtualDocProvider,
): Promise<void> {
  const entries = history.list();
  if (entries.length === 0) {
    vscode.window.showInformationMessage(t('clipboard.empty'));
    return;
  }

  const items = entries.map((entry, index) => ({
    label: `#${index + 1}  ${preview(entry.text)}`,
    description: new Date(entry.at).toLocaleString(),
    entry,
  }));

  const chosen = await vscode.window.showQuickPick(items, {
    title: t('clipboard.title'),
    placeHolder: t('clipboard.targetTitle'),
    matchOnDescription: true,
  });
  if (!chosen) {
    return;
  }

  const selection = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document.getText(
        vscode.window.activeTextEditor.selection.isEmpty
          ? undefined
          : vscode.window.activeTextEditor.selection,
      )
    : undefined;

  const target = await vscode.window.showQuickPick(
    [
      { label: t('clipboard.targetActiveEditor'), value: 'editor' as const },
      { label: t('clipboard.targetChooseFile'), value: 'file' as const },
    ],
    { title: t('clipboard.targetTitle') },
  );
  if (!target) {
    return;
  }

  const left: DiffSource = virtualDocs.createSource(chosen.entry.text, t('clipboard.entryTitle'), 'plaintext');
  let right: DiffSource;

  if (target.value === 'editor' && selection !== undefined && vscode.window.activeTextEditor) {
    const uri = vscode.window.activeTextEditor.document.uri;
    right = fileSource(uri, `${relativePath(uri)} (${t('source.activeSuffix')})`);
  } else if (target.value === 'file') {
    const picked = await pickFile({ title: t('picker.title.fileToCompare') });
    if (!picked) {
      return;
    }
    right = fileSource(picked.uri, picked.label);
  } else {
    vscode.window.showWarningMessage(t('error.noActiveEditorToCompare'));
    return;
  }

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

function preview(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > 80 ? `${single.slice(0, 80)}…` : single;
}
