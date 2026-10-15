import * as vscode from 'vscode';

/**
 * A source of content that can take part in a diff.
 *
 * Two flavors exist:
 * - FileSource  : a real file on disk, addressed by a real `file://` Uri.
 * - VirtualSource: content produced in memory (clipboard, manual input, Git
 *                 version), served through the `any-diff:` scheme.
 */
export interface DiffSource {
  /** Title shown in the diff editor tab and the side label. */
  readonly title: string;
  /** Uri passed to `vscode.diff`. */
  readonly uri: vscode.Uri;
  /** Language id used for syntax highlighting, when known. */
  readonly languageId?: string;
  /** Absolute file path when this source maps to a file on disk. */
  readonly filePath?: string;
  /** Text content, available for virtual sources (used by stats/patch). */
  text?(): Promise<string>;
}
