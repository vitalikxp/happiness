import {
  RESOURCES,
  type ResourceBundle,
  type ResourceId,
  type RulesConfig,
} from '../content/index.ts';
import { emit } from './state.ts';
import type { DeathCause, GameState, LthSource, PlayerState, StressCause } from './types.ts';

// Stress track (GDD §8), STH (§9), LTH and death (§10).

export function trackLength(rules: RulesConfig): number {
  return rules.stressZones.reduce((sum, zone) => sum + zone.spaces, 0);
}

/** First space of each zone, left to right. */
function zoneStarts(rules: RulesConfig): number[] {
  let next = 0;
  return rules.stressZones.map((zone) => {
    const start = next;
    next += zone.spaces;
    return start;
  });
}

export function startPosition(rules: RulesConfig): number {
  const index = rules.stressZones.findIndex((zone) => zone.start);
  return zoneStarts(rules)[index] ?? 0;
}

export function zoneIndexAt(rules: RulesConfig, position: number): number {
  const starts = zoneStarts(rules);
  let index = 0;
  starts.forEach((start, i) => {
    if (position >= start) index = i;
  });
  return index;
}

/** R-STR-02: Time per round depends on the current zone. */
export function timeForRound(rules: RulesConfig, position: number): number {
  const zone = rules.stressZones[zoneIndexAt(rules, position)];
  return Math.max(0, rules.startTime + (zone?.timeModifier ?? 0));
}

/** How much Stress the player can still take without dying. */
export function stressHeadroom(rules: RulesConfig, player: PlayerState): number {
  return trackLength(rules) - 1 - player.stress;
}

/** R-STR-01, R-STR-05: move right; past the last space the player dies. */
export function addStress(
  draft: GameState,
  rules: RulesConfig,
  player: PlayerState,
  amount: number,
  cause: StressCause,
): void {
  if (amount <= 0 || !player.alive) return;
  const from = player.stress;
  const last = trackLength(rules) - 1;
  player.stress = Math.min(from + amount, last);
  emit(draft, { type: 'stressChanged', player: player.id, from, to: player.stress, cause });
  if (from + amount > last)
    killPlayer(draft, rules, player, cause === 'oldAge' ? 'oldAge' : 'stress');
}

/** R-STR-03: Rest and Relax move left but never out of the current zone. */
export function relieveStress(
  draft: GameState,
  rules: RulesConfig,
  player: PlayerState,
  amount: number,
  cause: 'rest' | 'relax',
): void {
  const from = player.stress;
  const zoneStart = zoneStarts(rules)[zoneIndexAt(rules, from)] ?? 0;
  player.stress = Math.max(from - amount, zoneStart);
  if (player.stress !== from)
    emit(draft, { type: 'stressChanged', player: player.id, from, to: player.stress, cause });
}

/** R-STR-04: one zone left, same relative space (clamped to the new zone). No effect in the leftmost zone. */
export function applyGoodHealth(draft: GameState, rules: RulesConfig, player: PlayerState): void {
  const from = player.stress;
  const zone = zoneIndexAt(rules, from);
  if (zone === 0) return;
  const starts = zoneStarts(rules);
  const offset = from - (starts[zone] ?? 0);
  const target = rules.stressZones[zone - 1];
  if (!target) return;
  player.stress = (starts[zone - 1] ?? 0) + Math.min(offset, target.spaces - 1);
  emit(draft, {
    type: 'stressChanged',
    player: player.id,
    from,
    to: player.stress,
    cause: 'goodHealth',
  });
}

export function changeLth(
  draft: GameState,
  player: PlayerState,
  amount: number,
  source: LthSource,
): void {
  if (amount === 0) return;
  player.lth += amount;
  player.lthBySource[source] = (player.lthBySource[source] ?? 0) + amount;
  emit(draft, { type: 'lthChanged', player: player.id, amount, source });
}

/** R-STH-01, R-STH-03: STH is clamped to ±sthRange; overflow converts to ±LTH. */
export function changeSth(
  draft: GameState,
  rules: RulesConfig,
  player: PlayerState,
  delta: number,
): void {
  if (delta === 0) return;
  const from = player.sth;
  const wanted = from + delta;
  player.sth = Math.max(-rules.sthRange, Math.min(rules.sthRange, wanted));
  if (player.sth !== from)
    emit(draft, { type: 'sthChanged', player: player.id, from, to: player.sth });
  changeLth(draft, player, wanted - player.sth, 'sthOverflow');
}

/** R-DTH-02: +1 LTH per `inheritanceRate` of each resource type held at death. */
export function inheritance(rules: RulesConfig, player: PlayerState): number {
  return RESOURCES.reduce(
    (sum, r) => sum + Math.floor(player.resources[r] / rules.inheritanceRate),
    0,
  );
}

/** R-STR-05, R-DTH-01, R-DTH-02: the player leaves the game; inheritance is paid immediately. */
export function killPlayer(
  draft: GameState,
  rules: RulesConfig,
  player: PlayerState,
  cause: DeathCause,
): void {
  if (!player.alive) return;
  player.alive = false;
  player.time = 0;
  player.death = { round: draft.round, cause };
  emit(draft, { type: 'playerDied', player: player.id, round: draft.round, cause });
  changeLth(draft, player, inheritance(rules, player), 'inheritance');
}

/**
 * R-STH-02: price of a Basic Project advance after STH. Positive STH removes that many resources
 * (the player chooses which via `discount`), negative STH adds that many (`surcharge`).
 * Returns null if the allocation doesn't match the player's STH.
 */
export function applySthToCost(
  cost: ResourceBundle,
  sth: number,
  allocation: ResourceBundle,
): Partial<Record<ResourceId, number>> | null {
  const allocated = RESOURCES.reduce((sum, r) => sum + (allocation[r] ?? 0), 0);
  const result: Partial<Record<ResourceId, number>> = {};
  if (sth >= 0) {
    const maxDiscount = RESOURCES.reduce((sum, r) => sum + (cost[r] ?? 0), 0);
    if (allocated !== Math.min(sth, maxDiscount)) return null;
    for (const r of RESOURCES) {
      const value = (cost[r] ?? 0) - (allocation[r] ?? 0);
      if (value < 0) return null;
      if (value > 0) result[r] = value;
    }
  } else {
    if (allocated !== -sth) return null;
    for (const r of RESOURCES) {
      const value = (cost[r] ?? 0) + (allocation[r] ?? 0);
      if (value > 0) result[r] = value;
    }
  }
  return result;
}
