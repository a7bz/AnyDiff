import { describe, expect, it } from 'vitest';
import { createNonce, escapeHtml } from '../src/views/webview';

describe('createNonce', () => {
  it('returns a 32-character alphanumeric value', () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it('does not repeat itself', () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that could break out of markup', () => {
    expect(escapeHtml(`<a href="x">it's & more</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;it&#39;s &amp; more&lt;/a&gt;',
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});
