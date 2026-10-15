/**
 * Minimal unified-diff (patch) generator.
 *
 * Emits standard `--- a/file` / `+++ b/file` headers so the output can be
 * applied with `git apply` or `patch -p1`.
 */
export function createUnifiedDiff(
  oldText: string,
  newText: string,
  options: { oldName?: string; newName?: string; contextLines?: number } = {},
): string {
  const context = options.contextLines ?? 3;
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  const ops = diffLines(oldLines, newLines);
  const hunks = buildHunks(ops, context);
  if (hunks.length === 0) {
    return '';
  }

  const oldName = options.oldName ?? 'a/file';
  const newName = options.newName ?? 'b/file';

  return [
    `--- ${oldName}`,
    `+++ ${newName}`,
    ...hunks.map(renderHunk),
    '',
  ].join('\n');
}

export function splitLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

type OpType = 'equal' | 'add' | 'remove';

interface Op {
  type: OpType;
  line: string;
  /** 1-based line number in the old file (equal/remove ops). */
  oldLine: number;
  /** 1-based line number in the new file (equal/add ops). */
  newLine: number;
}

function diffLines(oldLines: string[], newLines: string[]): Op[] {
  const rows = oldLines.length;
  const cols = newLines.length;
  const maxCells = 2_000_000;

  if (rows * cols > maxCells) {
    // Fallback: replace everything (rare, only for very large inputs).
    const ops: Op[] = [];
    let oldLine = 1;
    let newLine = 1;
    for (const line of oldLines) {
      ops.push({ type: 'remove', line, oldLine: oldLine++, newLine: 0 });
    }
    for (const line of newLines) {
      ops.push({ type: 'add', line, oldLine: 0, newLine: newLine++ });
    }
    return ops;
  }

  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      table[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const raw: Array<{ type: OpType; line: string }> = [];
  let i = rows;
  let j = cols;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      raw.push({ type: 'equal', line: oldLines[i - 1] });
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      raw.push({ type: 'remove', line: oldLines[i - 1] });
      i--;
    } else {
      raw.push({ type: 'add', line: newLines[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    raw.push({ type: 'remove', line: oldLines[--i] });
  }
  while (j > 0) {
    raw.push({ type: 'add', line: newLines[--j] });
  }
  raw.reverse();

  // Attach line numbers.
  let oldLine = 1;
  let newLine = 1;
  return raw.map((op) => {
    if (op.type === 'equal') {
      const entry = { type: op.type, line: op.line, oldLine, newLine };
      oldLine++;
      newLine++;
      return entry;
    }
    if (op.type === 'remove') {
      return { type: op.type, line: op.line, oldLine: oldLine++, newLine: 0 };
    }
    return { type: op.type, line: op.line, oldLine: 0, newLine: newLine++ };
  });
}

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: Op[];
}

function buildHunks(ops: Op[], context: number): Hunk[] {
  const hunks: Hunk[] = [];
  let index = 0;

  while (index < ops.length) {
    if (ops[index].type === 'equal') {
      index++;
      continue;
    }
    // Found a change: walk back for leading context.
    let start = index;
    let contextUsed = 0;
    while (start > 0 && contextUsed < context && ops[start - 1].type === 'equal') {
      start--;
      contextUsed++;
    }

    // Walk forward, merging changes separated by <= 2*context equal lines.
    let end = index;
    while (end < ops.length) {
      if (ops[end].type !== 'equal') {
        end++;
        continue;
      }
      // Count consecutive equal lines ahead.
      let runEnd = end;
      while (runEnd < ops.length && ops[runEnd].type === 'equal') {
        runEnd++;
      }
      const runLength = runEnd - end;
      if (runEnd >= ops.length) {
        break; // trailing equal run at the end of file
      }
      if (runLength > context * 2) {
        break; // gap too large: hunk ends here
      }
      end = runEnd;
    }
    index = end;

    // Add trailing context.
    let trailingUsed = 0;
    while (index < ops.length && trailingUsed < context && ops[index].type === 'equal') {
      index++;
      trailingUsed++;
    }
    end = index;

    hunks.push(hunkFromRange(ops, start, end));
  }

  return hunks;
}

function hunkFromRange(ops: Op[], start: number, end: number): Hunk {
  const lines = ops.slice(start, end);
  let oldCount = 0;
  let newCount = 0;
  for (const op of lines) {
    if (op.type !== 'add') {
      oldCount++;
    }
    if (op.type !== 'remove') {
      newCount++;
    }
  }
  const first = lines[0];
  const last = lines[lines.length - 1];
  const oldStart = first.oldLine || first.newLine || 1;
  const newStart = first.newLine || first.oldLine || 1;
  void last;
  return { oldStart, oldCount, newStart, newCount, lines };
}

function renderHunk(hunk: Hunk): string {
  const header = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
  const body = hunk.lines.map((op) => {
    if (op.type === 'equal') {
      return ` ${op.line}`;
    }
    return op.type === 'add' ? `+${op.line}` : `-${op.line}`;
  });
  return [header, ...body].join('\n');
}
