import * as vscode from 'vscode';
import { t } from '../i18n';
import { createUnifiedDiff, splitLines } from '../utils/patch';

/**
 * `anydiff.exportPatch` — exports the text of the two sides of the currently
 * focused diff editor as a unified diff file.
 */
export async function exportPatchCommand(): Promise<void> {
  const sides = collectDiffSides();
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
 * Reads the two documents of the currently visible diff editor, when VSCode
 * exposes them through the tab groups.
 */
export function collectDiffSides(): { leftText: string; rightText: string; leftTitle: string; rightTitle: string } | undefined {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const inputs = collectInputs(tab);
      if (inputs) {
        return inputs;
      }
    }
  }
  return undefined;
}

function collectInputs(tab: vscode.Tab): { leftText: string; rightText: string; leftTitle: string; rightTitle: string } | undefined {
  const input = tab.input as unknown as {
    textDiffs?: Array<{ document: vscode.TextDocument }>;
    original?: vscode.TextDocument;
    modified?: vscode.TextDocument;
  };
  const modified = input?.modified;
  const original = input?.original ?? input?.textDiffs?.[0]?.document;
  if (!original || !modified) {
    return undefined;
  }
  return {
    leftText: original.getText(),
    rightText: modified.getText(),
    leftTitle: original.uri.fsPath,
    rightTitle: modified.uri.fsPath,
  };
}

/** Re-exported for tests. */
export { splitLines };
