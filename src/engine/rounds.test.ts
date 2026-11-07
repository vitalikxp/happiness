import { describe, expect, it } from 'vitest';
import { countSlots } from './cards.ts';
import { getLegalActions } from './game.ts';
import { rowSize } from './market.ts';
import { stageOf } from './state.ts';
import {
  act,
  content,
  edit,
  finishRound,
  place,
  playerOf,
  rules,
  startedGame,
  tableauCard,
} from './testing.ts';
import type { GameState } from './types.ts';

const toRound = (state: GameState, round: number): GameState => {
  let next = state;
  while (next.round < round) next = finishRound(next);
  return next;
};

describe('rounds & life stages', () => {
  it('R-RND-01: Youth = 1, Adulthood = 2–5, Old Age = 6–8', () => {
    expect([1, 2, 5, 6, 8].map((r) => stageOf(rules, r))).toEqual([
      'youth',
      'adulthood',
      'adulthood',
      'oldAge',
      'oldAge',
    ]);
  });

  it('R-RND-02: each round runs Upkeep → Action → End of Round', () => {
    const state = finishRound(startedGame(1));
    const types = state.log.map((e) => e.type);
    const roundEnd = types.indexOf('roundEnded');
    const nextStart = types.lastIndexOf('roundStarted');
    expect(types.indexOf('roundStarted')).toBeLessThan(types.indexOf('timePlaced'));
    expect(types.lastIndexOf('timePlaced', nextStart)).toBeLessThan(roundEnd);
    expect(roundEnd).toBeLessThan(nextStart);
    expect(state).toMatchObject({ round: 2, phase: 'action' });
  });

  it('R-UPK-01: Get Job, Develop Relationship, Overtime unlock in Adulthood; Overtime locks in Old Age', () => {
    const adult = toRound(startedGame(1), 2);
    expect(stageOf(rules, adult.round)).toBe('adulthood');
    expect(place(adult, 'overtime').players[0]?.time).toBe(6 - 1 + rules.overtime.time);
    const old = edit(toRound(adult, 5), (d) => {
      for (const p of d.players) p.stress = 0;
    });
    const sixth = finishRound(old);
    expect(sixth.round).toBe(6);
    expect(() => place(sixth, 'overtime')).toThrow(/spaceLocked/);
  });

  it('R-UPK-02: Old Age adds the configured Stress at the start of each Old Age round', () => {
    const fifth = toRound(startedGame(1), 5);
    const before = playerOf(fifth, 'p0').stress;
    const sixth = finishRound(fifth);
    expect(playerOf(sixth, 'p0').stress).toBe(before + (rules.oldAgeStress['6'] ?? -1));
  });

  it('R-UPK-03, R-SOLO-01: market size by players and stage; solo uses the 2-player market', () => {
    expect(rowSize(rules, 'projects', 'adulthood', 1)).toBe(3);
    expect(rowSize(rules, 'jobs', 'adulthood', 1)).toBe(2);
    expect(rowSize(rules, 'projects', 'adulthood', 4)).toBe(4);
    expect(rowSize(rules, 'partners', 'adulthood', 3)).toBe(3);
    expect(rowSize(rules, 'jobs', 'youth', 4)).toBe(0);

    const youth = startedGame(4);
    expect(youth.market.projects.slots).toHaveLength(4);
    expect(youth.market.jobs.slots).toEqual([]);
    const adult = finishRound(youth);
    expect(adult.market.jobs.slots).toHaveLength(4);
    expect(adult.market.projects.discard).toEqual(youth.market.projects.slots);
  });

  it('R-UPK-03: an empty deck is reshuffled from its discard pile', () => {
    const state = edit(startedGame(1), (d) => {
      const row = d.market.partners;
      row.discard = [...row.deck];
      row.deck = [];
    });
    const next = finishRound(state);
    expect(next.market.partners.slots.every((card) => card !== null)).toBe(true);
    expect(next.market.partners.deck.length + next.market.partners.slots.length).toBe(
      content.decks.partners.length,
    );
  });

  it('R-UPK-04, R-STR-02: Time for the round follows the Stress zone', () => {
    const base = startedGame(2);
    const next = finishRound(
      edit(base, (d) => {
        const [p0, p1] = d.players;
        if (!p0 || !p1) return;
        p0.stress = 0; // blessed: +1
        p1.stress = 7; // strained: −1
      }),
    );
    expect(next.players.map((p) => p.time)).toEqual([7, 5]);
  });

  it('R-UPK-05: +1 Stress per slot over the limit and per extra Partner', () => {
    const project = 'core-test.project.study_runes';
    const partner = 'core-test.partner.court_scribe';
    const state = edit(startedGame(1), (d) => {
      const p0 = d.players[0];
      if (!p0) return;
      p0.tableau = [
        tableauCard('a', project),
        tableauCard('b', project),
        tableauCard('c', partner),
        tableauCard('d', partner),
        tableauCard('e', 'core-test.item.horse'),
      ];
    });
    expect(countSlots(content, playerOf(state, 'p0'))).toEqual({ slots: 4, partners: 2 });
    const before = playerOf(state, 'p0').stress;
    const next = finishRound(state);
    expect(playerOf(next, 'p0').stress - before).toBe(2);
  });
});

