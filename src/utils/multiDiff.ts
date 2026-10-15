import type { IgnoreOptions } from '../types';

/** A single rendered row of an N-way comparison. */
export interface DiffRow {
  /** One entry per column; `null` means "no line in this column". */
  cells: Array<string | null>;
  /** `stable` = the line is identical across every column. */
  kind: 'stable' | 'changed';
}

export interface MultiDiffSummary {
  stable: number;
  changed: number;
  /** Number of lines per column. */
  columnTotals: number[];
}

/** Guard against quadratic blow-up on huge inputs. */
const MAX_CELLS = 2_000_000;

/**
 * Aligns N text columns into rows, using the first column as the baseline.
 *
 * The alignment is a classic diff3-style merge: the baseline is matched
 * against every other column with an LCS, and the anchors that are common to
 * *all* columns become `stable` rows. Everything between two anchors becomes
 * `changed` rows, padded with `null` so the columns line up visually.
 *
 * With two columns this degenerates to an ordinary side-by-side diff.
 */
export function alignColumns(columns: string[], ignore: IgnoreOptions = {}): DiffRow[] {
  if (columns.length === 0) {
    return [];
  }
  if (columns.length === 1) {
    return splitLines(columns[0]).map((line) => ({ cells: [line], kind: 'stable' as const }));
  }

  const raw = columns.map(splitLines);
  const normalized = raw.map((lines) => lines.map((line) => normalizeLine(line, ignore)));

  const base = normalized[0];
  const matches = normalized.slice(1).map((column) => lcsMatches(base, column));

  // An anchor must be matched in every other column to be a stable row.
  let anchors = new Set(matches[0].keys());
  for (const match of matches.slice(1)) {
    for (const key of [...anchors]) {
      if (!match.has(key)) {
        anchors.delete(key);
      }
    }
  }
  const ordered = [...anchors].sort((a, b) => a - b);

  const rows: DiffRow[] = [];
  const positions = raw.map(() => 0);

  const flushChunk = (ends: number[]): void => {
    const chunks = raw.map((lines, index) => lines.slice(positions[index], ends[index]));
    const height = Math.max(0, ...chunks.map((chunk) => chunk.length));
    for (let row = 0; row < height; row++) {
      rows.push({ cells: chunks.map((chunk) => chunk[row] ?? null), kind: 'changed' });
    }
  };

  for (const anchor of ordered) {
    const ends = [anchor, ...matches.map((match) => match.get(anchor) as number)];
    flushChunk(ends);
    rows.push({ cells: raw.map((lines, index) => lines[ends[index]] ?? null), kind: 'stable' });
    ends.forEach((end, index) => {
      positions[index] = end + 1;
    });
  }
  flushChunk(raw.map((lines) => lines.length));

  return rows;
}

/** Aggregates row counts for the summary line. */
export function summarize(rows: DiffRow[], columns: string[]): MultiDiffSummary {
  let stable = 0;
  let changed = 0;
  for (const row of rows) {
    if (row.kind === 'stable') {
      stable++;
    } else {
      changed++;
    }
  }
  return {
    stable,
    changed,
    columnTotals: columns.map((column) => splitLines(column).length),
  };
}

export function splitLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function normalizeLine(line: string, ignore: IgnoreOptions): string {
  let result = line;
  if (ignore.ignoreCase) {
    result = result.toLowerCase();
  }
  if (ignore.ignoreAllWhitespace) {
    result = result.replace(/\s+/g, '');
  } else if (ignore.ignoreTrimWhitespace) {
    result = result.trim();
  }
  return result;
}

/**
 * Longest-common-subsequence matches between two line arrays, returned as a
 * map from the index in `a` to the index in `b`.
 */
function lcsMatches(a: string[], b: string[]): Map<number, number> {
  const matches = new Map<number, number>();
  const rows = a.length;
  const cols = b.length;
  if (rows === 0 || cols === 0) {
    return matches;
  }

  if (rows * cols > MAX_CELLS) {
    // Fallback for very large inputs: match the common prefix and suffix only.
    let start = 0;
    while (start < rows && start < cols && a[start] === b[start]) {
      matches.set(start, start);
      start++;
    }
    let end = 0;
    while (end < rows - start && end < cols - start && a[rows - 1 - end] === b[cols - 1 - end]) {
      matches.set(rows - 1 - end, cols - 1 - end);
      end++;
    }
    return matches;
  }

  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      table[i][j] = a[i - 1] === b[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  let i = rows;
  let j = cols;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matches.set(i - 1, j - 1);
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return matches;
}
