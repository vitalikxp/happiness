import { describe, expect, it } from 'vitest';
import { createGame, explainIllegal, getLegalActions } from './game.ts';
import { act, content, place, playerOf, rules, setupFor, startedGame } from './testing.ts';
import { startPosition } from './tracks.ts';

describe('setup', () => {
  it('R-SET-01: 1–4 players', () => {
    expect(() => createGame(setupFor(0), content, 's')).toThrow();
    expect(() => createGame(setupFor(5), content, 's')).toThrow();
    for (const n of [1, 2, 3, 4])
      expect(createGame(setupFor(n), content, 's').players).toHaveLength(n);
  });

  it('R-SET-02: decks are shuffled by the seed — same seed, same game', () => {
    const a = createGame(setupFor(2), content, 'alpha');
    expect(createGame(setupFor(2), content, 'alpha')).toEqual(a);
    expect(createGame(setupFor(2), content, 'beta').market.projects.deck).not.toEqual(
      a.market.projects.deck,
    );
  });

  it('R-SET-03: players start at the start zone, centered STH, zero LTH', () => {
    const state = createGame(setupFor(3), content, 's');
    for (const player of state.players) {
      expect(player.stress).toBe(startPosition(rules));
      expect(player).toMatchObject({ sth: 0, lth: 0, alive: true });
    }
    expect(startPosition(rules)).toBe(3);
  });

  it('R-SET-04, R-SOLO-01: one Life Goal per player, three in solo', () => {
    expect(createGame(setupFor(1), content, 's').lifeGoals).toHaveLength(3);
    expect(createGame(setupFor(2), content, 's').lifeGoals).toHaveLength(2);
    expect(createGame(setupFor(4), content, 's').lifeGoals).toHaveLength(4);
  });

  it('R-SET-05: round 1 is Youth; Get Job, Develop Relationship and Overtime are locked', () => {
    const state = startedGame(1);
    expect(state.round).toBe(1);
    for (const space of ['getJob', 'developRelationship', 'overtime'] as const) {
      expect(
        explainIllegal(state, content, { type: 'placeTime', player: 'p0', space }),
      ).toContainEqual({
        code: 'spaceLocked',
        stage: 'youth',
      });
    }
  });

  it('R-SET-06: two distinct Child Traits per player; the kept one gives its starting resources', () => {
    const state = createGame(setupFor(4), content, 's');
    const offered = state.players.flatMap((p) => p.traitOffer);
    expect(offered).toHaveLength(8);
    expect(new Set(offered).size).toBe(8);

    const card = playerOf(state, 'p0').traitOffer[1] ?? '';
    const trait = content.cards.get(card);
    const next = act(state, { type: 'chooseChildTrait', player: 'p0', card });
    const p0 = playerOf(next, 'p0');
    expect(p0.childTrait).toBe(card);
    expect(p0.traitOffer).toEqual([]);
    if (trait?.kind !== 'childTrait') throw new Error('expected a child trait');
    for (const [resource, amount] of Object.entries(trait.start)) {
      expect(p0.resources[resource as keyof typeof p0.resources]).toBe(amount);
    }
    expect(next.pending).toEqual({ type: 'chooseChildTrait', player: 'p1' });
  });

  it('R-SET-06: only offered traits, only by the pending player', () => {
    const state = createGame(setupFor(2), content, 's');
    const foreign = playerOf(state, 'p1').traitOffer[0] ?? '';
    expect(
      explainIllegal(state, content, { type: 'chooseChildTrait', player: 'p0', card: foreign }),
    ).toEqual([{ code: 'notAnOption' }]);
    expect(
      explainIllegal(state, content, { type: 'chooseChildTrait', player: 'p1', card: foreign }),
    ).toEqual([{ code: 'notYourTurn' }]);
    expect(getLegalActions(state, content, 'p0')).toHaveLength(2);
    expect(getLegalActions(state, content, 'p1')).toHaveLength(0);
  });

  it('R-SET-07: the human goes first', () => {
    const state = createGame(setupFor(3, ['bot', 'human', 'bot']), content, 's');
    expect(state.firstPlayer).toBe('p1');
    expect(state.pending).toEqual({ type: 'chooseChildTrait', player: 'p1' });
  });

  it('after the last Child Trait the first round starts with the first player to act', () => {
    const state = startedGame(3);
    expect(state).toMatchObject({ phase: 'action', round: 1, current: 'p0', pending: null });
    expect(place(state, 'study').current).toBe('p1');
  });
});
