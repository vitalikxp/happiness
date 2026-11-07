import { signal } from '@preact/signals';
import { stageOf, zoneIndexAt } from '../engine/index.ts';
import { content } from './content.ts';
import type { Session } from './session.ts';
import { isRecord, readJson, writeJson } from './storage.ts';

// First-game hints: short margin notes, each shown once, when its situation first comes up.

interface Hint {
  id: string;
  when: (s: Session) => boolean;
}

const me = (s: Session) => s.state.players.find((p) => p.id === s.human);
const owns = (s: Session, kind: string) =>
  me(s)?.tableau.some((c) => content.cards.get(c.cardId)?.kind === kind) ?? false;
const humanActions = (s: Session) => s.actions.filter((a) => a.player === s.human).length;

/** In the order they should be read when several apply. */
export const HINTS: readonly Hint[] = [
  { id: 'welcome', when: (s) => s.state.round === 1 },
  { id: 'market', when: (s) => s.state.round === 1 && humanActions(s) >= 2 },
  { id: 'goals', when: (s) => s.state.round === 1 && humanActions(s) >= 4 },
  { id: 'project', when: (s) => owns(s, 'basicProject') },
  { id: 'joy', when: (s) => (me(s)?.sth ?? 0) > 0 && owns(s, 'basicProject') },
  { id: 'adulthood', when: (s) => stageOf(content.rules, s.state.round) === 'adulthood' },
  { id: 'stress', when: (s) => zoneIndexAt(content.rules, me(s)?.stress ?? 0) >= 2 },
  { id: 'oldAge', when: (s) => stageOf(content.rules, s.state.round) === 'oldAge' },
];

const KEY = 'hints.v1';

function load(): Record<string, true> {
  const saved = readJson(KEY);
  return isRecord(saved) ? (saved as Record<string, true>) : {};
}

export const seenHints = signal<Record<string, true>>(load());

/** The first unseen hint whose situation holds now, if any. */
export function currentHint(s: Session): string | null {
  return HINTS.find((hint) => !seenHints.value[hint.id] && hint.when(s))?.id ?? null;
}

export function dismissHint(id: string): void {
  seenHints.value = { ...seenHints.value, [id]: true };
  writeJson(KEY, seenHints.value);
}

export function resetHints(): void {
  seenHints.value = {};
  writeJson(KEY, {});
}
