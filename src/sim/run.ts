import type { Bot } from '../ai/index.ts';
import type { ContentIndex } from '../content/index.ts';
import { applyAction, createGame, type GameState } from '../engine/index.ts';

const MAX_STEPS = 10_000;

/** Play one bot-only game to the end. Seat i is played by `bots[i]`. */
export function runGame(content: ContentIndex, bots: readonly Bot[], seed: string): GameState {
  let state = createGame({ players: bots.map(() => ({ kind: 'bot' as const })) }, content, seed);
  for (let step = 0; state.phase !== 'gameOver'; step++) {
    if (step >= MAX_STEPS)
      throw new Error(`Game ${seed} did not finish in ${String(MAX_STEPS)} steps`);
    const actor = state.pending?.player ?? state.current;
    const seat = state.players.findIndex((p) => p.id === actor);
    const bot = bots[seat];
    if (!actor || !bot) throw new Error(`Nobody to act in game ${seed} (phase ${state.phase})`);
    state = applyAction(state, content, bot.choose(state, content, actor)).state;
  }
  return state;
}
