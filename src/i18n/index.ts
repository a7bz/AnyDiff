import * as vscode from 'vscode';
import en, { type MessageKey, type Messages } from './messages/en';
import zhCn from './messages/zh-cn';

export type Locale = 'en' | 'zh-cn';

const catalogs: Record<Locale, Messages> = {
  en,
  'zh-cn': zhCn,
};

/** VSCode language tag → supported locale. */
export function resolveLocale(tag: string | undefined): Locale {
  const normalized = (tag ?? '').toLowerCase();
  if (normalized.startsWith('zh')) {
    return 'zh-cn';
  }
  return 'en';
}

/** Locale explicitly configured by the user, or 'auto'. */
export function configuredLocale(): Locale | 'auto' {
  return vscode.workspace.getConfiguration('anydiff').get<'auto' | Locale>('language', 'auto');
}

let current: Locale = 'en';
let currentMessages: Messages = catalogs.en;

/** Initializes the catalog from settings + the VSCode UI language. */
export function initI18n(): void {
  const configured = configuredLocale();
  current = configured === 'auto' ? resolveLocale(vscode.env.language) : configured;
  currentMessages = catalogs[current] ?? catalogs.en;
}

/** Re-evaluates the active locale (call when the setting changes). */
export function refreshI18n(): void {
  initI18n();
}

export function locale(): Locale {
  return current;
}

/**
 * Translates a key and substitutes `{0}`, `{1}`, … placeholders.
 * Unknown keys fall back to English so a missing string is never fatal.
 */
export function t(key: MessageKey, ...args: Array<string | number>): string {
  const template = currentMessages[key] ?? catalogs.en[key] ?? String(key);
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? match : String(value);
  });
}
