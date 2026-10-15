import * as vscode from 'vscode';
import { t } from '../i18n';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { fileSource } from './compareFiles';

/**
 * `anydiff.compareMultipleFiles` — pairwise comparison of the files selected
 * in the explorer.
 *
 * With exactly two files this behaves like `compareFiles`. With more, the
 * first file is diffed against each of the others in turn.
 */
export async function compareMultipleFilesCommand(uris: vscode.Uri[]): Promise<void> {
  const files = (uris ?? []).filter((uri) => uri.scheme === 'file');
  if (files.length < 2) {
    vscode.window.showWarningMessage(t('error.selectAtLeastTwoFiles'));
    return;
  }

  const [first, ...rest] = files;
  const ignore = getIgnoreOptions();

  for (const other of rest) {
    await DiffViewManager.open(fileSource(first), fileSource(other), { ignore });
  }
}
