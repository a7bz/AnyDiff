import * as vscode from 'vscode';
import { t } from '../i18n';

export interface IgnoreOptions {
  ignoreTrimWhitespace?: boolean;
  ignoreAllWhitespace?: boolean;
  ignoreCase?: boolean;
}

/** Reads the user's ignore preferences from settings. */
export function getIgnoreOptions(): IgnoreOptions {
  const config = vscode.workspace.getConfiguration('anydiff');
  return {
    ignoreTrimWhitespace: config.get<boolean>('ignoreTrimWhitespace', false),
    ignoreAllWhitespace: config.get<boolean>('ignoreAllWhitespace', false),
    ignoreCase: config.get<boolean>('ignoreCase', false),
  };
}

/** Returns the size threshold (in MB) above which the user is warned. */
export function getMaxFileSizeMB(): number {
  return vscode.workspace.getConfiguration('anydiff').get<number>('maxFileSizeMB', 10);
}

/**
 * Asks for confirmation when either side exceeds the configured size limit.
 * Returns true when it is safe to proceed.
 */
export async function confirmLargeFiles(uris: vscode.Uri[]): Promise<boolean> {
  const limitMB = getMaxFileSizeMB();
  if (limitMB <= 0) {
    return true; // protection disabled
  }
  const limitBytes = limitMB * 1024 * 1024;

  const oversized: string[] = [];
  for (const uri of uris) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > limitBytes) {
        oversized.push(`${vscode.workspace.asRelativePath(uri, false)} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      }
    } catch {
      // Unreadable files are handled by the diff command itself.
    }
  }

  if (oversized.length === 0) {
    return true;
  }

  const proceed = t('error.confirmLargeFile');
  const cancel = t('error.cancel');
  const choice = await vscode.window.showWarningMessage(
    t('error.largeFileWarning', oversized.join(', '), String(limitMB)),
    proceed,
    cancel,
  );
  return choice === proceed;
}
