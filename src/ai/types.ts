import type { ContentIndex } from '../content/index.ts';
import {
  seedRng,
  type Action,
  type GameState,
  type PlayerId,
  type RngState,
} from '../engine/index.ts';

/**
 * A bot picks one of the legal actions for `player` (R-BOT-01: public engine API and public
 * information only). Bots are stateless; their randomness comes from `botRng` (R-BOT-03).
 */
export interface Bot {
  readonly name: string;
  choose(state: GameState, content: ContentIndex, player: PlayerId): Action;
}

/** A bot's own RNG stream for this decision: separate from the game RNG, reproducible by seed. */
export function botRng(state: GameState, player: PlayerId): RngState {
  return seedRng(`${state.seed}:bot:${player}:${String(state.log.length)}`);
}

/** Refreshing rows and discarding don't end the turn; bots skip them unless nothing else is left. */
export function turnActions(legal: Action[]): Action[] {
  const real = legal.filter((a) => a.type !== 'refreshRow' && a.type !== 'discardCard');
  return real.length > 0 ? real : legal;
}
