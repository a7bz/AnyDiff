import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { __setConfig, __setUiLanguage } from './__mocks__/vscode';
import en, { type MessageKey } from '../src/i18n/messages/en';
import zhCn from '../src/i18n/messages/zh-cn';
import { initI18n, locale, resolveLocale, t } from '../src/i18n';

const SRC = path.resolve(__dirname, '..', 'src');

/** Every `.ts` file under `src/`, excluding the catalogs themselves. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'i18n') {
        out.push(...sourceFiles(full));
      }
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('catalog integrity', () => {
  it('zh-cn defines exactly the same keys as en', () => {
    expect(Object.keys(zhCn).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses every key somewhere in the source', () => {
    const blob = sourceFiles(SRC)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    const unused = (Object.keys(en) as MessageKey[]).filter((key) => !blob.includes(`'${key}'`));
    expect(unused, `unused message keys: ${unused.join(', ')}`).toEqual([]);
  });

  it('has no empty strings in any locale', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `en.${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(zhCn)) {
      expect(value.trim(), `zh-cn.${key}`).not.toBe('');
    }
  });

  it('uses the same placeholders in every locale', () => {
    const placeholders = (text: string): string[] => (text.match(/\{\d+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(zhCn[key]), `placeholders for "${key}"`).toEqual(placeholders(en[key]));
    }
  });
});

describe('resolveLocale', () => {
  it('maps zh tags to zh-cn', () => {
    expect(resolveLocale('zh-cn')).toBe('zh-cn');
    expect(resolveLocale('zh-CN')).toBe('zh-cn');
    expect(resolveLocale('zh-tw')).toBe('zh-cn');
  });

  it('falls back to en for anything else', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('de')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});

describe('initI18n + t', () => {
  it('follows the VSCode UI language in auto mode', () => {
    __setConfig({ language: 'auto' });
    __setUiLanguage('zh-cn');
    initI18n();
    expect(locale()).toBe('zh-cn');
    expect(t('picker.browse')).toBe('浏览…');
  });

  it('honours an explicit locale over the UI language', () => {
    __setConfig({ language: 'en' });
    __setUiLanguage('zh-cn');
    initI18n();
    expect(locale()).toBe('en');
    expect(t('picker.browse')).toBe('Browse…');
  });

  it('substitutes {0}, {1}… in order', () => {
    __setConfig({ language: 'zh-cn' });
    initI18n();
    expect(t('git.pickTitle', 'index.ts')).toBe('AnyDiff: 将 index.ts 与以下版本对比');
    expect(t('stats.statusBar', 'a', 'b', 3, 1, 9)).toBe('AnyDiff: a ↔ b — +3 / -1 行（9 行未变化）');
  });

  it('leaves unknown placeholders untouched', () => {
    __setConfig({ language: 'en' });
    initI18n();
    expect(t('error.fileNotFound', 'x.ts')).toContain('x.ts');
    expect(t('error.fileNotFound')).toContain('{0}');
  });
});
