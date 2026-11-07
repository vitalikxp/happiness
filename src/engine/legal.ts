import {
  BOARD_SPACES,
  RESOURCES,
  ROWS,
  type BoardSpaceId,
  type ContentIndex,
  type ResourceBundle,
  type ResourceId,
} from '../content/index.ts';
import { marketChoices, needsChoice } from './cardActions.ts';
import { cardOf, isOneRound } from './cards.ts';
import type { Action, GameState, PlayerState, SpaceChoice } from './types.ts';

// Candidate actions for `getLegalActions`; the caller filters them through `validate`.

const SPACE_OF: Record<SpaceChoice['kind'], BoardSpaceId> = {
  project: 'takeProject',
  joinGroup: 'takeProject',
  spend: 'spend',
  job: 'getJob',
  startRelationship: 'developRelationship',
  advanceRelationship: 'developRelationship',
};

export function candidateActions(
  state: GameState,
  content: ContentIndex,
  self: PlayerState,
): Action[] {
  const player = self.id;
  if (state.phase === 'setup') {
    return self.traitOffer.map((card) => ({ type: 'chooseChildTrait', player, card }));
  }
  if (state.pending?.type === 'upkeep') {
    return state.pending.remaining.flatMap((instanceId): Action[] => [
      { type: 'payUpkeep', player, instanceId },
      { type: 'refuseUpkeep', player, instanceId },
    ]);
  }
  if (state.phase !== 'action' || state.current !== player) return [];

  const ownChoices: SpaceChoice[] = self.tableau
    .filter((c) => content.cards.get(c.cardId)?.kind === 'partner')
    .map((c) => ({ kind: 'advanceRelationship', instanceId: c.instanceId }));

  return [
    ...BOARD_SPACES.filter((space) => !needsChoice(space)).map((space): Action => ({
      type: 'placeTime',
      player,
      space,
    })),
    ...[...marketChoices(state, content), ...ownChoices].map((choice): Action => ({
      type: 'placeTime',
      player,
      space: SPACE_OF[choice.kind],
      choice,
    })),
    ...self.tableau.flatMap((entry): Action[] => {
      const card = content.cards.get(entry.cardId);
      if (card?.kind === 'basicProject') {
        const next = card.levels[entry.level ?? 4];
        if (!next) return [];
        return sthAllocations(next.cost, self.sth).map((sthAllocation) => ({
          type: 'advanceProject',
          player,
          instanceId: entry.instanceId,
          sthAllocation,
        }));
      }
      if (card?.kind === 'job') {
        return state.market.jobs.slots
          .filter((id) => id !== null && cardOf(content, id, ['job'])?.track === card.track)
          .map((id) => ({ type: 'promote', player, instanceId: entry.instanceId, card: id ?? '' }));
      }
      return [];
    }),
    ...ROWS.map((row): Action => ({ type: 'refreshRow', player, row })),
    ...self.tableau
      .filter((c) => !isOneRound(content, c.cardId))
      .map((c): Action => ({ type: 'discardCard', player, instanceId: c.instanceId })),
  ];
}

/**
 * All ways to spread the STH effect over a cost (R-STH-02): positive STH discounts resources
 * of the cost, negative STH adds resources of any type.
 */
export function sthAllocations(cost: ResourceBundle, sth: number): ResourceBundle[] {
  if (sth === 0) return [{}];
  if (sth > 0) {
    const caps = RESOURCES.map((r): [ResourceId, number] => [r, cost[r] ?? 0]).filter(
      ([, cap]) => cap > 0,
    );
    const total = caps.reduce((sum, [, cap]) => sum + cap, 0);
    return distribute(Math.min(sth, total), caps);
  }
  return distribute(
    -sth,
    RESOURCES.map((r): [ResourceId, number] => [r, -sth]),
  );
}

function distribute(amount: number, caps: [ResourceId, number][]): ResourceBundle[] {
  const [head, ...rest] = caps;
  if (!head) return amount === 0 ? [{}] : [];
  const [resource, cap] = head;
  const result: ResourceBundle[] = [];
  for (let take = Math.min(cap, amount); take >= 0; take--) {
    for (const tail of distribute(amount - take, rest)) {
      result.push(take > 0 ? { [resource]: take, ...tail } : tail);
    }
  }
  return result;
}
