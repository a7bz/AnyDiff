import { describe, expect, it } from 'vitest';
import { extensionForLanguage, languageIdOf } from '../src/utils/language';

describe('languageIdOf', () => {
  it('maps common extensions', () => {
    expect(languageIdOf(uriFor('a/b.ts'))).toBe('typescript');
    expect(languageIdOf(uriFor('a/b.jsonc'))).toBe('jsonc');
    expect(languageIdOf(uriFor('a/b.py'))).toBe('python');
  });

  it('recognises special file names', () => {
    expect(languageIdOf(uriFor('Dockerfile'))).toBe('dockerfile');
    expect(languageIdOf(uriFor('Makefile'))).toBe('makefile');
  });

  it('falls back to plaintext', () => {
    expect(languageIdOf(uriFor('a/b.unknown'))).toBe('plaintext');
    expect(languageIdOf(uriFor('a/b.txt'))).toBe('plaintext');
  });
});

describe('extensionForLanguage', () => {
  it('round-trips through languageIdOf for mapped languages', () => {
    for (const language of ['typescript', 'python', 'json', 'markdown', 'shellscript']) {
      const extension = extensionForLanguage(language);
      expect(languageIdOf(uriFor(`file.${extension}`))).toBe(language);
    }
  });

  it('falls back to txt for unknown or missing languages', () => {
    expect(extensionForLanguage(undefined)).toBe('txt');
    expect(extensionForLanguage('not-a-language')).toBe('txt');
    expect(extensionForLanguage('plaintext')).toBe('txt');
  });
});

function uriFor(fsPath: string): { fsPath: string; path: string; scheme: string } {
  return { fsPath, path: fsPath, scheme: 'file' };
}
