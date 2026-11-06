import type { CardId, RowId, RulesConfig, Stage } from '../content/index.ts';
import { shuffle } from './rng.ts';
import type { GameState } from './types.ts';

/** R-UPK-03, R-SOLO-01: number of face-up cards in a row. */
export function rowSize(rules: RulesConfig, row: RowId, stage: Stage, playerCount: number): number {
  const marketPlayers = playerCount === 1 ? rules.solo.marketPlayers : playerCount;
  if (row === 'jobs' || row === 'partners') return stage === 'youth' ? 0 : marketPlayers;
  const key = String(Math.min(marketPlayers, 4)) as keyof RulesConfig['marketSize'];
  return rules.marketSize[key];
}

/** Draw from the top; an empty deck is reshuffled from its discard pile first. */
export function draw(draft: GameState, row: RowId): CardId | null {
  const pile = draft.market[row];
  if (pile.deck.length === 0 && pile.discard.length > 0) {
    pile.deck = shuffle(draft.rng, pile.discard);
    pile.discard = [];
  }
  return pile.deck.shift() ?? null;
}

function discardSlots(draft: GameState, row: RowId): void {
  const pile = draft.market[row];
  for (const card of pile.slots) if (card !== null) pile.discard.push(card);
  pile.slots = [];
}

/** Replace a whole row with freshly drawn cards. */
export function redrawRow(draft: GameState, row: RowId, size: number): void {
  discardSlots(draft, row);
  for (let i = 0; i < size; i++) draft.market[row].slots.push(draw(draft, row));
}
