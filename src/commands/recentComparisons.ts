import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager, type DiffRecorder } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';

/** One side of a remembered comparison. */
export interface RecentSide {
  title: string;
  languageId?: string;
  /** Absolute path when the side is backed by a file on disk. */
  filePath?: string;
  /** Inline content when the side is virtual and small enough to store. */
  text?: string;
}

export interface RecentEntry {
  left: RecentSide;
  right: RecentSide;
  at: number;
}

const LIMIT = 20;
const STORAGE_KEY = 'anydiff.recentComparisons';
/** Virtual sides larger than this are not stored (they would bloat state). */
const MAX_INLINE_CHARS = 200_000;

/**
 * Remembers recently compared pairs so users can re-open a comparison from
 * the command palette without re-picking files or re-copying content.
 *
 * Virtual sides (clipboard, selection, manual input, Git revisions) are
 * remembered by storing their text inline, so the whole comparison can be
 * recreated — not just file-to-file pairs.
 */
export class RecentComparisons implements DiffRecorder {
  constructor(private readonly state: vscode.Memento) {}

  async record(left: DiffSource, right: DiffSource): Promise<void> {
    const [leftSide, rightSide] = await Promise.all([toSide(left), toSide(right)]);
    if (!leftSide || !rightSide) {
      return; // Not restorable: skip instead of remembering a broken entry.
    }

    const entry: RecentEntry = { left: leftSide, right: rightSide, at: Date.now() };
    const existing = this.list().filter(
      (item) => !(sameSide(item.left, entry.left) && sameSide(item.right, entry.right)),
    );
    await this.state.update(STORAGE_KEY, [entry, ...existing].slice(0, LIMIT));
  }

  list(): RecentEntry[] {
    return this.state.get<RecentEntry[]>(STORAGE_KEY, []);
  }

  async clear(): Promise<void> {
    await this.state.update(STORAGE_KEY, []);
  }
}

/** `anydiff.showRecent` — re-open a previously run comparison. */
export async function showRecentCommand(
  recent: RecentComparisons,
  virtualDocs: VirtualDocProvider,
): Promise<void> {
  const entries = recent.list();
  if (entries.length === 0) {
    vscode.window.showInformationMessage(t('recent.empty'));
    return;
  }

  const items = entries.map((entry) => ({
    label: `${entry.left.title} ↔ ${entry.right.title}`,
    description: new Date(entry.at).toLocaleString(),
    detail: describe(entry),
    entry,
  }));

  const chosen = await vscode.window.showQuickPick(items, {
    title: t('recent.title'),
    placeHolder: t('recent.placeholder'),
    matchOnDetail: true,
  });
  if (!chosen) {
    return;
  }

  const left = toSource(chosen.entry.left, virtualDocs);
  const right = toSource(chosen.entry.right, virtualDocs);
  if (!left || !right) {
    vscode.window.showWarningMessage(t('recent.unavailable'));
    return;
  }

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

async function toSide(source: DiffSource): Promise<RecentSide | undefined> {
  if (source.filePath) {
    return {
      title: source.title,
      languageId: source.languageId,
      filePath: source.filePath,
    };
  }
  if (typeof source.text === 'function') {
    const text = await source.text();
    if (text.length > MAX_INLINE_CHARS) {
      return undefined;
    }
    return { title: source.title, languageId: source.languageId, text };
  }
  return undefined;
}

function toSource(side: RecentSide, virtualDocs: VirtualDocProvider): DiffSource | undefined {
  if (side.filePath) {
    return {
      title: side.title,
      uri: vscode.Uri.file(side.filePath),
      languageId: side.languageId,
      filePath: side.filePath,
    };
  }
  if (typeof side.text === 'string') {
    return virtualDocs.createSource(side.text, side.title, side.languageId);
  }
  return undefined;
}

function sameSide(a: RecentSide, b: RecentSide): boolean {
  return a.title === b.title && a.filePath === b.filePath && a.text === b.text;
}

function describe(entry: RecentEntry): string {
  const side = (value: RecentSide): string =>
    value.filePath ? vscode.workspace.asRelativePath(value.filePath, false) : value.title;
  return `${side(entry.left)} ↔ ${side(entry.right)}`;
}
