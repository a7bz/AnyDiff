import * as vscode from 'vscode';
import { t } from '../i18n';
import { MultiDiffPanel, type MultiDiffColumn } from '../views/multiDiffPanel';
import { captureSelection, promptForText } from './compareSelected';
import { pickFile } from '../utils/filePicker';

/** `anydiff.openMultiDiffPanel` — assemble 2–3 columns and open the panel. */
export async function openMultiDiffPanelCommand(extensionUri: vscode.Uri): Promise<void> {
  const columns: MultiDiffColumn[] = [];

  // Column 1: the selection (or the whole active file), when there is one.
  const selection = captureSelection();
  if (selection) {
    columns.push({ title: selection.origin, text: selection.text });
  }

  while (columns.length < 3) {
    const source = await vscode.window.showQuickPick(
      [
        { label: t('multi.source.selection'), value: 'selection' as const, picked: false },
        { label: t('multi.source.file'), value: 'file' as const },
        { label: t('multi.source.clipboard'), value: 'clipboard' as const },
        { label: t('multi.source.input'), value: 'input' as const },
        { label: `$(check) ${t('multi.source.done')}`, value: 'done' as const, picked: true },
      ],
      {
        title: t('multi.pickTitle', String(columns.length + 1)),
        placeHolder: t('multi.pickPlaceholder', String(columns.length)),
      },
    );
    if (!source || source.value === 'done') {
      break;
    }

    if (source.value === 'selection') {
      const next = captureSelection();
      if (!next) {
        vscode.window.showWarningMessage(t('error.noActiveEditor'));
        continue;
      }
      columns.push({ title: next.origin, text: next.text });
      continue;
    }

    if (source.value === 'clipboard') {
      const clipboard = await vscode.env.clipboard.readText();
      if (!clipboard) {
        vscode.window.showWarningMessage(t('error.clipboardEmpty'));
        continue;
      }
      columns.push({ title: t('source.clipboard'), text: clipboard });
      continue;
    }

    if (source.value === 'file') {
      const picked = await pickFile({ title: t('picker.title.fileToCompare') });
      if (!picked) {
        continue;
      }
      const bytes = await vscode.workspace.fs.readFile(picked.uri);
      columns.push({ title: picked.label, text: Buffer.from(bytes).toString('utf8') });
      continue;
    }

    if (source.value === 'input') {
      const text = await promptForText({
        title: t('input.title'),
        placeholder: t('input.placeholder'),
      });
      if (text === undefined) {
        continue;
      }
      columns.push({ title: t('source.manualInput'), text: text || t('source.empty') });
    }
  }

  if (columns.length < 2) {
    vscode.window.showWarningMessage(t('error.multiDiffNeedsTwo'));
    return;
  }

  MultiDiffPanel.createOrShow(extensionUri, columns);
}
