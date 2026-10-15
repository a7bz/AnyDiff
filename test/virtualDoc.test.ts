import { describe, expect, it } from 'vitest';
import { VIRTUAL_SCHEME, VirtualDocProvider } from '../src/providers/virtualDocProvider';
import { extensionForLanguage } from '../src/utils/language';
import { __closeDocument } from './__mocks__/vscode';

describe('VirtualDocProvider', () => {
  it('serves registered content', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('hello', 'Clipboard', 'plaintext');
    expect(uri.scheme).toBe(VIRTUAL_SCHEME);
    expect(provider.provideTextDocumentContent(uri)).toBe('hello');
    provider.dispose();
  });

  it('remembers the language of a document', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('const x = 1', 'Selection', 'typescript');
    expect(provider.languageOf(uri)).toBe('typescript');
    provider.dispose();
  });

  it('falls back to plaintext when no language is given', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('x', 'Clipboard');
    expect(provider.languageOf(uri)).toBe('plaintext');
    provider.dispose();
  });

  it('derives the uri extension from the language', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('x', 'Selection', 'python');
    expect(uri.path.endsWith(`.${extensionForLanguage('python')}`)).toBe(true);
    provider.dispose();
  });

  it('gives every document a distinct uri', () => {
    const provider = new VirtualDocProvider();
    const first = provider.register('a', 'Clipboard');
    const second = provider.register('b', 'Clipboard');
    expect(first.toString()).not.toBe(second.toString());
    provider.dispose();
  });

  it('sanitises path-hostile characters in the title', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('x', 'a/b:c*d?e"f<g>h|i#j');
    expect(uri.path).not.toMatch(/[:*?"<>|#?]/);
    provider.dispose();
  });

  it('updates registered content', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('before', 'Manual input', 'plaintext');
    provider.update(uri, 'after');
    expect(provider.provideTextDocumentContent(uri)).toBe('after');
    provider.dispose();
  });

  it('ignores updates for unknown documents', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('keep', 'Manual input');
    provider.update(
      { scheme: VIRTUAL_SCHEME, path: '/unknown/1.txt', fsPath: 'unknown' } as never,
      'ignored',
    );
    expect(provider.provideTextDocumentContent(uri)).toBe('keep');
    provider.dispose();
  });

  it('returns empty text for an unknown uri', () => {
    const provider = new VirtualDocProvider();
    const uri = { scheme: VIRTUAL_SCHEME, path: '/nope/1.txt', fsPath: 'nope' } as never;
    expect(provider.provideTextDocumentContent(uri)).toBe('');
    provider.dispose();
  });

  it('creates a DiffSource whose text matches the content', async () => {
    const provider = new VirtualDocProvider();
    const source = provider.createSource('body', 'Clipboard', 'typescript');
    expect(source.title).toBe('Clipboard');
    expect(source.languageId).toBe('typescript');
    expect(await source.text?.()).toBe('body');
    provider.dispose();
  });

  it('drops content on dispose', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('gone', 'Clipboard');
    provider.dispose();
    expect(provider.provideTextDocumentContent(uri)).toBe('');
  });

  it('releases content when its editor closes', () => {
    const provider = new VirtualDocProvider();
    const uri = provider.register('temp', 'Clipboard', 'plaintext');
    expect(provider.provideTextDocumentContent(uri)).toBe('temp');
    __closeDocument(uri);
    expect(provider.provideTextDocumentContent(uri)).toBe('');
    expect(provider.languageOf(uri)).toBe('plaintext');
    provider.dispose();
  });
});
