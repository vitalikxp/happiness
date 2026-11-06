import { describe, expect, it } from 'vitest';
import { applyReward } from './effects.ts';
import { edit, playerOf, rules, startedGame } from './testing.ts';
import {
  addStress,
  applyGoodHealth,
  applySthToCost,
  changeSth,
  inheritance,
  timeForRound,
  trackLength,
  zoneIndexAt,
} from './tracks.ts';
import type { GameState, PlayerState } from './types.ts';

/** Run a draft-mutating helper on a copy of a fresh solo game's player. */
function withPlayer(
  change: (draft: GameState, player: PlayerState) => void,
  arrange: (player: PlayerState) => void = () => undefined,
): { state: GameState; player: PlayerState } {
  const state = edit(startedGame(1), (d) => {
    const player = d.players[0];
    if (!player) throw new Error('no player');
    arrange(player);
    change(d, player);
  });
  return { state, player: playerOf(state, 'p0') };
}

describe('stress track', () => {
  it('zones: blessed 0–2, healthy 3–6, strained 7–9, ill 10–12, failing 13–14', () => {
    expect(trackLength(rules)).toBe(15);
    expect([0, 2, 3, 6, 7, 10, 13, 14].map((s) => zoneIndexAt(rules, s))).toEqual([
      0, 0, 1, 1, 2, 3, 4, 4,
    ]);
  });

  it('R-STR-01: each Stress moves one space right', () => {
    expect(
      withPlayer((d, p) => {
        addStress(d, rules, p, 3, 'card');
      }).player.stress,
    ).toBe(6);
  });

  it('R-STR-02: Time per round = startTime + zone modifier', () => {
    expect([0, 3, 7, 10, 13].map((s) => timeForRound(rules, s))).toEqual([7, 6, 5, 4, 3]);
  });

  it('R-STR-03: Relax stops at the first space of the current zone', () => {
    const relax = (stress: number, amount: number) =>
      withPlayer(
        (d, p) => {
          applyReward(d, rules, p, { relax: amount }, 'itemsActivities');
        },
        (p) => (p.stress = stress),
      ).player.stress;
    expect(relax(9, 1)).toBe(8);
    expect(relax(8, 3)).toBe(7);
    expect(relax(7, 1)).toBe(7);
  });

  it('R-STR-04: Good Health moves one zone left keeping the relative space; no effect in the leftmost zone', () => {
    const heal = (stress: number) =>
      withPlayer(
        (d, p) => {
          applyGoodHealth(d, rules, p);
        },
        (p) => (p.stress = stress),
      ).player.stress;
    expect(heal(4)).toBe(1); // 2nd space of healthy → 2nd space of blessed
    expect(heal(6)).toBe(2); // 4th space of healthy → clamped to the last space of blessed
    expect(heal(11)).toBe(8); // ill → strained
    expect(heal(1)).toBe(1);
  });

  it('R-STR-05: passing the last space kills the player immediately, paying inheritance', () => {
    const { state, player } = withPlayer(
      (d, p) => {
        addStress(d, rules, p, 2, 'card');
      },
      (p) => {
        p.stress = 13;
        p.resources = { knowledge: 11, creativity: 4, influence: 5, money: 10 };
      },
    );
    expect(player).toMatchObject({
      alive: false,
      time: 0,
      stress: 14,
      death: { round: 1, cause: 'stress' },
    });
    expect(player.lthBySource.inheritance).toBe(2 + 0 + 1 + 2);
    expect(state.log.at(-2)).toMatchObject({ type: 'playerDied', player: 'p0' });
  });

  it('R-STR-05: landing exactly on the last space is still alive', () => {
    expect(
      withPlayer(
        (d, p) => {
          addStress(d, rules, p, 1, 'card');
        },
        (p) => (p.stress = 13),
      ).player.alive,
    ).toBe(true);
  });
});

describe('short-term happiness', () => {
  it('R-STH-01, R-STH-03: STH stays within ±5; overflow converts to LTH', () => {
    const up = withPlayer(
      (d, p) => {
        changeSth(d, rules, p, 3);
      },
      (p) => (p.sth = 4),
    ).player;
    expect(up).toMatchObject({ sth: 5, lth: 2, lthBySource: { sthOverflow: 2 } });
    const down = withPlayer(
      (d, p) => {
        changeSth(d, rules, p, -4);
      },
      (p) => (p.sth = -3),
    ).player;
    expect(down).toMatchObject({ sth: -5, lth: -2 });
  });

  it('R-STH-02: positive STH discounts project advances, negative STH surcharges them', () => {
    const cost = { knowledge: 2, influence: 1 };
    expect(applySthToCost(cost, 2, { knowledge: 1, influence: 1 })).toEqual({ knowledge: 1 });
    expect(applySthToCost(cost, 5, { knowledge: 2, influence: 1 })).toEqual({});
    expect(applySthToCost(cost, 0, {})).toEqual(cost);
    expect(applySthToCost(cost, -2, { money: 1, knowledge: 1 })).toEqual({
      knowledge: 3,
      influence: 1,
      money: 1,
    });
    // Allocations must match STH exactly and never discount below zero.
    expect(applySthToCost(cost, 2, { knowledge: 1 })).toBeNull();
    expect(applySthToCost(cost, 2, { influence: 2 })).toBeNull();
    expect(applySthToCost(cost, -1, {})).toBeNull();
  });
});

describe('rewards (effects DSL)', () => {
  it('applies resources → time → sth → lth → goodHealth → relax → stress', () => {
    const { state } = withPlayer(
      (d, p) => {
        applyReward(
          d,
          rules,
          p,
          { money: 2, time: 1, sth: 1, lth: 3, goodHealth: 1, relax: 1, stress: 1 },
          'projects',
        );
      },
      (p) => (p.stress = 8),
    );
    const events = state.log
      .slice(-7)
      .map((e) => (e.type === 'stressChanged' ? `stress:${e.cause}` : e.type));
    expect(events).toEqual([
      'resourcesGained',
      'timeGained',
      'sthChanged',
      'lthChanged',
      'stress:goodHealth',
      'stress:relax',
      'stress:card',
    ]);
    expect(playerOf(state, 'p0')).toMatchObject({ stress: 4, lthBySource: { projects: 3 } });
  });

  it('R-DTH-02 helper: one LTH per 5 of each resource type', () => {
    const player = startedGame(1).players[0];
    if (!player) throw new Error('no player');
    player.resources = { knowledge: 4, creativity: 9, influence: 15, money: 5 };
    expect(inheritance(rules, player)).toBe(0 + 1 + 3 + 1);
  });
});
