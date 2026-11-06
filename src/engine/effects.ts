import { RESOURCES, type ResourceBundle, type Reward, type RulesConfig } from '../content/index.ts';
import { emit } from './state.ts';
import { addStress, applyGoodHealth, changeLth, changeSth, relieveStress } from './tracks.ts';
import type { GameState, LthSource, PlayerState, Resources } from './types.ts';

/**
 * Apply a declarative card reward (effects DSL, docs/ARCHITECTURE.md §3.3) in a fixed order:
 * resources → time → sth → lth → goodHealth → relax → stress.
 */
export function applyReward(
  draft: GameState,
  rules: RulesConfig,
  player: PlayerState,
  reward: Reward,
  source: LthSource,
): void {
  if (!player.alive) return;

  gainResources(draft, player, reward);
  if (reward.time) gainTime(draft, player, reward.time);
  if (reward.sth) changeSth(draft, rules, player, reward.sth);
  if (reward.lth) changeLth(draft, player, reward.lth, source);
  if (reward.goodHealth) applyGoodHealth(draft, rules, player);
  if (reward.relax) relieveStress(draft, rules, player, reward.relax, 'relax');
  if (reward.stress) addStress(draft, rules, player, reward.stress, 'card');
}

export function gainResources(draft: GameState, player: PlayerState, bundle: ResourceBundle): void {
  const gained: Partial<Resources> = {};
  for (const r of RESOURCES) {
    const amount = bundle[r] ?? 0;
    if (amount > 0) {
      player.resources[r] += amount;
      gained[r] = amount;
    }
  }
  if (Object.keys(gained).length > 0)
    emit(draft, { type: 'resourcesGained', player: player.id, gained });
}

/** Extra Time markers for the current round. */
export function gainTime(draft: GameState, player: PlayerState, amount: number): void {
  player.time += amount;
  emit(draft, { type: 'timeGained', player: player.id, amount });
}
