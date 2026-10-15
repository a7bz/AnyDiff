import { describe, expect, it } from 'vitest';
import { computeDiffStats } from '../src/utils/diffStats';
import { createUnifiedDiff, splitLines } from '../src/utils/patch';

describe('computeDiffStats', () => {
  it('counts added and removed lines', () => {
    const stats = computeDiffStats('a\nb\nc', 'a\nx\nc\nd');
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(1);
    expect(stats.unchanged).toBe(2);
    expect(stats.leftTotal).toBe(3);
    expect(stats.rightTotal).toBe(4);
  });

  it('reports zero changes for identical content', () => {
    const stats = computeDiffStats('same\nlines', 'same\nlines');
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
    expect(stats.unchanged).toBe(2);
  });

  it('handles empty sides', () => {
    expect(computeDiffStats('', 'one\ntwo').added).toBe(2);
    expect(computeDiffStats('one\ntwo', '').removed).toBe(2);
  });

  it('ignores trailing whitespace when configured', () => {
    const left = 'a\nb';
    const right = 'a \nb  ';
    expect(computeDiffStats(left, right).added).toBe(2);
    expect(computeDiffStats(left, right, { ignoreTrimWhitespace: true }).added).toBe(0);
  });

  it('ignores all whitespace when configured', () => {
    const left = 'const x = 1';
    const right = 'const  x=1';
    expect(computeDiffStats(left, right).added).toBe(1);
    expect(computeDiffStats(left, right, { ignoreAllWhitespace: true }).added).toBe(0);
  });

  it('ignores case when configured', () => {
    expect(computeDiffStats('Hello', 'hello').added).toBe(1);
    expect(computeDiffStats('Hello', 'hello', { ignoreCase: true }).added).toBe(0);
  });
});

describe('createUnifiedDiff', () => {
  it('produces a header and hunk', () => {
    const patch = createUnifiedDiff('one\ntwo\nthree', 'one\n2\nthree', {
      oldName: 'a/old.txt',
      newName: 'b/new.txt',
    });
    expect(patch).toContain('--- a/old.txt');
    expect(patch).toContain('+++ b/new.txt');
    expect(patch).toContain('@@');
    expect(patch).toContain('-two');
    expect(patch).toContain('+2');
  });

  it('returns empty string when identical', () => {
    expect(createUnifiedDiff('same', 'same')).toBe('');
  });

  it('emits valid hunk line numbers', () => {
    const oldText = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join('\n');
    const newText = Array.from({ length: 10 }, (_, i) => `line${i + 1}`)
      .map((l, i) => (i === 5 ? 'CHANGED' : l))
      .join('\n');
    const patch = createUnifiedDiff(oldText, newText);
    const header = patch.split('\n').find((line) => line.startsWith('@@'));
    expect(header).toBe('@@ -3,7 +3,7 @@');
  });

  it('splits trailing newlines consistently', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('a\nb')).toEqual(['a', 'b']);
  });
});
