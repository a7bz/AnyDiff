import * as path from 'path';
import * as vscode from 'vscode';
import { t } from '../i18n';
import type { VirtualDocProvider } from '../providers/virtualDocProvider';
import { DiffViewManager } from '../views/diffViewManager';
import { getIgnoreOptions } from '../utils/config';
import {
  gitShowAtRevision,
  hasUncommittedChanges,
  isGitRepository,
  listFileRevisions,
  type FileRevision,
} from '../utils/git';
import { languageIdOf } from '../utils/language';
import { fileSource, relativePath } from './compareFiles';

type RevisionChoice = vscode.QuickPickItem & { revision: string };

/**
 * `anydiff.compareWithGitHead` — diff the active file with a Git revision
 * (HEAD, any commit touching the file, the index, or the on-disk content).
 */
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

  const [revisions, dirty] = await Promise.all([
    listFileRevisions(filePath),
    hasUncommittedChanges(filePath),
  ]);

  const choices: RevisionChoice[] = [
    {
      label: `$(git-commit) ${t('git.headLabel')}`,
      description: t('git.headDescription'),
      revision: 'HEAD',
    },
  ];
  if (dirty) {
    choices.push({
      label: `$(diff) ${t('git.indexLabel')}`,
      description: t('git.indexDescription'),
      revision: ':0',
    });
  }
  choices.push(
    ...revisions.map((revision) => ({
      label: `$(history) ${revision.hash}`,
      description: formatRevision(revision),
      detail: revision.subject,
      revision: revision.hash,
    })),
  );

  const revision = await vscode.window.showQuickPick(choices, {
    title: t('git.pickTitle', relativePath(editor.document.uri)),
    placeHolder: t('git.pickPlaceholder'),
    matchOnDetail: true,
    matchOnDescription: true,
  });
  if (!revision) {
    return;
  }

  let oldText: string;
  try {
    oldText = await gitShowAtRevision(filePath, revision.revision);
  } catch {
    vscode.window.showWarningMessage(
      t('error.readRevisionFailed', path.basename(filePath), revision.revision),
    );
    return;
  }

  const languageId = languageIdOf(editor.document.uri);
  const left = virtualDocs.createSource(
    oldText,
    `${revision.revision}:${path.basename(filePath)}`,
    languageId,
  );
  const right = fileSource(editor.document.uri, `${path.basename(filePath)} (${t('git.workingSuffix')})`);

  await DiffViewManager.open(left, right, { ignore: getIgnoreOptions() });
}

/**
 * `anydiff.compareGitRevisions` — diff two revisions of the active file
 * (e.g. `HEAD` against a commit, or the index against the worktree).
 */
export async function compareGitRevisionsCommand(virtualDocs: VirtualDocProvider): Promise<void> {
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
  const choices: RevisionChoice[] = [
    { label: `$(git-commit) ${t('git.headLabel')}`, description: t('git.headDescription'), revision: 'HEAD' },
    { label: `$(diff) ${t('git.indexLabel')}`, description: t('git.indexDescription'), revision: ':0' },
    { label: `$(file) ${t('git.worktreeLabel')}`, description: t('git.worktreeDescription'), revision: 'WORKTREE' },
    ...revisions.map((revision) => ({
      label: `$(history) ${revision.hash}`,
      description: formatRevision(revision),
      detail: revision.subject,
      revision: revision.hash,
    })),
  ];

  const left = await vscode.window.showQuickPick(choices, {
    title: t('git.pickLeftTitle', relativePath(editor.document.uri)),
    placeHolder: t('git.pickPlaceholder'),
    matchOnDetail: true,
  });
  if (!left) {
    return;
  }
  const right = await vscode.window.showQuickPick(
    choices.filter((choice) => choice.revision !== left.revision),
    {
      title: t('git.pickRightTitle', relativePath(editor.document.uri)),
      placeHolder: t('git.pickPlaceholder'),
      matchOnDetail: true,
    },
  );
  if (!right) {
    return;
  }

  const languageId = languageIdOf(editor.document.uri);
  const base = path.basename(filePath);
  let leftText: string;
  let rightText: string;
  try {
    [leftText, rightText] = await Promise.all([
      gitShowAtRevision(filePath, left.revision),
      gitShowAtRevision(filePath, right.revision),
    ]);
  } catch {
    vscode.window.showWarningMessage(
      t('error.readRevisionFailed', base, `${left.revision}/${right.revision}`),
    );
    return;
  }

  await DiffViewManager.open(
    virtualDocs.createSource(leftText, `${left.revision}:${base}`, languageId),
    virtualDocs.createSource(rightText, `${right.revision}:${base}`, languageId),
    { ignore: getIgnoreOptions() },
  );
}

function formatRevision(revision: FileRevision): string {
  if (!revision.date) {
    return revision.subject;
  }
  const date = new Date(revision.date);
  const stamp = Number.isNaN(date.getTime()) ? revision.date : date.toLocaleDateString();
  return `${stamp} · ${revision.subject}`;
}
