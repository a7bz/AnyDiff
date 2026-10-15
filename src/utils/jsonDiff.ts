/**
 * JSON/JSONC structural flattening, used to give a *semantic* diff for JSON
 * documents: instead of comparing text line by line (where reordering keys or
 * re-indenting produces noise), both sides are reduced to a sorted list of
 * `path = value` leaves. Diffing those lists with the native diff editor
 * highlights exactly which keys were added, removed or changed.
 */

export type JsonFlattenResult =
  | { ok: true; lines: string[] }
  | { ok: false; error: string };

/** Flattens a JSON (or JSONC) document into sorted `path = value` lines. */
export function flattenJson(text: string): JsonFlattenResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: true, lines: [] };
  }

  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch (error) {
    try {
      value = JSON.parse(stripJsonComments(trimmed));
    } catch {
      return { ok: false, error: messageOf(error) };
    }
  }

  const lines: string[] = [];
  flatten(value, '', lines);
  lines.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { ok: true, lines };
}

/** Renders the flattened form as text ready for a virtual document. */
export function flattenJsonToText(text: string): JsonFlattenResult & { text: string } {
  const result = flattenJson(text);
  if (!result.ok) {
    return { ...result, text: '' };
  }
  return { ...result, text: result.lines.join('\n') };
}

function flatten(value: unknown, path: string, out: string[]): void {
  if (value === null) {
    out.push(`${path} = null`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      if (path) {
        out.push(`${path} = []`);
      }
      return;
    }
    value.forEach((item, index) => flatten(item, `${path}[${index}]`, out));
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      if (path) {
        out.push(`${path} = {}`);
      }
      return;
    }
    for (const [key, child] of entries) {
      flatten(child, path ? `${path}.${key}` : key, out);
    }
    return;
  }
  out.push(`${path} = ${JSON.stringify(value)}`);
}

/** Removes `//` and `/* *\/` comments, honouring string literals. */
function stripJsonComments(text: string): string {
  let result = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (char === '\n') {
        inLine = false;
        result += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      result += char;
      if (char === '\\') {
        result += next ?? '';
        i++;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === '/' && next === '/') {
      inLine = true;
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlock = true;
      i++;
      continue;
    }
    result += char;
  }

  return result;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
