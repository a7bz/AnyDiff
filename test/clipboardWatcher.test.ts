import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './__mocks__/vscode';
import { startClipboardWatch } from '../src/utils/clipboardWatcher';
import type { ClipboardHistory } from '../src/commands/clipboardHistory';

/** Minimal stand-in for the real `ClipboardHistory`. */
class FakeHistory {
  readonly pushed: string[] = [];

  async push(text: string): Promise<void> {
    this.pushed.push(text);
  }
}

function useClipboard(values: string[]): void {
  let index = 0;
  env.clipboard.readText = async () => values[Math.min(index++, values.length - 1)];
}

describe('startClipboardWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds the first read without recording it', async () => {
    const history = new FakeHistory();
    useClipboard(['initial', 'initial']);
    const watcher = startClipboardWatch(history as unknown as ClipboardHistory, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(10);
    expect(history.pushed).toEqual([]);
    watcher.dispose();
  });

  it('records a changed value once', async () => {
    const history = new FakeHistory();
    useClipboard(['initial', 'changed', 'changed']);
    const watcher = startClipboardWatch(history as unknown as ClipboardHistory, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(10); // seed
    await vi.advanceTimersByTimeAsync(10); // changed
    await vi.advanceTimersByTimeAsync(10); // unchanged
    expect(history.pushed).toEqual(['changed']);
    watcher.dispose();
  });

  it('ignores empty clipboard reads', async () => {
    const history = new FakeHistory();
    useClipboard(['initial', '', '']);
    const watcher = startClipboardWatch(history as unknown as ClipboardHistory, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);
    expect(history.pushed).toEqual([]);
    watcher.dispose();
  });

  it('survives a failing clipboard read', async () => {
    const history = new FakeHistory();
    let calls = 0;
    env.clipboard.readText = async () => {
      calls++;
      if (calls === 1) {
        throw new Error('clipboard unavailable');
      }
      return 'later';
    };
    const watcher = startClipboardWatch(history as unknown as ClipboardHistory, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(10); // throws, seeds nothing
    await vi.advanceTimersByTimeAsync(10); // seeds 'later'
    await vi.advanceTimersByTimeAsync(10); // unchanged
    expect(history.pushed).toEqual([]);
    watcher.dispose();
  });

  it('stops polling after dispose', async () => {
    const history = new FakeHistory();
    useClipboard(['initial', 'changed', 'changed']);
    const watcher = startClipboardWatch(history as unknown as ClipboardHistory, { intervalMs: 10 });

    await vi.advanceTimersByTimeAsync(10);
    watcher.dispose();
    await vi.advanceTimersByTimeAsync(50);
    expect(history.pushed).toEqual([]);
  });
});
