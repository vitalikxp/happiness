import type { Card, Pack } from './schema.ts';
import { VALUE, costValue, rewardValue } from './valueModel.ts';

/** Target `net` bands in R per card level, docs/BALANCE.md §3. */
export const BANDS = {
  basicEntry: [-1, 1],
  basicMiddle: [1, 3],
  basicCompletion: [4, 7],
  singleRound: [1, 4],
  groupRole: [0, 2],
  item: [-1, 2],
  activity: [0, 2],
  jobPerRound: [2, 5],
  promotion: [3, 6],
  partnerLevel: [1, 4],
} as const satisfies Record<string, readonly [number, number]>;

export type BandId = keyof typeof BANDS;

/** Rounds an upkeep level is judged over (BALANCE §3). */
const UPKEEP_ROUNDS = 3;
/** The board action that takes a card costs one Time. */
const ACTION = VALUE.time;

export interface BudgetLine {
  card: string;
  part: string;
  band: BandId;
  net: number;
  ok: boolean;
}

function line(card: Card, part: string, band: BandId, net: number): BudgetLine {
  const [min, max] = BANDS[band];
  const rounded = Math.round(net * 100) / 100;
  return { card: card.id, part, band, net: rounded, ok: rounded >= min && rounded <= max };
}

/** `net = value(reward) − value(cost) − 3R × Time spent` for every level / role / job part. */
export function budgetCard(card: Card, promotionTime = 1): BudgetLine[] {
  switch (card.kind) {
    case 'basicProject':
      return card.levels.map((level, i) => {
        const net = rewardValue(level.reward) - costValue(level.cost) - (i === 0 ? ACTION : 0);
        const band: BandId = i === 0 ? 'basicEntry' : i === 3 ? 'basicCompletion' : 'basicMiddle';
        return line(card, `L${String(i + 1)}`, band, net);
      });
    case 'singleRoundProject':
      return card.levels.map((level, i) =>
        line(
          card,
          `L${String(i + 1)}`,
          'singleRound',
          rewardValue(level.reward) - costValue(level.cost) - ACTION,
        ),
      );
    case 'groupProject':
      return card.roles.map((role, i) =>
        line(
          card,
          `role ${String(i + 1)}`,
          'groupRole',
          rewardValue(role.reward) + rewardValue(card.bonus[0]) - costValue(role.cost) - ACTION,
        ),
      );
    case 'item':
      return card.levels.map((level, i) => {
        const upkeep = level.upkeep
          ? UPKEEP_ROUNDS * (rewardValue(level.upkeep.reward) - costValue(level.upkeep.cost))
          : 0;
        return line(
          card,
          `L${String(i + 1)}`,
          'item',
          rewardValue(level.reward) - costValue(level.cost) - ACTION + upkeep,
        );
      });
    case 'activity':
      return card.levels.map((level, i) =>
        line(
          card,
          `L${String(i + 1)}`,
          'activity',
          rewardValue(level.reward) - costValue(level.cost) - ACTION,
        ),
      );
    case 'job': {
      const lines = [
        line(
          card,
          'per round',
          'jobPerRound',
          rewardValue(card.upkeep.reward) - costValue(card.upkeep.cost),
        ),
      ];
      if (card.promotion) {
        const net =
          rewardValue(card.promotion.reward) -
          costValue(card.promotion.cost) -
          promotionTime * VALUE.time;
        lines.push(line(card, 'promotion', 'promotion', net));
      }
      return lines;
    }
    case 'partner':
      return card.levels.map((level, i) =>
        line(card, `L${String(i + 1)}`, 'partnerLevel', rewardValue(level.reward) - ACTION),
      );
    case 'childTrait':
    case 'lifeGoal':
      return [];
  }
}

/** Every budget line of a pack. Cards with a `balanceNote` are reported but never fail. */
export function budgetPack(pack: Pack): BudgetLine[] {
  return Object.values(pack.cards)
    .flat()
    .flatMap((card: Card) =>
      budgetCard(card, pack.rules.promotionTime).map((l) =>
        card.balanceNote ? { ...l, ok: true } : l,
      ),
    );
}
