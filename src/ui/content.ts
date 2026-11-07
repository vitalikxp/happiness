import { loadPack, type ContentIndex } from '../content/index.ts';
import { fantasyPack } from '../content/packs/fantasy/index.ts';
import { format } from './i18n/index.ts';

// The content pack the UI plays, and lookups of its texts (docs/CONTENT.md §6).

export const content: ContentIndex = loadPack(fantasyPack);
const texts: Record<string, string> = fantasyPack.locales.ru;

/** Pack text by key, with `{param}` substitution; falls back to the key. */
export function pt(key: string, params?: Record<string, string | number>): string {
  const template = texts[key] ?? key;
  return params ? format(template, params) : template;
}

export function hasText(key: string): boolean {
  return key in texts;
}

export const cardName = (id: string) => pt(`${id}.name`);
export const levelName = (id: string, level: number) => pt(`${id}.l${String(level)}`);
export const roleName = (id: string, role: number) => pt(`${id}.role${String(role + 1)}`);
export const partnerName = (id: string, version: 0 | 1) => pt(`${id}.v${String(version)}.name`);

/**
 * Hash of the pack's rules and cards (texts excluded). A saved game or an archived life can only
 * be replayed by the same content: same seed + log ⇒ same state holds per fingerprint.
 */
export const contentFingerprint: string = fnv1a(JSON.stringify({ ...fantasyPack, locales: null }));

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