describe('action phase', () => {
  it('R-ACT-01: one Time at a time, clockwise from the first player', () => {
    let state = startedGame(3);
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(state.current ?? '');
      state = place(state, 'study');
    }
    expect(order).toEqual(['p0', 'p1', 'p2', 'p0', 'p1', 'p2']);
  });

  it('R-ACT-02: reusing a board space you already occupy this round costs 1 Stress', () => {
    const state = place(place(startedGame(1), 'study'), 'study');
    expect(playerOf(state, 'p0').stress).toBe(3 + rules.repeatSpaceStress);
    expect(place(state, 'play').players[0]?.stress).toBe(4);
  });

  it('R-ACT-03: players without Time are skipped; the round ends when nobody has Time', () => {
    let state = edit(startedGame(2), (d) => {
      const p1 = d.players[1];
      if (p1) p1.time = 1;
    });
    state = place(state, 'study'); // p0
    state = place(state, 'study'); // p1 — last Time
    expect(state.current).toBe('p0');
    state = place(state, 'play');
    expect(state.current).toBe('p0');
    expect(finishRound(state).round).toBe(2);
  });

  it('R-ACT-04, R-STH-04: refreshing a row costs 1 STH and does not end the turn', () => {
    const state = startedGame(2);
    const next = act(state, { type: 'refreshRow', player: 'p0', row: 'projects' });
    expect(next.current).toBe('p0');
    expect(playerOf(next, 'p0').sth).toBe(-rules.refreshRow.sth);
    expect(next.market.projects.slots).not.toEqual(state.market.projects.slots);
    expect(next.market.projects.discard).toEqual(state.market.projects.slots);
    expect(() => act(state, { type: 'refreshRow', player: 'p0', row: 'jobs' })).toThrow(
      /rowUnavailable/,
    );
  });

  it('R-ACT-05: discarding an own card costs 1 Stress and 1 STH, without ending the turn', () => {
    const state = edit(startedGame(1), (d) => {
      d.players[0]?.tableau.push(tableauCard('x', 'core-test.item.horse'));
    });
    const next = act(state, { type: 'discardCard', player: 'p0', instanceId: 'x' });
    expect(playerOf(next, 'p0')).toMatchObject({ tableau: [], stress: 4, sth: -1 });
    expect(next.current).toBe('p0');
    expect(() => act(next, { type: 'discardCard', player: 'p0', instanceId: 'x' })).toThrow(
      /notInTableau/,
    );
  });

  it('R-ACT-05: one-round cards cannot be discarded and are not offered', () => {
    const state = edit(startedGame(1), (d) => {
      d.players[0]?.tableau.push(tableauCard('x', 'core-test.activity.feast'));
    });
    expect(() => act(state, { type: 'discardCard', player: 'p0', instanceId: 'x' })).toThrow(
      /notDiscardable/,
    );
    expect(getLegalActions(state, content, 'p0').some((a) => a.type === 'discardCard')).toBe(false);
  });
});

describe('end of round', () => {
  it('R-END-03: board spaces are cleared for the next round', () => {
    const next = finishRound(startedGame(2));
    expect(Object.values(next.placements).flat()).toEqual([]);
  });

  it('R-END-04, R-STH-04: highest STH goes first next round; ties go furthest clockwise from the current first player', () => {
    const withSth = (sth: number[]) =>
      finishRound(
        edit(startedGame(4), (d) => {
          d.players.forEach((p, i) => (p.sth = sth[i] ?? 0));
        }),
      );
    expect(withSth([0, 3, 1, 0]).firstPlayer).toBe('p1');
    expect(withSth([2, 2, 0, 2]).firstPlayer).toBe('p3');
    expect(withSth([0, 0, 0, 0]).firstPlayer).toBe('p3');
  });

  it('R-END-05: STH resets every round, Stress does not', () => {
    const state = edit(startedGame(1), (d) => {
      const p0 = d.players[0];
      if (!p0) return;
      p0.sth = 4;
      p0.stress = 0; // leftmost space: the calm policy can't move it, a reset would put it at 3
    });
    const next = finishRound(state);
    expect(playerOf(next, 'p0')).toMatchObject({ sth: 0, stress: 0 });
  });
});
