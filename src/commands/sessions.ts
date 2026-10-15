import * as vscode from 'vscode';
import { t } from '../i18n';
import { MultiDiffPanel, type MultiDiffColumn } from '../views/multiDiffPanel';

export interface SavedSession {
  name: string;
  columns: MultiDiffColumn[];
  at: number;
}

const STORAGE_KEY = 'anydiff.sessions';
const LIMIT = 30;

/**
 * Stores named comparison sessions (a set of columns) so a multi-way
 * comparison can be reopened later by name.
 */
export class SessionStore {
  constructor(private readonly state: vscode.Memento) {}

  list(): SavedSession[] {
    return this.state.get<SavedSession[]>(STORAGE_KEY, []);
  }

  async save(name: string, columns: MultiDiffColumn[]): Promise<void> {
    const entry: SavedSession = { name, columns, at: Date.now() };
    const rest = this.list().filter((session) => session.name !== name);
    await this.state.update(STORAGE_KEY, [entry, ...rest].slice(0, LIMIT));
  }

  async remove(name: string): Promise<void> {
    await this.state.update(
      STORAGE_KEY,
      this.list().filter((session) => session.name !== name),
    );
  }
}

/** `anydiff.saveSession` — name and store the current multi-way panel. */
export async function saveSessionCommand(store: SessionStore): Promise<void> {
  const columns = MultiDiffPanel.currentColumns();
  if (!columns || columns.length < 2) {
    vscode.window.showWarningMessage(t('session.noPanel'));
    return;
  }

  const name = await vscode.window.showInputBox({
    title: t('session.saveTitle'),
    prompt: t('session.savePrompt'),
    value: columns.map((column) => column.title).join(' + ').slice(0, 80),
    validateInput: (value) => (value.trim() ? undefined : t('session.nameRequired')),
  });
  if (name === undefined) {
    return;
  }

  await store.save(name.trim(), columns);
  vscode.window.showInformationMessage(t('session.saved', name.trim()));
}

/** `anydiff.openSession` — reopen a stored session, or delete one. */
export async function openSessionCommand(
  store: SessionStore,
  extensionUri: vscode.Uri,
): Promise<void> {
  const sessions = store.list();
  if (sessions.length === 0) {
    vscode.window.showInformationMessage(t('session.empty'));
    return;
  }

  const items: Array<vscode.QuickPickItem & { session?: SavedSession; remove?: true }> = [
    ...sessions.map((session) => ({
      label: `$(bookmark) ${session.name}`,
      description: `${session.columns.length} ${t('panel.columns')}`,
      detail: session.columns.map((column) => column.title).join(' | '),
      session,
    })),
    { label: `$(trash) ${t('session.clear')}`, alwaysShow: true, remove: true },
  ];

  const chosen = await vscode.window.showQuickPick(items, {
    title: t('session.openTitle'),
    placeHolder: t('session.openPlaceholder'),
    matchOnDetail: true,
  });
  if (!chosen) {
    return;
  }
  if (chosen.remove) {
    for (const session of sessions) {
      await store.remove(session.name);
    }
    vscode.window.showInformationMessage(t('session.cleared'));
    return;
  }
  if (!chosen.session) {
    return;
  }

  MultiDiffPanel.createOrShow(extensionUri, chosen.session.columns);
}
