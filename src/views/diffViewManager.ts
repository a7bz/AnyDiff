import * as vscode from 'vscode';
import type { DiffSource } from '../providers/diffSource';
import type { DiffOpenOptions, DiffStats } from '../types';
import { confirmLargeFiles } from '../utils/config';
import { computeDiffStats } from '../utils/diffStats';
import { showDiffStats } from '../utils/statsReporter';

/** Records opened comparisons so they can be replayed from the palette. */
export interface DiffRecorder {
  record(left: DiffSource, right: DiffSource): Promise<void> | void;
}

let recorder: DiffRecorder | undefined;

/** Installs the recorder used by every comparison opened through the manager. */
export function setDiffRecorder(next: DiffRecorder | undefined): void {
  recorder = next;
}

/**
 * Opens the native diff editor for a pair of content sources and reports
 * line statistics. All commands funnel through here so that behaviour
 * (titles, read-only marking, stats, history) stays consistent.
 */
export class DiffViewManager {
  static async open(left: DiffSource, right: DiffSource, options: DiffOpenOptions = {}): Promise<void> {
    if (options.guardLargeFiles !== false) {
      const ok = await confirmLargeFiles(fileUris(left, right));
      if (!ok) {
        return;
      }
    }

    const statsEnabled = options.showStats ?? vscode.workspace
      .getConfiguration('anydiff')
      .get<boolean>('showStatsNotification', true);

    await vscode.commands.executeCommand(
      'vscode.diff',
      left.uri,
      right.uri,
      `${left.title} ↔ ${right.title}`,
      { preview: false, viewColumn: options.viewColumn ?? vscode.ViewColumn.Active },
    );

    // History is best-effort: a failure must never break the comparison.
    try {
      await recorder?.record(left, right);
    } catch {
      // Ignore: the diff is already on screen.
    }

    if (statsEnabled) {
      await DiffViewManager.reportStats(left, right, options.ignore);
    }
  }

  /** Computes and surfaces +/- line counts for the two sources. */
  static async reportStats(
    left: DiffSource,
    right: DiffSource,
    ignore?: DiffOpenOptions['ignore'],
  ): Promise<DiffStats | undefined> {
    try {
      const [leftText, rightText] = await Promise.all([readText(left), readText(right)]);
      const stats = computeDiffStats(leftText, rightText, ignore);
      showDiffStats(left, right, stats);
      return stats;
    } catch {
      return undefined;
    }
  }
}

async function readText(source: DiffSource): Promise<string> {
  if (typeof source.text === 'function') {
    return source.text();
  }
  const bytes = await vscode.workspace.fs.readFile(source.uri);
  return Buffer.from(bytes).toString('utf8');
}

/** Only file-backed sources are size-checked; virtual documents are in memory. */
function fileUris(...sources: DiffSource[]): vscode.Uri[] {
  return sources.filter((source) => source.uri.scheme === 'file').map((source) => source.uri);
}
