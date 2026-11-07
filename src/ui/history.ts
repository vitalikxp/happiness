import { signal } from '@preact/signals';
import { content, contentFingerprint } from './content.ts';
import type { GameRecord, Session } from './session.ts';
import { readJson, writeJson } from './storage.ts';
import { biography } from './story.ts';

// Personal records & life history (R-META-01): finished lives, newest first.

export interface LifeRecord {
  /** The game seed: one record per game. */
  id: string;
  /** ISO date and time the life was finished. */
  finishedAt: string;
  /** Content the game was played with; replay only works with the same one. */
  fingerprint: string;
  game: GameRecord;
  lth: number;
  /** 1-based place among all players. */
  place: number;
  players: number;
  solo: boolean;
  won: boolean;
  /** Round the human died in. */
  rounds: number;
  /** Written when the life ended, so it survives content changes. */
  biography: string[];
}

export interface Records {
  lives: number;
  wins: number;
  bestSolo: LifeRecord | null;
  bestVsBots: LifeRecord | null;
}

const KEY = 'history.v1';
/** Oldest lives are forgotten beyond this (a life with its action log is ~20–60 KB). */
export const HISTORY_LIMIT = 60;

function load(): LifeRecord[] {
  const saved = readJson(KEY);
  return Array.isArray(saved) ? (saved as LifeRecord[]) : [];
}

export const history = signal<LifeRecord[]>(load());

export function toRecord(s: Session): GameRecord {
  const { seed, setup, actions, rounds, human, profiles, bots, undos } = s;
  return { seed, setup, actions, rounds, human, profiles, bots, undos };
}

export function archiveLife(s: Session): void {
  const result = s.state.result;
  const me = s.state.players.find((p) => p.id === s.human);
  const profile = s.profiles[s.human];
  if (!result || !me || !profile) return;
  if (history.value.some((life) => life.id === s.seed)) return;
  const record: LifeRecord = {
    id: s.seed,
    finishedAt: new Date().toISOString(),
    fingerprint: contentFingerprint,
    game: toRecord(s),
    lth: me.lth,
    place: result.standings.findIndex((st) => st.player === s.human) + 1,
    players: s.state.players.length,
    solo: result.solo !== null,
    won: result.solo ? result.solo.won : result.winners.includes(s.human),
    rounds: me.death?.round ?? s.state.round,
    biography: biography(s.state, content, s.human, profile),
  };
  let next = [record, ...history.value].slice(0, HISTORY_LIMIT);
  // When storage is full, forget old lives until the new one fits.
  while (!writeJson(KEY, next) && next.length > 1) next = next.slice(0, -1);
  history.value = next;
}

export function records(lives: readonly LifeRecord[]): Records {
  const best = (filter: (life: LifeRecord) => boolean) =>
    lives.filter(filter).reduce<LifeRecord | null>((a, b) => (a && a.lth >= b.lth ? a : b), null);
  return {
    lives: lives.length,
    wins: lives.filter((life) => life.won).length,
    bestSolo: best((life) => life.solo),
    bestVsBots: best((life) => !life.solo),
  };
}

export const canReplay = (life: LifeRecord) => life.fingerprint === contentFingerprint;
