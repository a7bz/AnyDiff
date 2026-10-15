import { describe, expect, it } from 'vitest';
import { alignColumns, summarize } from '../src/utils/multiDiff';

describe('alignColumns', () => {
  it('marks identical lines as stable', () => {
    const rows = alignColumns(['a\nb\nc', 'a\nb\nc']);
    expect(rows).toEqual([
      { cells: ['a', 'a'], kind: 'stable' },
      { cells: ['b', 'b'], kind: 'stable' },
      { cells: ['c', 'c'], kind: 'stable' },
    ]);
  });

  it('keeps a single change aligned between anchors', () => {
    const rows = alignColumns(['a\nb\nc', 'a\nB\nc']);
    expect(rows).toEqual([
      { cells: ['a', 'a'], kind: 'stable' },
      { cells: ['b', 'B'], kind: 'changed' },
      { cells: ['c', 'c'], kind: 'stable' },
    ]);
  });

  it('pads unequal sides with null', () => {
    const rows = alignColumns(['a\nx\ny\nz\nb', 'a\nq\nb']);
    expect(rows).toEqual([
      { cells: ['a', 'a'], kind: 'stable' },
      { cells: ['x', 'q'], kind: 'changed' },
      { cells: ['y', null], kind: 'changed' },
      { cells: ['z', null], kind: 'changed' },
      { cells: ['b', 'b'], kind: 'stable' },
    ]);
  });

  it('handles additions at the end', () => {
    const rows = alignColumns(['a\nb', 'a\nb\nc\nd']);
    expect(rows).toEqual([
      { cells: ['a', 'a'], kind: 'stable' },
      { cells: ['b', 'b'], kind: 'stable' },
      { cells: [null, 'c'], kind: 'changed' },
      { cells: [null, 'd'], kind: 'changed' },
    ]);
  });

  it('handles removals at the start', () => {
    const rows = alignColumns(['gone\nalso\na', 'a']);
    expect(rows).toEqual([
      { cells: ['gone', null], kind: 'changed' },
      { cells: ['also', null], kind: 'changed' },
      { cells: ['a', 'a'], kind: 'stable' },
    ]);
  });

  it('requires an anchor to exist in every column', () => {
    // "b" is present in column 1 and 2 but not 3, so it is NOT an anchor.
    const rows = alignColumns(['a\nb\nc', 'a\nb\nc', 'a\nx\nc']);
    const bRow = rows.find((row) => row.cells.includes('b'));
    expect(bRow?.kind).toBe('changed');
    // "a" and "c" are shared by all three and stay stable.
    expect(rows.filter((row) => row.kind === 'stable').map((r) => r.cells[0])).toEqual(['a', 'c']);
  });

  it('aligns three columns around common anchors', () => {
    const rows = alignColumns(['head\nv1\ntail', 'head\nv2\ntail', 'head\nv3\ntail']);
    expect(rows).toEqual([
      { cells: ['head', 'head', 'head'], kind: 'stable' },
      { cells: ['v1', 'v2', 'v3'], kind: 'changed' },
      { cells: ['tail', 'tail', 'tail'], kind: 'stable' },
    ]);
  });

  it('honours ignore options', () => {
    const rows = alignColumns(['a\nb', 'a\nb '], { ignoreTrimWhitespace: true });
    expect(rows.every((row) => row.kind === 'stable')).toBe(true);
  });

  it('treats everything as changed when nothing matches', () => {
    const rows = alignColumns(['x', 'y']);
    expect(rows).toEqual([{ cells: ['x', 'y'], kind: 'changed' }]);
  });

  it('handles a single column', () => {
    expect(alignColumns(['a\nb'])).toEqual([
      { cells: ['a'], kind: 'stable' },
      { cells: ['b'], kind: 'stable' },
    ]);
  });

  it('handles empty input', () => {
    expect(alignColumns([])).toEqual([]);
  });

  it('does not produce a trailing empty row for a final newline', () => {
    const rows = alignColumns(['a\n', 'a\n']);
    expect(rows).toEqual([{ cells: ['a', 'a'], kind: 'stable' }]);
  });
});

describe('summarize', () => {
  it('counts stable and changed rows plus per-column totals', () => {
    const columns = ['a\nb\nc', 'a\nX\nc'];
    const rows = alignColumns(columns);
    const stats = summarize(rows, columns);
    expect(stats.stable).toBe(2);
    expect(stats.changed).toBe(1);
    expect(stats.columnTotals).toEqual([3, 3]);
  });

  it('reports different totals per column', () => {
    const columns = ['a\nb', 'a\nb\nc'];
    const stats = summarize(alignColumns(columns), columns);
    expect(stats.columnTotals).toEqual([2, 3]);
    expect(stats.stable).toBe(2);
    expect(stats.changed).toBe(1);
  });
});
