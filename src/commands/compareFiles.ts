import * as path from 'path';
import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { pickFile } from '../utils/filePicker';
import { languageIdOf } from '../utils/language';

/** `anydiff.compareFiles` — pick two files and diff them. */
export async function compareFilesCommand(): Promise<void> {
  const first = await pickFile({ title: t('picker.title.firstFile') });
  if (!first) {
    return;
  }
  const second = await pickFile({
    exclude: [first.uri],
    title: t('picker.title.secondFile'),
  });
  if (!second) {
    return;
  }

  await DiffViewManager.open(fileSource(first.uri), fileSource(second.uri), { ignore: getIgnoreOptions() });
}

/** `anydiff.compareFileWithActive` — diff a picked file with the active editor. */
export async function compareFileWithActiveCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const activeUri = editor?.document.uri;

  const picked = await pickFile({
    exclude: activeUri ? [activeUri] : [],
    title: t('picker.title.fileToCompare'),
  });
  if (!picked) {
    return;
  }

  const right = activeUri
    ? fileSource(activeUri, `${relativePath(activeUri)} (${t('source.activeSuffix')})`)
    : fileSource(picked.uri);

  await DiffViewManager.open(fileSource(picked.uri, picked.label), right, {
    ignore: getIgnoreOptions(),
  });
}

export function fileSource(uri: vscode.Uri, title?: string): DiffSource {
  const label = title ?? (relativePath(uri) || t('source.unknownFile'));
  return {
    title: label,
    uri,
    languageId: languageIdOf(uri),
    filePath: uri.fsPath,
  };
}

export function relativePath(uri: vscode.Uri): string {
  const relative = vscode.workspace.asRelativePath(uri, false);
  return relative || path.basename(uri.fsPath);
}
