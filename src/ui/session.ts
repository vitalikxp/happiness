import { computed, signal } from '@preact/signals';
import { botByName, PERSONALITIES } from '../ai/index.ts';
import {
  applyAction,
  createGame,
  nextFloat,
  replay,
  seedRng,
  type Action,
  type GameSetup,
  type GameState,
  type PlayerId,
} from '../engine/index.ts';
import { content, contentFingerprint, pt } from './content.ts';
import { awardAchievements, unlockedCards } from './achievements.ts';
import { archiveLife, toRecord } from './history.ts';
import { settings } from './settings.ts';
import { isRecord, readJson, remove, writeJson } from './storage.ts';

// The game being played in the browser: engine state plus flavor the engine doesn't know about
// (names, genders, heraldry — R-SET-08), the bots' turn loop, autosave and undo.

export const TINCTURES = ['azure', 'gules', 'vert', 'purpure', 'sable', 'or'] as const;
export const CHARGES = ['star', 'crescent', 'cross', 'roundel', 'chevron', 'lozenge'] as const;
export type Tincture = (typeof TINCTURES)[number];
export type Charge = (typeof CHARGES)[number];

export interface Profile {
  name: string;
  gender: 'f' | 'm';
  tincture: Tincture;
  charge: Charge;
}

/** Everything needed to rebuild a game: the engine state follows from seed + actions. */
export interface GameRecord {
  seed: string;
  setup: GameSetup;
  actions: Action[];
  /** Round in which each action was taken (undo stays within the round). */
  rounds: number[];
  human: PlayerId;
  profiles: Record<PlayerId, Profile>;
  /** Bot names (`greedy:<personality>`, `novice:<personality>`) by seat; the human has none. */
  bots: Record<PlayerId, string>;
  /** How many times the human took a move back. */
  undos: number;
}

export interface Session extends GameRecord {
  state: GameState;
}

export const session = signal<Session | null>(null);
/** Skip bot animation entirely, e.g. after the human has died. */
export const fastForward = signal(false);

export const actor = computed(() => {
  const s = session.value?.state;
  return s ? (s.pending?.player ?? s.current) : null;
});

export const isHumanTurn = computed(() => {
  const s = session.value;
  return s !== null && actor.value === s.human;
});

const BOT_DELAY_MS = 650;
const FAST_BOT_DELAY_MS = 120;

/** Start a new life: the human is seat 0, opponents are greedy bots with random personalities. */
export function startGame(profile: Profile, opponents: number, seed = randomSeed()): void {
  const rng = seedRng(`${seed}:table`);
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(nextFloat(rng) * items.length)];
    if (item === undefined) throw new Error('empty list');
    return item;
  };
  const setup: GameSetup = {
    players: [
      { kind: 'human' },
      ...Array.from({ length: opponents }, () => ({ kind: 'bot' as const })),
    ],
    unlocked: unlockedCards(),
  };
  const state = createGame(setup, content, seed);
  const difficulty = settings.value.difficulty;
  const profiles: Record<PlayerId, Profile> = { [state.players[0]?.id ?? 'p0']: profile };
  const bots: Record<PlayerId, string> = {};
  const freeTinctures = TINCTURES.filter((t) => t !== profile.tincture);
  const usedNames = new Set([profile.name]);
  for (const player of state.players.slice(1)) {
    const gender = nextFloat(rng) < 0.5 ? 'f' : 'm';
    let name = pt(`npc.${gender}.${String(1 + Math.floor(nextFloat(rng) * 6))}`);
    while (usedNames.has(name))
      name = pt(`npc.${gender}.${String(1 + Math.floor(nextFloat(rng) * 6))}`);
    usedNames.add(name);
    const tincture =
      freeTinctures.splice(Math.floor(nextFloat(rng) * freeTinctures.length), 1)[0] ?? 'sable';
    profiles[player.id] = { name, gender, tincture, charge: pick(CHARGES) };
    bots[player.id] = `${difficulty}:${pick(PERSONALITIES.filter((p) => p !== 'balanced'))}`;
  }
  fastForward.value = false;
  setSession({
    seed,
    setup,
    state,
    actions: [],
    rounds: [],
    human: state.players[0]?.id ?? 'p0',
    profiles,
    bots,
    undos: 0,
  });
}

/** The human (or a bot) takes an action. */
export function play(action: Action): void {
  const s = session.value;
  if (!s) return;
  const { state } = applyAction(s.state, content, action);
  setSession({
    ...s,
    state,
    actions: [...s.actions, action],
    rounds: [...s.rounds, s.state.round],
  });
}

/** Index of the human's latest action that may still be taken back, or -1. */
function undoPoint(s: Session): number {
  const me = s.state.players.find((p) => p.id === s.human);
  if (s.state.phase === 'gameOver' || !me?.alive) return -1;
  for (let i = s.actions.length - 1; i >= 0; i--) {
    if (s.rounds[i] !== s.state.round) return -1;
    if (s.actions[i]?.player === s.human) return i;
  }
  return -1;
}

/** Undo within the round: the human's last action and the bots' replies to it go back. */
export const canUndo = computed(() => {
  const s = session.value;
  return s !== null && undoPoint(s) >= 0;
});

export function undo(): void {
  const s = session.value;
  if (!s) return;
  const point = undoPoint(s);
  if (point < 0) return;
  const actions = s.actions.slice(0, point);
  setSession({
    ...s,
    state: replay(s.setup, content, s.seed, actions),
    actions,
    rounds: s.rounds.slice(0, point),
    undos: s.undos + 1,
  });
}

/** Let the bots finish the game without pauses (e.g. after the human's death). */
export function skipAhead(): void {
  fastForward.value = true;
  scheduleBots();
}

/** Back to the title page; an unfinished life stays saved and can be continued. */
export function leaveGame(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  session.value = null;
}

function setSession(next: Session): void {
  session.value = next;
  if (next.state.phase === 'gameOver') {
    archiveLife(next);
    awardAchievements(next.state, next.human, next.seed);
    remove(SAVE_KEY);
  } else {
    writeJson(SAVE_KEY, { fingerprint: contentFingerprint, game: toRecord(next) });
  }
  scheduleBots();
}

// Autosave (R-META-01 keeps finished lives; this keeps the one being lived).

const SAVE_KEY = 'save.v1';

/** The saved unfinished life, if it can still be replayed by this version of the game. */
export function savedGame(): Session | null {
  const saved = readJson(SAVE_KEY);
  if (!isRecord(saved) || saved.fingerprint !== contentFingerprint || !isRecord(saved.game)) {
    return null;
  }
  return restore(saved.game as unknown as GameRecord);
}

/** Rebuild a game from its record; null if the record doesn't replay. */
export function restore(record: GameRecord): Session | null {
  try {
    const state = replay(record.setup, content, record.seed, record.actions);
    return { ...record, state };
  } catch {
    return null;
  }
}

export function continueGame(saved: Session): void {
  fastForward.value = false;
  setSession(saved);
}

export function discardSavedGame(): void {
  remove(SAVE_KEY);
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** While a bot is to act, let it move after a short pause so the human can follow the story. */
function scheduleBots(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  const s = session.value;
  const who = actor.value;
  if (!s || s.state.phase === 'gameOver' || who === null || who === s.human) return;
  const bot = botByName(s.bots[who] ?? 'greedy');
  const delay = fastForward.value ? 0 : settings.value.fastBots ? FAST_BOT_DELAY_MS : BOT_DELAY_MS;
  timer = setTimeout(() => {
    timer = null;
    const current = session.value;
    if (current !== s) return;
    play(bot.choose(current.state, content, who));
  }, delay);
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
