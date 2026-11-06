// Helpers for engine tests (not part of the public API).
import type { BoardSpaceId } from '../content/index.ts';
import { loadPack } from '../content/index.ts';
import { coreTestPack } from '../content/packs/core-test/index.ts';
import { applyAction, createGame, getLegalActions } from './game.ts';
import type { Action, GameSetup, GameState, PlayerId, PlayerState } from './types.ts';

export const content = loadPack(coreTestPack);
export const rules = content.rules;

export function setupFor(players: number, kinds: ('human' | 'bot')[] = []): GameSetup {
  return {
    players: Array.from({ length: players }, (_, i) => ({
      kind: kinds[i] ?? (i === 0 ? 'human' : 'bot'),
    })),
  };
}

export function act(state: GameState, action: Action): GameState {
  return applyAction(state, content, action).state;
}

/** A game past setup: every player kept the first offered Child Trait. */
export function startedGame(players = 1, seed = 'test'): GameState {
  let state = createGame(setupFor(players), content, seed);
  while (state.pending?.type === 'chooseChildTrait') {
    const player = state.pending.player;
    state = act(state, {
      type: 'chooseChildTrait',
      player,
      card: playerOf(state, player).traitOffer[0] ?? '',
    });
  }
  return state;
}

export function playerOf(state: GameState, id: PlayerId): PlayerState {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`No player ${id}`);
  return player;
}

export function currentPlayer(state: GameState): PlayerId {
  if (state.current === null) throw new Error('Nobody to act');
  return state.current;
}

/** Place the current player's Time on `space`. */
export function place(state: GameState, space: BoardSpaceId): GameState {
  return act(state, { type: 'placeTime', player: currentPlayer(state), space });
}

/** Returns a modified copy — for arranging test scenarios. */
export function edit(state: GameState, change: (draft: GameState) => void): GameState {
  const draft = structuredClone(state);
  change(draft);
  return draft;
}

const CALM_SPACES: BoardSpaceId[] = ['study', 'play', 'interact', 'tempJob', 'rest'];

/** Stress-free policy: a basic space not used yet this round, otherwise Rest. */
export function calmAction(state: GameState): Action {
  const player = currentPlayer(state);
  const space = CALM_SPACES.find((s) => !state.placements[s].includes(player)) ?? 'rest';
  return { type: 'placeTime', player, space };
}

/** Play the current round to its end with `policy`. */
export function finishRound(state: GameState, policy = calmAction): GameState {
  const round = state.round;
  let next = state;
  while (next.phase === 'action' && next.round === round) next = act(next, policy(next));
  return next;
}

/** Play until game over with `policy`, guarding against endless loops. */
export function playToEnd(state: GameState, policy = calmAction, maxSteps = 5000): GameState {
  let next = state;
  for (let step = 0; next.phase !== 'gameOver'; step++) {
    if (step >= maxSteps) throw new Error('Game did not finish');
    next = act(next, policy(next));
  }
  return next;
}

export function legal(state: GameState): Action[] {
  return state.current === null ? [] : getLegalActions(state, content, state.current);
}
