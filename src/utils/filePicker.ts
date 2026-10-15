import * as path from 'path';
import * as vscode from 'vscode';
import { t } from '../i18n';

export interface PickedFile {
  uri: vscode.Uri;
  /** Short label for pickers, e.g. a workspace-relative path. */
  label: string;
}

/**
 * Picks a single file.
 *
 * Three strategies are combined so users can select anything:
 * 1. a QuickPick over workspace files (fuzzy searchable),
 * 2. an item that opens the native file dialog (works outside the workspace),
 * 3. free-form typing of an absolute or workspace-relative path.
 */
export async function pickFile(
  options: { exclude?: vscode.Uri[]; title?: string } = {},
): Promise<PickedFile | undefined> {
  const excluded = options.exclude ?? [];

  const browseItem: vscode.QuickPickItem = {
    label: `$(folder-opened) ${t('picker.browse')}`,
    description: t('picker.browseDescription'),
    alwaysShow: true,
  };

  const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { uri?: vscode.Uri }>();
  quickPick.title = options.title ?? t('picker.title.fileToCompare');
  quickPick.placeholder = t('picker.placeholder');
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;
  quickPick.items = [browseItem];

  const chosen = await new Promise<vscode.QuickPickItem & { uri?: vscode.Uri } | string | undefined>((resolve) => {
    let settled = false;
    const finish = (value: typeof chosen) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    quickPick.onDidAccept(() => {
      const active = quickPick.activeItems[0];
      if (!active) {
        finish(undefined);
        return;
      }
      if (active.uri) {
        finish(active);
        return;
      }
      // Free-form path typed by the user.
      finish(quickPick.value);
    });
    quickPick.onDidHide(() => finish(undefined));
    quickPick.show();

    // Workspace files load lazily so the picker opens instantly.
    void loadWorkspaceFiles(excluded).then((files) => {
      if (settled) {
        return;
      }
      const items = [browseItem, ...files.map(toQuickPickItem)];
      quickPick.items = items;
    });
  });

  quickPick.dispose();

  if (!chosen) {
    return undefined;
  }
  if (typeof chosen === 'string') {
    return resolveTypedPath(chosen, excluded);
  }
  if (chosen.uri) {
    return { uri: chosen.uri, label: chosen.label };
  }
  return openDialog(excluded);
}

async function openDialog(excluded: vscode.Uri[]): Promise<PickedFile | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    openLabel: t('common.appName'),
  });
  const uri = picked?.[0];
  if (!uri || excluded.some((u) => u.fsPath === uri.fsPath)) {
    return undefined;
  }
  return { uri, label: vscode.workspace.asRelativePath(uri, false) || uri.fsPath };
}

async function resolveTypedPath(input: string, excluded: vscode.Uri[]): Promise<PickedFile | undefined> {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const candidates = [trimmed];
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    candidates.push(path.resolve(folder.uri.fsPath, trimmed));
  }
  for (const candidate of candidates) {
    const uri = vscode.Uri.file(path.resolve(candidate));
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.File) {
        if (excluded.some((u) => u.fsPath === uri.fsPath)) {
          continue;
        }
        return { uri, label: vscode.workspace.asRelativePath(uri, false) || uri.fsPath };
      }
    } catch {
      // Not a file, try the next candidate.
    }
  }
  vscode.window.showWarningMessage(t('error.fileNotFound', trimmed));
  return undefined;
}

async function loadWorkspaceFiles(excluded: vscode.Uri[]): Promise<PickedFile[]> {
  const files = await vscode.workspace.findFiles('**/*', '**/{node_modules,.git,dist,out}/**', 5000);
  const excludedPaths = new Set(excluded.map((u) => u.fsPath));
  return files
    .filter((uri) => !excludedPaths.has(uri.fsPath))
    .map((uri) => ({ uri, label: vscode.workspace.asRelativePath(uri, false) }));
}

function toQuickPickItem(file: PickedFile): vscode.QuickPickItem & { uri: vscode.Uri } {
  return {
    label: `$(file) ${file.label}`,
    description: path.dirname(file.uri.fsPath),
    uri: file.uri,
  };
}
