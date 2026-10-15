import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { DiffStats } from '../types';

/** Surfaces +/- line counts after a comparison is opened. */
export function showDiffStats(left: DiffSource, right: DiffSource, stats: DiffStats): void {
  const message = t(
    'stats.statusBar',
    left.title,
    right.title,
    stats.added,
    stats.removed,
    stats.unchanged,
  );
  vscode.window.setStatusBarMessage(message, 8000);
}
