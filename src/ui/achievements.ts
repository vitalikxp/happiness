import { signal } from '@preact/signals';
import { earnedAchievements, type GameState, type PlayerId } from '../engine/index.ts';
import { content } from './content.ts';
import { isRecord, readJson, writeJson } from './storage.ts';

// Earned achievements (R-META-02) and the cards they unlock for new games (R-META-03).

export interface Earned {
  /** ISO date and time. */
  at: string;
  /** Seed of the life that earned it. */
  life: string;
}

const KEY = 'achievements.v1';

function load(): Record<string, Earned> {
  const saved = readJson(KEY);
  return isRecord(saved) ? (saved as Record<string, Earned>) : {};
}

export const earned = signal<Record<string, Earned>>(load());

/** Record what a finished life earned; returns the ids earned for the first time. */
export function awardAchievements(state: GameState, player: PlayerId, life: string): string[] {
  const fresh = earnedAchievements(state, content, player).filter((id) => !earned.value[id]);
  if (fresh.length === 0) return [];
  const at = new Date().toISOString();
  earned.value = { ...earned.value, ...Object.fromEntries(fresh.map((id) => [id, { at, life }])) };
  writeJson(KEY, earned.value);
  return fresh;
}

/** Unlockable cards the player has opened, for `GameSetup.unlocked`. */
export function unlockedCards(): string[] {
  return content.achievements.filter((a) => earned.value[a.id]).flatMap((a) => a.unlocks ?? []);
}
