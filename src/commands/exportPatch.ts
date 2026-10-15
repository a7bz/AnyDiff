import * as vscode from 'vscode';
import { t } from '../i18n';
import { createUnifiedDiff } from '../utils/patch';

export interface DiffSides {
  leftText: string;
  rightText: string;
  leftTitle: string;
  rightTitle: string;
}

/**
 * `anydiff.exportPatch` — exports the two sides of the active diff editor as
 * a unified diff file.
 */
export async function exportPatchCommand(): Promise<void> {
  const sides = await collectDiffSides();
  if (!sides) {
    vscode.window.showWarningMessage(t('patch.noDiffOpen'));
    return;
  }

  const patch = createUnifiedDiff(sides.leftText, sides.rightText, {
    oldName: sides.leftTitle,
    newName: sides.rightTitle,
  });

  if (!patch) {
    vscode.window.showInformationMessage(t('patch.identical'));
    return;
  }

  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${t('common.appName')}-comparison.patch`),
    filters: { Patch: ['patch', 'diff'], Text: ['txt'] },
    saveLabel: t('patch.saveLabel'),
    title: t('patch.saveTitle'),
  });
  if (!target) {
    return;
  }
  await vscode.workspace.fs.writeFile(target, Buffer.from(patch, 'utf8'));
  vscode.window.showInformationMessage(t('patch.exported', target.fsPath));
}

/**
 * Reads the two documents of the active diff editor.
 *
 * The active tab is tried first so the command exports what the user is
 * looking at; when the active tab is not a diff, the first diff tab in any
 * group is used as a fallback.
 */
export async function collectDiffSides(): Promise<DiffSides | undefined> {
  const candidates = [
    vscode.window.tabGroups.activeTabGroup.activeTab,
    ...vscode.window.tabGroups.all.flatMap((group) => group.tabs),
  ];
  for (const tab of candidates) {
    if (!tab) {
      continue;
    }
    const sides = await readTab(tab);
    if (sides) {
      return sides;
    }
  }
  return undefined;
}

async function readTab(tab: vscode.Tab): Promise<DiffSides | undefined> {
  const input = tab.input as {
    original?: vscode.Uri;
    modified?: vscode.Uri;
    textDiffs?: Array<{ original: vscode.Uri; modified: vscode.Uri }>;
  };

  const pair = input.original && input.modified
    ? { original: input.original, modified: input.modified }
    : input.textDiffs?.[0];
  if (!pair) {
    return undefined;
  }

  try {
    const [leftText, rightText] = await Promise.all([
      readUri(pair.original),
      readUri(pair.modified),
    ]);
    return {
      leftText,
      rightText,
      leftTitle: titleOf(pair.original),
      rightTitle: titleOf(pair.modified),
    };
  } catch {
    return undefined;
  }
}

async function readUri(uri: vscode.Uri): Promise<string> {
  const open = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
  if (open) {
    return open.getText();
  }
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString('utf8');
}

function titleOf(uri: vscode.Uri): string {
  if (uri.scheme === 'file') {
    return vscode.workspace.asRelativePath(uri, false) || uri.fsPath;
  }
  return uri.path.split('/').filter(Boolean).slice(-2).join('/') || uri.toString();
}
