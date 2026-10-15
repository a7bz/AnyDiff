import * as vscode from 'vscode';
import type { DiffSource } from './diffSource';
import { extensionForLanguage } from '../utils/language';

export const VIRTUAL_SCHEME = 'any-diff';

/**
 * Serves in-memory content as read-only virtual documents so that clipboard
 * text, manual input or Git versions can be diffed with the native
 * `vscode.diff` command.
 *
 * The uri path ends with an extension derived from the language id, because
 * VSCode resolves a document's language from the uri path and would otherwise
 * render every virtual document as plain text.
 */
export class VirtualDocProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
  private readonly documents = new Map<string, string>();
  private readonly languageIds = new Map<string, string>();
  private readonly changeEmitter = new vscode.EventEmitter<vscode.Uri>();
  private readonly closeListener: vscode.Disposable;
  private counter = 0;

  readonly onDidChange = this.changeEmitter.event;

  constructor() {
    // Drop content as soon as its editor closes so long sessions do not
    // accumulate every snippet the user ever compared.
    this.closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.uri.scheme === VIRTUAL_SCHEME) {
        this.release(document.uri);
      }
    });
  }

  /**
   * Registers content and returns the Uri to use with `vscode.diff`.
   *
   * @param content   text content of the document
   * @param title     logical title, e.g. "Clipboard" or "Manual Input"
   * @param languageId language id used for highlighting, e.g. "typescript"
   */
  register(content: string, title: string, languageId?: string): vscode.Uri {
    const key = this.nextKey(title, languageId);
    this.documents.set(key, content);
    if (languageId) {
      this.languageIds.set(key, languageId);
    }
    return vscode.Uri.parse(`${VIRTUAL_SCHEME}:${encodeURI(key)}`);
  }

  /** Refreshes an already registered document, if it is still open. */
  update(uri: vscode.Uri, content: string): void {
    const key = this.keyOf(uri);
    if (!this.documents.has(key)) {
      return;
    }
    this.documents.set(key, content);
    this.changeEmitter.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.documents.get(this.keyOf(uri)) ?? '';
  }

  /** Language id of a virtual document, falling back to plaintext. */
  languageOf(uri: vscode.Uri): string {
    return this.languageIds.get(this.keyOf(uri)) ?? 'plaintext';
  }

  /** Creates a DiffSource backed by a virtual document. */
  createSource(content: string, title: string, languageId?: string): DiffSource {
    const uri = this.register(content, title, languageId);
    return {
      title,
      uri,
      languageId: languageId ?? 'plaintext',
      text: async () => content,
    };
  }

  dispose(): void {
    this.closeListener.dispose();
    this.documents.clear();
    this.languageIds.clear();
    this.changeEmitter.dispose();
  }

  private release(uri: vscode.Uri): void {
    const key = this.keyOf(uri);
    this.documents.delete(key);
    this.languageIds.delete(key);
  }

  /** Extracts the storage key from a virtual uri, tolerating encoding. */
  private keyOf(uri: vscode.Uri): string {
    const raw = uri.path.replace(/^\//, '');
    try {
      return decodeURI(raw);
    } catch {
      return raw;
    }
  }

  private nextKey(title: string, languageId?: string): string {
    // `#` and `?` are not escaped by `encodeURI` and would be parsed as the
    // fragment / query of the uri, so strip them along with the other
    // path-hostile characters.
    const safeTitle = title.replace(/[\\/:*?"<>|#]/g, '_').trim() || 'Untitled';
    const extension = extensionForLanguage(languageId);
    return `${safeTitle}/${++this.counter}.${extension}`;
  }
}
