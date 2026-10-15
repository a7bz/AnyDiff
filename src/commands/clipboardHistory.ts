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
const STORAGE_KEY = 'anydiff.clipboardHistory';

/**
 * Keeps a rolling history of clipboard copies so users can diff against
 * something they copied a while ago.
 */
export class ClipboardHistory {
  private entries: ClipboardEntry[] = [];

  constructor(private readonly state: vscode.Memento) {
    this.entries = state.get<ClipboardEntry[]>(STORAGE_KEY, []);
  }

  /** Records a copy; ignores duplicates of the most recent entry. */
  async push(text: string): Promise<void> {
    const trimmed = text;
    if (!trimmed || this.entries[0]?.text === trimmed) {
      return;
    }
    // Re-copying an older entry should move it to the top, not duplicate it.
    const rest = this.entries.filter((entry) => entry.text !== trimmed);
    this.entries = [{ text: trimmed, at: Date.now() }, ...rest].slice(0, this.limit());
    await this.state.update(STORAGE_KEY, this.entries);
  }

  /** Returns recorded entries, newest first. */
  list(): ClipboardEntry[] {
    return this.entries;
  }

  async clear(): Promise<void> {
    this.entries = [];
    await this.state.update(STORAGE_KEY, []);
  }

  private limit(): number {
    return vscode.workspace
      .getConfiguration('anydiff')
      .get<number>('clipboardHistoryLimit', LIMIT_DEFAULT);
  }
}

type HistoryItem = vscode.QuickPickItem & { entry?: ClipboardEntry; clear?: true };

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

  const items: HistoryItem[] = [
    ...entries.map((entry, index) => ({
      label: `#${index + 1}  ${preview(entry.text)}`,
      description: new Date(entry.at).toLocaleString(),
      detail: t('clipboard.lineCount', countLines(entry.text)),
      entry,
    })),
    {
      label: `$(trash) ${t('clipboard.clear')}`,
      alwaysShow: true,
      clear: true,
    },
  ];

  const chosen = await vscode.window.showQuickPick(items, {
    title: t('clipboard.title'),
    placeHolder: t('clipboard.targetTitle'),
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!chosen) {
    return;
  }
  if (chosen.clear) {
    await history.clear();
    vscode.window.showInformationMessage(t('clipboard.cleared'));
    return;
  }
  if (!chosen.entry) {
    return;
  }

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

  if (target.value === 'editor') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(t('error.noActiveEditorToCompare'));
      return;
    }
    const uri = editor.document.uri;
    right = fileSource(uri, `${relativePath(uri)} (${t('source.activeSuffix')})`);
  } else {
    const picked = await pickFile({ title: t('picker.title.fileToCompare') });
    if (!picked) {
      return;
    }
    right = fileSource(picked.uri, picked.label);
  }

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

function preview(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > 80 ? `${single.slice(0, 80)}…` : single;
}

function countLines(text: string): number {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return lines.length > 1 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}
