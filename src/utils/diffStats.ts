import type { DiffStats, IgnoreOptions } from '../types';

/**
 * Line-level diff statistics using a classic LCS dynamic programming table.
 *
 * Good enough for reporting; large inputs are handled by falling back to a
 * cheaper prefix/suffix trim so we never allocate a huge matrix.
 */
export function computeDiffStats(left: string, right: string, ignore: IgnoreOptions = {}): DiffStats {
  const leftLines = normalize(left, ignore);
  const rightLines = normalize(right, ignore);

  const trimmed = trimCommon(leftLines, rightLines);
  const { added, removed } = countChanges(trimmed.left, trimmed.right);

  // unchanged = left lines that survive the comparison (prefix + suffix + LCS)
  const unchanged = leftLines.length - removed;

  return {
    added,
    removed,
    unchanged,
    leftTotal: leftLines.length,
    rightTotal: rightLines.length,
  };
}

function normalize(text: string, ignore: IgnoreOptions): string[] {
  let result = text.replace(/\r\n/g, '\n').split('\n');
  if (result.length > 1 && result[result.length - 1] === '') {
    result = result.slice(0, -1);
  }
  if (ignore.ignoreCase) {
    result = result.map((line) => line.toLowerCase());
  }
  if (ignore.ignoreAllWhitespace) {
    result = result.map((line) => line.replace(/\s+/g, ''));
  } else if (ignore.ignoreTrimWhitespace) {
    result = result.map((line) => line.trim());
  }
  return result;
}

function trimCommon(left: string[], right: string[]): { left: string[]; right: string[]; common: number } {
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) {
    start++;
  }
  let end = 0;
  while (
    end < left.length - start &&
    end < right.length - start &&
    left[left.length - 1 - end] === right[right.length - 1 - end]
  ) {
    end++;
  }
  return {
    left: left.slice(start, left.length - end),
    right: right.slice(start, right.length - end),
    common: start + end,
  };
}

function countChanges(left: string[], right: string[]): { added: number; removed: number } {
  const maxCells = 2_000_000; // ~2000 x 1000
  if (left.length * right.length > maxCells) {
    // Fallback for huge inputs: treat everything remaining as changed.
    return { added: right.length, removed: left.length };
  }

  const rows = left.length;
  const cols = right.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));

  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      table[i][j] = left[i - 1] === right[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  let added = 0;
  let removed = 0;
  let i = rows;
  let j = cols;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      removed++;
      i--;
    } else {
      added++;
      j--;
    }
  }
  removed += i;
  added += j;
  return { added, removed };
}
