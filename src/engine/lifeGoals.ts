import type { CardOf, ContentIndex } from '../content/index.ts';
import { cardOf } from './cards.ts';
import { emit } from './state.ts';
import { changeLth } from './tracks.ts';
import type { GameResult, GameState, PlayerState } from './types.ts';

// Life Goals (R-LG-01) and the solo win condition (R-SOLO-02), scored when the game ends.

const PROJECT_KINDS = new Set(['basicProject', 'singleRoundProject', 'groupProject']);

/** The measured value of a Life Goal metric for a dead player. */
export function measure(
  content: ContentIndex,
  goal: CardOf<'lifeGoal'>,
  player: PlayerState,
): number {
  const kinds = player.tableau.map((c) => ({ entry: c, kind: content.cards.get(c.cardId)?.kind }));
  const maxLevel = (kind: string) =>
    Math.max(0, ...kinds.filter((k) => k.kind === kind).map((k) => k.entry.level ?? 0));
  switch (goal.metric) {
    case 'knowledgeAtDeath':
      return player.resources.knowledge;
    case 'creativityAtDeath':
      return player.resources.creativity;
    case 'influenceAtDeath':
      return player.resources.influence;
    case 'moneyAtDeath':
      return player.resources.money;
    case 'completedProjects':
      return player.archive.filter((a) =>
        PROJECT_KINDS.has(content.cards.get(a.cardId)?.kind ?? ''),
      ).length;
    case 'itemsOwned':
      return kinds.filter((k) => k.kind === 'item').length;
    case 'partnerLevel':
      return maxLevel('partner');
    case 'jobLevel':
      return Math.max(
        0,
        ...player.tableau.map((c) => cardOf(content, c.cardId, ['job'])?.level ?? 0),
      );
    case 'roundsLived':
      return player.death?.round ?? 0;
  }
}

/**
 * Multiplayer: each goal's LTH goes to the single best player (ties and zeros: nobody).
 * Solo: each goal whose threshold is met is achieved and pays its LTH.
 */
export function scoreLifeGoals(
  draft: GameState,
  content: ContentIndex,
): Pick<GameResult, 'lifeGoals' | 'solo'> {
  const solo = draft.players.length === 1;
  const achieved: string[] = [];
  const lifeGoals = draft.lifeGoals.flatMap((id) => {
    const goal = cardOf(content, id, ['lifeGoal']);
    if (!goal) return [];
    const values = Object.fromEntries(draft.players.map((p) => [p.id, measure(content, goal, p)]));
    let winner: string | null = null;
    if (solo) {
      const only = draft.players[0];
      if (only && (values[only.id] ?? 0) >= goal.solo.atLeast) winner = only.id;
    } else {
      const best = Math.max(...Object.values(values));
      const leaders = draft.players.filter((p) => values[p.id] === best);
      if (best > 0 && leaders.length === 1) winner = leaders[0]?.id ?? null;
    }
    const player = draft.players.find((p) => p.id === winner);
    if (player) {
      achieved.push(id);
      changeLth(draft, player, goal.award.lth, 'lifeGoals');
      emit(draft, { type: 'lifeGoalScored', card: id, player: player.id, lth: goal.award.lth });
    }
    return [{ card: id, winner, values }];
  });
  const only = draft.players[0];
  return {
    lifeGoals,
    solo:
      solo && only
        ? {
            achieved,
            won:
              achieved.length === draft.lifeGoals.length && only.lth >= content.rules.solo.winLth,
          }
        : null,
  };
}
