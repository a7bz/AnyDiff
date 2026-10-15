import * as vscode from 'vscode';
import { t } from '../i18n';
import type { DiffSource } from '../providers/diffSource';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { readFileText } from '../utils/fs';
import { flattenJson } from '../utils/jsonDiff';
import { pickFile } from '../utils/filePicker';
import { relativePath } from './compareFiles';

/**
 * `anydiff.compareJsonSemantic` — compare two JSON files by structure rather
 * than by text.
 *
 * Both sides are flattened to a sorted list of `path = value` leaves, so
 * reordering keys or re-indenting the file produces no diff, while added,
 * removed or changed values are reported exactly.
 */
export async function compareJsonSemanticCommand(virtualDocs: VirtualDocProvider): Promise<void> {
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

  const [leftRaw, rightRaw] = await Promise.all([
    readFileText(first.uri),
    readFileText(second.uri),
  ]);

  const left = flattenJson(leftRaw);
  const right = flattenJson(rightRaw);
  if (!left.ok) {
    vscode.window.showWarningMessage(t('json.invalid', first.label, left.error));
    return;
  }
  if (!right.ok) {
    vscode.window.showWarningMessage(t('json.invalid', second.label, right.error));
    return;
  }

  const leftSource: DiffSource = virtualDocs.createSource(
    left.lines.join('\n'),
    `${first.label} (${t('json.flatSuffix')})`,
    'plaintext',
  );
  const rightSource: DiffSource = virtualDocs.createSource(
    right.lines.join('\n'),
    `${second.label} (${t('json.flatSuffix')})`,
    'plaintext',
  );

  await DiffViewManager.open(leftSource, rightSource, { ignore: getIgnoreOptions() });
}

/**
 * `anydiff.compareJsonWithActive` — structurally compare the active JSON
 * document with another JSON file.
 */
export async function compareJsonWithActiveCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(t('error.noActiveEditor'));
    return;
  }

  const picked = await pickFile({
    exclude: [editor.document.uri],
    title: t('picker.title.fileToCompare'),
  });
  if (!picked) {
    return;
  }

  const [leftRaw, rightRaw] = await Promise.all([
    Promise.resolve(editor.document.getText()),
    readFileText(picked.uri),
  ]);

  const left = flattenJson(leftRaw);
  const right = flattenJson(rightRaw);
  if (!left.ok) {
    vscode.window.showWarningMessage(t('json.invalid', relativePath(editor.document.uri), left.error));
    return;
  }
  if (!right.ok) {
    vscode.window.showWarningMessage(t('json.invalid', picked.label, right.error));
    return;
  }

  const activeLabel = `${relativePath(editor.document.uri)} (${t('json.flatSuffix')})`;
  await DiffViewManager.open(
    virtualDocs.createSource(left.lines.join('\n'), activeLabel, 'plaintext'),
    virtualDocs.createSource(
      right.lines.join('\n'),
      `${picked.label} (${t('json.flatSuffix')})`,
      'plaintext',
    ),
    { ignore: getIgnoreOptions() },
  );
}
