import * as vscode from 'vscode';
import type { DiffSource } from './diffSource';

const SCHEME = 'any-diff';

/**
 * Serves in-memory content as read-only virtual documents so that clipboard
 * text, manual input or Git versions can be diffed with the native
 * `vscode.diff` command.
 */
export class VirtualDocProvider implements vscode.TextDocumentContentProvider {
  private readonly documents = new Map<string, string>();
  private readonly languageIds = new Map<string, string>();
  private readonly changeEmitter = new vscode.EventEmitter<vscode.Uri>();
  private counter = 0;

  readonly onDidChange = this.changeEmitter.event;

  /**
   * Registers content and returns the Uri to use with `vscode.diff`.
   *
   * @param content   text content of the document
   * @param title     logical title, e.g. "Clipboard" or "Manual Input"
   * @param languageId language id used for highlighting, e.g. "typescript"
   */
  register(content: string, title: string, languageId?: string): vscode.Uri {
    const key = this.nextKey(title);
    this.documents.set(key, content);
    if (languageId) {
      this.languageIds.set(key, languageId);
    }
    return vscode.Uri.parse(`${SCHEME}:${encodeURIComponent(key)}`);
  }

  /** Refreshes an already registered document, if it is still open. */
  update(uri: vscode.Uri, content: string): void {
    const key = decodeURIComponent(uri.path.replace(/^\//, ''));
    if (!this.documents.has(key)) {
      return;
    }
    this.documents.set(key, content);
    this.changeEmitter.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const key = decodeURIComponent(uri.path.replace(/^\//, ''));
    return this.documents.get(key) ?? '';
  }

  /** Language id of a virtual document, falling back to plaintext. */
  languageOf(uri: vscode.Uri): string {
    const key = decodeURIComponent(uri.path.replace(/^\//, ''));
    return this.languageIds.get(key) ?? 'plaintext';
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
    this.documents.clear();
    this.languageIds.clear();
    this.changeEmitter.dispose();
  }

  private nextKey(title: string): string {
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Untitled';
    return `${safeTitle}/${++this.counter}.txt`;
  }
}
