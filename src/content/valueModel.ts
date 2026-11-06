import { RESOURCES, type Cost, type ResourceBundle, type Reward } from './schema.ts';

/**
 * Economy value model in R (1 R = one basic resource), docs/BALANCE.md §2.
 * Shared by the content budget linter and the bots. Tune here and in BALANCE.md together.
 */
export const VALUE = {
  resource: 1,
  time: 3,
  lth: 2,
  sth: 0.75,
  stress: 1.5,
  relax: 1.5,
  /** Mid-game estimate: +1 Time for several rounds plus a longer life. */
  goodHealth: 15,
} as const;

export type ValueWeights = { [K in keyof typeof VALUE]: number };

export function resourcesValue(bundle: ResourceBundle, weights: ValueWeights = VALUE): number {
  return RESOURCES.reduce((sum, r) => sum + (bundle[r] ?? 0), 0) * weights.resource;
}

export function costValue(cost: Cost | ResourceBundle, weights: ValueWeights = VALUE): number {
  const time = 'time' in cost ? (cost.time ?? 0) : 0;
  return resourcesValue(cost, weights) + time * weights.time;
}

export function rewardValue(reward: Reward, weights: ValueWeights = VALUE): number {
  return (
    resourcesValue(reward, weights) +
    (reward.time ?? 0) * weights.time +
    (reward.sth ?? 0) * weights.sth +
    (reward.lth ?? 0) * weights.lth +
    (reward.goodHealth ?? 0) * weights.goodHealth +
    (reward.relax ?? 0) * weights.relax -
    (reward.stress ?? 0) * weights.stress
  );
}
