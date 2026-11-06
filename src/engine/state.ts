import { STAGES, type RulesConfig, type Stage } from '../content/index.ts';
import type { GameEvent, GameState, PlayerId, PlayerState } from './types.ts';

// Internal helpers. Functions taking a `draft` mutate it; the public API clones state first.

export function getPlayer(state: GameState, id: PlayerId): PlayerState {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player ${id}`);
  return player;
}

export function emit(draft: GameState, event: GameEvent): void {
  draft.log.push(event);
}

export function stageOf(rules: RulesConfig, round: number): Stage {
  const stage = STAGES.find((s) => round >= rules.stages[s][0] && round <= rules.stages[s][1]);
  if (!stage) throw new Error(`Round ${String(round)} is outside of all life stages`);
  return stage;
}

/** Players in clockwise order starting with `from` (inclusive). */
export function clockwiseFrom(state: GameState, from: PlayerId): PlayerState[] {
  const start = state.players.findIndex((p) => p.id === from);
  return state.players.map(
    (_, i) => state.players[(start + i) % state.players.length] as PlayerState,
  );
}
