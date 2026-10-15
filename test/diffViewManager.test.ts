import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffViewManager, setDiffRecorder } from '../src/views/diffViewManager';
import type { DiffSource } from '../src/providers/diffSource';

function source(title: string): DiffSource {
  return {
    title,
    uri: { scheme: 'file', path: title, fsPath: title } as never,
    languageId: 'plaintext',
  };
}

describe('DiffViewManager recorder hook', () => {
  afterEach(() => {
    setDiffRecorder(undefined);
  });

  it('records every opened comparison', async () => {
    const record = vi.fn(async () => undefined);
    setDiffRecorder({ record });

    await DiffViewManager.open(source('a'), source('b'), {
      guardLargeFiles: false,
      showStats: false,
    });

    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0].title).toBe('a');
    expect(record.mock.calls[0][1].title).toBe('b');
  });

  it('does not let a failing recorder break the comparison', async () => {
    setDiffRecorder({
      record: async () => {
        throw new Error('recorder exploded');
      },
    });

    await expect(
      DiffViewManager.open(source('a'), source('b'), {
        guardLargeFiles: false,
        showStats: false,
      }),
    ).resolves.toBeUndefined();
  });
});
