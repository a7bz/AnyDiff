import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

interface PackageJson {
  contributes: {
    commands?: Array<{ command: string; title?: string; category?: string }>;
    configuration?: {
      properties?: Record<string, { markdownDescription?: string; description?: string }>;
    };
    walkthroughs?: Array<{
      id: string;
      title?: string;
      description?: string;
      steps?: Array<{ id: string; title?: string; description?: string }>;
    }>;
  };
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
}

function placeholders(value: string | undefined): string[] {
  return (value?.match(/%([^%]+)%/g) ?? []).map((token) => token.slice(1, -1));
}

/** Every `%key%` referenced anywhere in `contributes`. */
function usedKeys(pkg: PackageJson): Set<string> {
  const used = new Set<string>();
  for (const command of pkg.contributes.commands ?? []) {
    placeholders(command.title).forEach((k) => used.add(k));
    placeholders(command.category).forEach((k) => used.add(k));
  }
  for (const setting of Object.values(pkg.contributes.configuration?.properties ?? {})) {
    placeholders(setting.markdownDescription).forEach((k) => used.add(k));
    placeholders(setting.description).forEach((k) => used.add(k));
  }
  for (const walkthrough of pkg.contributes.walkthroughs ?? []) {
    placeholders(walkthrough.title).forEach((k) => used.add(k));
    placeholders(walkthrough.description).forEach((k) => used.add(k));
    for (const step of walkthrough.steps ?? []) {
      placeholders(step.title).forEach((k) => used.add(k));
      placeholders(step.description).forEach((k) => used.add(k));
    }
  }
  return used;
}

describe('package.nls localization', () => {
  const pkg = readJson('package.json') as PackageJson;
  const en = readJson('package.nls.json') as Record<string, string>;
  const zhCn = readJson('package.nls.zh-cn.json') as Record<string, string>;

  it('defines every key used by package.json in both catalogs', () => {
    const used = usedKeys(pkg);

    expect(used.size).toBeGreaterThan(0);
    for (const key of used) {
      expect(en[key], `en is missing "${key}"`).toBeTypeOf('string');
      expect(zhCn[key], `zh-cn is missing "${key}"`).toBeTypeOf('string');
      expect(en[key].trim(), `en.${key}`).not.toBe('');
      expect(zhCn[key].trim(), `zh-cn.${key}`).not.toBe('');
    }
  });

  it('has no unused keys in the catalogs', () => {
    const used = usedKeys(pkg);
    expect(Object.keys(en).sort()).toEqual([...used].sort());
    expect(Object.keys(zhCn).sort()).toEqual([...used].sort());
  });

  it('translates every key except brand names', () => {
    const brandKeys = new Set(['anydiff.command.category']);
    const localized = Object.keys(en).filter((key) => en[key] !== zhCn[key]);
    expect(localized.length).toBe(Object.keys(en).length - brandKeys.size);
  });
});
