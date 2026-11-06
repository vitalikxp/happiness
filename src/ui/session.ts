import { computed, signal } from '@preact/signals';
import { botByName, PERSONALITIES } from '../ai/index.ts';
import {
  applyAction,
  createGame,
  nextFloat,
  seedRng,
  type Action,
  type GameSetup,
  type GameState,
  type PlayerId,
} from '../engine/index.ts';
import { content, pt } from './content.ts';

// The game being played in the browser: engine state plus flavor the engine doesn't know about
// (names, genders, heraldry — R-SET-08) and the bots' turn loop.

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

export interface Session {
  seed: string;
  setup: GameSetup;
  state: GameState;
  actions: Action[];
  human: PlayerId;
  profiles: Record<PlayerId, Profile>;
  /** Bot names (`greedy:<personality>`) by seat; the human has none. */
  bots: Record<PlayerId, string>;
}

export const session = signal<Session | null>(null);
/** Bots move quickly (or wait so the human can follow them). */
export const fastBots = signal(false);
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
  };
  const state = createGame(setup, content, seed);
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
    bots[player.id] = `greedy:${pick(PERSONALITIES.filter((p) => p !== 'balanced'))}`;
  }
  fastForward.value = false;
  session.value = {
    seed,
    setup,
    state,
    actions: [],
    human: state.players[0]?.id ?? 'p0',
    profiles,
    bots,
  };
  scheduleBots();
}

/** The human (or a bot) takes an action. */
export function play(action: Action): void {
  const s = session.value;
  if (!s) return;
  const { state } = applyAction(s.state, content, action);
  session.value = { ...s, state, actions: [...s.actions, action] };
  scheduleBots();
}

/** Let the bots finish the game without pauses (e.g. after the human's death). */
export function skipAhead(): void {
  fastForward.value = true;
  scheduleBots();
}

export function leaveGame(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  session.value = null;
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
  const delay = fastForward.value ? 0 : fastBots.value ? FAST_BOT_DELAY_MS : BOT_DELAY_MS;
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
