import * as vscode from 'vscode';
import type { ClipboardHistory } from '../commands/clipboardHistory';

export interface ClipboardWatcherOptions {
  /** Poll interval in milliseconds. */
  intervalMs?: number;
}

/**
 * Polls the clipboard and records new copies in the history.
 *
 * VSCode exposes no clipboard change event, so polling is the only portable
 * option. The first read seeds the "last seen" value without recording it, so
 * starting the extension does not capture whatever happened to be on the
 * clipboard before.
 */
export function startClipboardWatch(
  history: ClipboardHistory,
  options: ClipboardWatcherOptions = {},
): vscode.Disposable {
  const intervalMs = options.intervalMs ?? 1500;
  let last: string | undefined;
  let running = false;

  const timer = setInterval(() => {
    if (running) {
      return; // Skip ticks while a slow clipboard read is still in flight.
    }
    running = true;
    void (async () => {
      try {
        const current = await vscode.env.clipboard.readText();
        if (last === undefined) {
          last = current;
          return;
        }
        if (current && current !== last) {
          last = current;
          await history.push(current);
        }
      } catch {
        // Clipboard may be unavailable (e.g. remote session); ignore.
      } finally {
        running = false;
      }
    })();
  }, intervalMs);

  return { dispose: () => clearInterval(timer) };
}
