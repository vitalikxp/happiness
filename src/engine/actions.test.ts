import { describe, expect, it } from 'vitest';
import { explainIllegal } from './game.ts';
import {
  content,
  edit,
  finishRound,
  legal,
  place,
  playerOf,
  rules,
  startedGame,
} from './testing.ts';

const adult = () => finishRound(startedGame(1));

describe('board actions', () => {
  it('R-A-STUDY, R-A-PLAY, R-A-INTERACT, R-A-TEMP: +3 of the matching resource', () => {
    const start = startedGame(1);
    const base = playerOf(start, 'p0').resources;
    let state = start;
    for (const space of ['study', 'play', 'interact', 'tempJob'] as const)
      state = place(state, space);
    const yieldOf = rules.basicActionYield;
    expect(playerOf(state, 'p0').resources).toEqual({
      knowledge: base.knowledge + yieldOf,
      creativity: base.creativity + yieldOf,
      influence: base.influence + yieldOf,
      money: base.money + yieldOf,
    });
    expect(playerOf(state, 'p0').time).toBe(2);
  });

  it('R-A-OVERTIME: +2 Time and +2 Stress, Adulthood only', () => {
    const state = place(adult(), 'overtime');
    expect(playerOf(state, 'p0')).toMatchObject({ time: 7, stress: 5 });
  });

  it('R-A-OVERTIME, R-STR-06: illegal when the Stress would kill, including the repeat penalty', () => {
    const lastSpace = 14;
    const nearDeath = edit(adult(), (d) => {
      const p0 = d.players[0];
      if (p0) p0.stress = lastSpace - 2;
    });
    expect(
      explainIllegal(nearDeath, content, { type: 'placeTime', player: 'p0', space: 'overtime' }),
    ).toEqual([]);
    const once = place(nearDeath, 'overtime');
    expect(playerOf(once, 'p0').alive).toBe(true);
    expect(
      explainIllegal(once, content, { type: 'placeTime', player: 'p0', space: 'overtime' }),
    ).toEqual([{ code: 'wouldDie' }]);
    expect(legal(once).some((a) => a.type === 'placeTime' && a.space === 'overtime')).toBe(false);
  });

  it('R-A-REST: −2 Stress without leaving the current zone', () => {
    const at = (stress: number) =>
      playerOf(
        place(
          edit(startedGame(1), (d) => {
            const p0 = d.players[0];
            if (p0) p0.stress = stress;
          }),
          'rest',
        ),
        'p0',
      ).stress;
    expect(at(6)).toBe(4);
    expect(at(4)).toBe(3);
    expect(at(7)).toBe(7);
  });

  it('card-driven board spaces are not implemented yet (Roadmap M2)', () => {
    const state = adult();
    for (const space of ['takeProject', 'spend', 'getJob', 'developRelationship'] as const) {
      expect(explainIllegal(state, content, { type: 'placeTime', player: 'p0', space })).toEqual([
        { code: 'notImplemented' },
      ]);
    }
  });

  it('only the current living player may act, only in the Action phase', () => {
    const state = startedGame(2);
    expect(
      explainIllegal(state, content, { type: 'placeTime', player: 'p1', space: 'study' }),
    ).toEqual([{ code: 'notYourTurn' }]);
    expect(
      explainIllegal(state, content, { type: 'placeTime', player: 'p9', space: 'study' }),
    ).toEqual([{ code: 'unknownPlayer' }]);
    const dead = edit(state, (d) => {
      const p0 = d.players[0];
      if (p0) p0.alive = false;
    });
    expect(
      explainIllegal(dead, content, { type: 'placeTime', player: 'p0', space: 'study' }),
    ).toEqual([{ code: 'playerDead' }]);
  });
});
