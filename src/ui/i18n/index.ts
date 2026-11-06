import { signal } from '@preact/signals';
import { en } from './locales/en.ts';
import { ru } from './locales/ru.ts';

export type MessageKey = keyof typeof ru;
/** Non-default locales may be incomplete; missing keys fall back (see `translate`). */
export type Messages = Partial<Record<MessageKey, string>>;
export type Locale = 'ru' | 'en';

export const DEFAULT_LOCALE: Locale = 'ru';
export const FALLBACK_LOCALE: Locale = 'en';
export const LOCALES: readonly Locale[] = ['ru', 'en'];

const catalogs: Record<Locale, Messages> = { ru, en };

/** Lookup order: requested locale → fallback (en) → default (ru) → the key itself. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template =
    catalogs[locale][key] ?? catalogs[FALLBACK_LOCALE][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  return params ? format(template, params) : template;
}

/** Replace `{name}` placeholders; unknown placeholders are left as is. */
export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export const locale = signal<Locale>(DEFAULT_LOCALE);

/** Translate with the current UI locale; components re-render when `locale` changes. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(locale.value, key, params);
}
