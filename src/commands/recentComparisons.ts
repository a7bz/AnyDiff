import * as vscode from 'vscode';
import { t } from '../i18n';

export interface RecentEntry {
  left: string;
  right: string;
  at: number;
}

const LIMIT = 20;

/**
 * Remembers recently compared pairs so users can re-open a comparison from
 * the command palette without re-picking files.
 */
export class RecentComparisons {
  constructor(private readonly state: vscode.Memento) {}

  async push(left: vscode.Uri, right: vscode.Uri): Promise<void> {
    const entry: RecentEntry = {
      left: left.fsPath,
      right: right.fsPath,
      at: Date.now(),
    };
    const existing = this.list().filter(
      (item) => !(item.left === entry.left && item.right === entry.right),
    );
    const next = [entry, ...existing].slice(0, LIMIT);
    await this.state.update('anydiff.recentComparisons', next);
  }

  list(): RecentEntry[] {
    return this.state.get<RecentEntry[]>('anydiff.recentComparisons', []);
  }
}

/** `anydiff.showRecent` — re-open a previously run comparison. */
export async function showRecentCommand(recent: RecentComparisons): Promise<void> {
  const entries = recent.list();
  if (entries.length === 0) {
    vscode.window.showInformationMessage(t('recent.empty'));
    return;
  }

  const items = entries.map((entry) => ({
    label: `${vscode.workspace.asRelativePath(entry.left, false)} ↔ ${vscode.workspace.asRelativePath(entry.right, false)}`,
    description: new Date(entry.at).toLocaleString(),
    entry,
  }));

  const chosen = await vscode.window.showQuickPick(items, {
    title: t('recent.title'),
    placeHolder: t('recent.placeholder'),
  });
  if (!chosen) {
    return;
  }

  await vscode.commands.executeCommand(
    'vscode.diff',
    vscode.Uri.file(chosen.entry.left),
    vscode.Uri.file(chosen.entry.right),
    `${chosen.entry.left} ↔ ${chosen.entry.right}`,
    { preview: false },
  );
}
