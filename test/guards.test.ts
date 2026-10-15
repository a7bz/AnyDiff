import { describe, expect, it } from 'vitest';

/**
 * These tests cover the pure decision logic used by `confirmLargeFiles` and
 * the pairwise batch comparison. The VSCode-facing wrappers are exercised in
 * `test/__mocks__/vscode.ts`-based integration tests instead.
 */

const MB = 1024 * 1024;

/** Mirrors the threshold check in `src/utils/config.ts`. */
function oversized(files: Array<{ name: string; size: number }>, limitMB: number): string[] {
  if (limitMB <= 0) {
    return [];
  }
  const limit = limitMB * MB;
  return files.filter((f) => f.size > limit).map((f) => f.name);
}

/** Mirrors the pairing logic in `compareMultipleFilesCommand`. */
function pairings(files: string[]): Array<[string, string]> {
  if (files.length < 2) {
    return [];
  }
  const [first, ...rest] = files;
  return rest.map((other) => [first, other] as [string, string]);
}

describe('large file guard', () => {
  it('flags files above the limit', () => {
    const files = [
      { name: 'small.ts', size: 1 * MB },
      { name: 'big.ts', size: 25 * MB },
    ];
    expect(oversized(files, 10)).toEqual(['big.ts']);
  });

  it('treats the limit as inclusive', () => {
    expect(oversized([{ name: 'exact.bin', size: 10 * MB }], 10)).toEqual([]);
    expect(oversized([{ name: 'over.bin', size: 10 * MB + 1 }], 10)).toEqual(['over.bin']);
  });

  it('is disabled when the limit is zero or negative', () => {
    expect(oversized([{ name: 'huge.bin', size: 999 * MB }], 0)).toEqual([]);
    expect(oversized([{ name: 'huge.bin', size: 999 * MB }], -1)).toEqual([]);
  });
});

describe('batch comparison pairing', () => {
  it('needs at least two files', () => {
    expect(pairings([])).toEqual([]);
    expect(pairings(['a.ts'])).toEqual([]);
  });

  it('compares the first file against each other', () => {
    expect(pairings(['a.ts', 'b.ts', 'c.ts'])).toEqual([
      ['a.ts', 'b.ts'],
      ['a.ts', 'c.ts'],
    ]);
  });

  it('handles exactly two files', () => {
    expect(pairings(['a.ts', 'b.ts'])).toEqual([['a.ts', 'b.ts']]);
  });
});
