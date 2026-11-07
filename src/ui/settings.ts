import { effect, signal } from '@preact/signals';
import { isRecord, readJson, writeJson } from './storage.ts';

// Player preferences, kept between visits.

export const THEMES = ['auto', 'light', 'dark'] as const;
export const DIFFICULTIES = ['novice', 'greedy'] as const;
export type Theme = (typeof THEMES)[number];
/** Bot kind the opponents are made of (R-BOT-02). */
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Settings {
  theme: Theme;
  difficulty: Difficulty;
  /** Bots move quickly instead of pausing so the human can follow them. */
  fastBots: boolean;
}

const KEY = 'settings.v1';
const DEFAULTS: Settings = { theme: 'auto', difficulty: 'greedy', fastBots: false };

function load(): Settings {
  const saved = readJson(KEY);
  if (!isRecord(saved)) return DEFAULTS;
  const pick = <T>(values: readonly T[], value: unknown, fallback: T): T =>
    values.includes(value as T) ? (value as T) : fallback;
  return {
    theme: pick(THEMES, saved.theme, DEFAULTS.theme),
    difficulty: pick(DIFFICULTIES, saved.difficulty, DEFAULTS.difficulty),
    fastBots: typeof saved.fastBots === 'boolean' ? saved.fastBots : DEFAULTS.fastBots,
  };
}

export const settings = signal<Settings>(load());

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
  writeJson(KEY, settings.value);
}

/** `auto` follows the system; otherwise the page is forced light or dark (see main.css). */
effect(() => {
  const { theme } = settings.value;
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
});
