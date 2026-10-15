import { describe, expect, it } from 'vitest';
import { flattenJson, flattenJsonToText } from '../src/utils/jsonDiff';

describe('flattenJson', () => {
  it('flattens nested objects into dotted paths', () => {
    const result = flattenJson('{"b": 2, "a": {"c": 3}}');
    expect(result.ok).toBe(true);
    expect(result.ok && result.lines).toEqual(['a.c = 3', 'b = 2']);
  });

  it('sorts lines so key order does not matter', () => {
    const left = flattenJson('{"z": 1, "a": 2}');
    const right = flattenJson('{"a": 2, "z": 1}');
    expect(left.ok && left.lines).toEqual(right.ok && right.lines);
  });

  it('indexes array elements', () => {
    const result = flattenJson('{"items": [{"id": 1}, {"id": 2}]}');
    expect(result.ok && result.lines).toEqual(['items[0].id = 1', 'items[1].id = 2']);
  });

  it('represents empty containers explicitly', () => {
    const result = flattenJson('{"a": [], "b": {}}');
    expect(result.ok && result.lines).toEqual(['a = []', 'b = {}']);
  });

  it('distinguishes a missing key from a null value', () => {
    const withNull = flattenJson('{"a": null}');
    const without = flattenJson('{}');
    expect(withNull.ok && withNull.lines).toEqual(['a = null']);
    expect(without.ok && without.lines).toEqual([]);
  });

  it('treats an empty document as empty', () => {
    const result = flattenJson('   ');
    expect(result).toEqual({ ok: true, lines: [] });
  });

  it('reports invalid JSON', () => {
    const result = flattenJson('{ not json');
    expect(result.ok).toBe(false);
  });

  it('accepts JSONC comments', () => {
    const result = flattenJson('{\n  // comment\n  "a": 1 /* inline */\n}');
    expect(result.ok && result.lines).toEqual(['a = 1']);
  });

  it('does not strip comment-like text inside strings', () => {
    const result = flattenJson('{"url": "http://example.com//x"}');
    expect(result.ok && result.lines).toEqual(['url = "http://example.com//x"']);
  });

  it('exposes the joined text form', () => {
    const result = flattenJsonToText('{"b": 1, "a": 2}');
    expect(result.ok).toBe(true);
    expect(result.text).toBe('a = 2\nb = 1');
  });
});
