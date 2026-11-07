import type { AchievementCondition, ContentIndex } from '../content/index.ts';
import { measureMetric } from './lifeGoals.ts';
import type { GameState, PlayerId, PlayerState } from './types.ts';

// Achievements (R-META-02): pure predicates over a finished game, evaluated after it, never during.

function holds(
  condition: AchievementCondition,
  state: GameState,
  content: ContentIndex,
  player: PlayerState,
): boolean {
  switch (condition.kind) {
    case 'metric': {
      const value =
        condition.metric === 'lth' ? player.lth : measureMetric(content, condition.metric, player);
      return value >= condition.atLeast;
    }
    case 'win': {
      const result = state.result;
      const opponents = state.players.length - 1;
      if (!result) return false;
      if (opponents < (condition.minOpponents ?? 0)) return false;
      if (opponents > (condition.maxOpponents ?? Infinity)) return false;
      return result.solo ? result.solo.won : result.winners.includes(player.id);
    }
  }
}

/** Ids of the pack's achievements `player` earned in this finished game (empty before the end). */
export function earnedAchievements(
  state: GameState,
  content: ContentIndex,
  player: PlayerId,
): string[] {
  const me = state.players.find((p) => p.id === player);
  if (state.phase !== 'gameOver' || !me) return [];
  return content.achievements
    .filter((a) => a.when.every((condition) => holds(condition, state, content, me)))
    .map((a) => a.id);
}
