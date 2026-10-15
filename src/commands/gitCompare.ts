import * as path from 'path';
import * as vscode from 'vscode';
import { t } from '../i18n';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import { gitShowAtRevision, isGitRepository, listFileRevisions } from '../utils/git';
import { languageIdOf } from '../utils/language';
import { fileSource } from './compareFiles';

/** `anydiff.compareWithGitHead` — diff the active file with a Git revision. */
export async function compareWithGitHeadCommand(virtualDocs: VirtualDocProvider): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(t('error.noActiveEditor'));
    return;
  }
  const filePath = editor.document.uri.fsPath;

  if (!(await isGitRepository(path.dirname(filePath)))) {
    vscode.window.showWarningMessage(t('error.notGitRepository'));
    return;
  }

  const revisions = await listFileRevisions(filePath);
  const choices = [
    { label: t('git.headLabel'), description: t('git.headDescription'), value: 'HEAD' },
    ...revisions.map((rev) => ({ label: rev, description: t('git.commitDescription'), value: rev })),
  ];

  const revision = await vscode.window.showQuickPick(choices, {
    title: t('git.pickTitle', path.basename(filePath)),
    placeHolder: t('git.pickPlaceholder'),
  });
  if (!revision) {
    return;
  }

  let oldText: string;
  try {
    oldText = await gitShowAtRevision(filePath, revision.value);
  } catch {
    vscode.window.showWarningMessage(
      t('error.readRevisionFailed', path.basename(filePath), revision.value),
    );
    return;
  }

  const left = virtualDocs.createSource(
    oldText,
    `${revision.value}:${path.basename(filePath)}`,
    languageIdOf(editor.document.uri),
  );
  const right = fileSource(editor.document.uri, `${path.basename(filePath)} (${t('git.workingSuffix')})`);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}
