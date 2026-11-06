import type { ContentIndex, Cost, Reward } from '../content/index.ts';
import {
  canAfford,
  findInTableau,
  lthSourceOf,
  pay,
  removeFromTableau,
  toDiscard,
} from './cards.ts';
import { applyReward } from './effects.ts';
import { clockwiseFrom, emit, getPlayer } from './state.ts';
import { addStress, changeSth } from './tracks.ts';
import type { GameState, IllegalReason, LthSource, PlayerState, TableauCard } from './types.ts';

// Upkeep payments (R-UPK-06, R-UPK-07): each player resolves their cards one at a time.

export interface Upkeep {
  cost: Cost;
  reward: Reward;
  source: LthSource;
}

/** The upkeep a tableau card asks for this round, if any (R-ITM-02, R-JOB-03, R-REL-04). */
export function upkeepOf(content: ContentIndex, entry: TableauCard): Upkeep | null {
  const card = content.cards.get(entry.cardId);
  if (!card) return null;
  const source = lthSourceOf(card.kind);
  switch (card.kind) {
    case 'job':
      return { ...card.upkeep, source };
    case 'item':
    case 'partner': {
      const upkeep = card.levels[(entry.level ?? 1) - 1]?.upkeep;
      return upkeep ? { ...upkeep, source } : null;
    }
    default:
      return null;
  }
}

const upkeepCards = (content: ContentIndex, player: PlayerState) =>
  player.tableau
    .filter((entry) => upkeepOf(content, entry) !== null)
    .map((entry) => entry.instanceId);

/**
 * Start the decisions part of Upkeep. Returns false when nobody has upkeep to resolve
 * (the caller then starts the Action phase).
 */
export function beginUpkeepDecisions(draft: GameState, content: ContentIndex): boolean {
  const queue = clockwiseFrom(draft, draft.firstPlayer)
    .filter((p) => p.alive && upkeepCards(content, p).length > 0)
    .map((p) => p.id);
  return pendNext(draft, content, queue);
}

function pendNext(draft: GameState, content: ContentIndex, queue: string[]): boolean {
  for (const [i, id] of queue.entries()) {
    const player = getPlayer(draft, id);
    const remaining = player.alive ? upkeepCards(content, player) : [];
    if (remaining.length > 0) {
      draft.phase = 'upkeep';
      draft.pending = { type: 'upkeep', player: id, remaining, queue: queue.slice(i + 1) };
      return true;
    }
  }
  draft.pending = null;
  return false;
}

export function validateUpkeep(
  state: GameState,
  content: ContentIndex,
  player: PlayerState,
  instanceId: string,
  paying: boolean,
): IllegalReason[] {
  if (state.pending?.type !== 'upkeep') return [{ code: 'wrongPhase' }];
  if (state.pending.player !== player.id) return [{ code: 'notYourTurn' }];
  const entry = state.pending.remaining.includes(instanceId)
    ? findInTableau(player, instanceId)
    : null;
  const upkeep = entry ? upkeepOf(content, entry) : null;
  if (!upkeep) return [{ code: 'notAnOption' }];
  return paying && !canAfford(player, upkeep.cost) ? [{ code: 'cannotAfford' }] : [];
}

/** Pay or refuse one card's upkeep. Returns false when Upkeep is over for everyone. */
export function resolveUpkeep(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  instanceId: string,
  paying: boolean,
): boolean {
  const pending = draft.pending;
  if (pending?.type !== 'upkeep') return false;
  const entry = findInTableau(player, instanceId);
  const upkeep = entry ? upkeepOf(content, entry) : null;
  if (entry && upkeep) {
    if (paying) {
      pay(draft, player, upkeep.cost);
      emit(draft, { type: 'upkeepPaid', player: player.id, instanceId, cardId: entry.cardId });
      applyReward(draft, content.rules, player, upkeep.reward, upkeep.source);
    } else {
      // R-UPK-07: discard, Stress and STH penalty.
      const { rules } = content;
      removeFromTableau(player, instanceId);
      toDiscard(draft, content, entry.cardId);
      emit(draft, { type: 'upkeepRefused', player: player.id, cardId: entry.cardId });
      changeSth(draft, rules, player, -rules.upkeepFailure.sth);
      addStress(draft, rules, player, rules.upkeepFailure.stress, 'upkeepFailure');
    }
  }
  const remaining = player.alive ? pending.remaining.filter((id) => id !== instanceId) : [];
  if (remaining.length > 0) {
    draft.pending = { ...pending, remaining };
    return true;
  }
  return pendNext(draft, content, pending.queue);
}
