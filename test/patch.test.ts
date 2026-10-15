import { describe, expect, it } from 'vitest';
import { createUnifiedDiff } from '../src/utils/patch';

describe('createUnifiedDiff structure', () => {
  it('creates separate hunks for distant changes', () => {
    const oldText = Array.from({ length: 30 }, (_, i) => `line${i + 1}`).join('\n');
    const changed = oldText
      .split('\n')
      .map((line, i) => (i === 2 ? 'A' : i === 25 ? 'B' : line))
      .join('\n');
    const patch = createUnifiedDiff(oldText, changed);
    const hunkHeaders = patch.split('\n').filter((line) => line.startsWith('@@'));
    expect(hunkHeaders).toHaveLength(2);
  });

  it('merges nearby changes into one hunk', () => {
    const oldText = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join('\n');
    const changed = oldText
      .split('\n')
      .map((line, i) => (i === 5 || i === 7 ? 'X' : line))
      .join('\n');
    const patch = createUnifiedDiff(oldText, changed);
    expect(patch.split('\n').filter((line) => line.startsWith('@@'))).toHaveLength(1);
  });

  it('hunk counts match the emitted lines', () => {
    const patch = createUnifiedDiff('a\nb\nc\nd\ne', 'a\nB\nc\nd\nE\nf');
    const hunk = patch.split('\n').find((line) => line.startsWith('@@'))!;
    const match = /@@ -(\d+),(\d+) \+(\d+),(\d+) @@/.exec(hunk);
    expect(match).not.toBeNull();
    const [, oldStart, oldCount, newStart, newCount] = match!.map(Number) as unknown as number[];
    expect(oldStart).toBe(1);
    expect(newStart).toBe(1);
    expect(oldCount).toBeGreaterThanOrEqual(5);
    expect(newCount).toBeGreaterThanOrEqual(6);
  });

  it('only marks removed lines with - and added lines with +', () => {
    const patch = createUnifiedDiff('keep\ngone\nkeep', 'keep\nnew\nkeep');
    const body = patch.split('\n').slice(2);
    expect(body.filter((l) => l.startsWith('-') && !l.startsWith('---'))).toEqual(['-gone']);
    expect(body.filter((l) => l.startsWith('+') && !l.startsWith('+++'))).toEqual(['+new']);
    expect(body.filter((l) => l.startsWith(' '))).toEqual([' keep', ' keep']);
  });
});
