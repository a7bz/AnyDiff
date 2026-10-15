import type * as vscode from 'vscode';

export interface DiffStats {
  /** Number of lines only present in the right side. */
  added: number;
  /** Number of lines only present in the left side. */
  removed: number;
  /** Number of identical lines. */
  unchanged: number;
  /** Total lines of the left side. */
  leftTotal: number;
  /** Total lines of the right side. */
  rightTotal: number;
}

export interface IgnoreOptions {
  ignoreTrimWhitespace?: boolean;
  ignoreAllWhitespace?: boolean;
  ignoreCase?: boolean;
}

/** Options used when opening a diff view. */
export interface DiffOpenOptions {
  viewColumn?: vscode.ViewColumn;
  showStats?: boolean;
  ignore?: IgnoreOptions;
  /** Set to false to skip the large-file confirmation (default: true). */
  guardLargeFiles?: boolean;
}
