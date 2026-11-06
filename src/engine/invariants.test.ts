import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RESOURCES, ROWS } from '../content/index.ts';
import { applyAction, createGame, getLegalActions, replay } from './game.ts';
import { content, rules, setupFor } from './testing.ts';
import { trackLength } from './tracks.ts';
import type { Action, GameState } from './types.ts';

const MAX_STEPS = 3000;

function actor(state: GameState): string | null {
  return state.pending?.player ?? state.current;
}

/** Actions that add no Stress by themselves: card actions, Rest, or a board space not used yet. */
function calmOptions(state: GameState, legal: Action[]): Action[] {
  const calm = legal.filter(
    (a) =>
      a.type === 'advanceProject' ||
      a.type === 'promote' ||
      a.type === 'payUpkeep' ||
      (a.type === 'placeTime' &&
        (a.space === 'rest' || !state.placements[a.space].includes(a.player))),
  );
  return calm.length > 0 ? calm : legal;
}

/**
 * Play with choices from fast-check. With probability ~1/`risk` a choice picks any legal action
 * (repeats, refreshes, Overtime…), otherwise a calm one — so lives end both early (stress) and in
 * Old Age. Choices repeat cyclically; with no choices at all every move is the first calm one.
 * Refreshes and discards don't end a turn, so after two in a row the policy must take a real turn.
 */
function playRandomGame(players: number, seed: string, choices: number[], risk = 4) {
  const setup = setupFor(players);
  let state = createGame(setup, content, seed);
  const actions: Action[] = [];
  const states: GameState[] = [state];
  let freeInARow = 0;
  for (let step = 0; state.phase !== 'gameOver'; step++) {
    if (step >= MAX_STEPS) throw new Error('game did not terminate');
    const player = actor(state);
    if (player === null) throw new Error(`nobody to act in phase ${state.phase}`);
    const all = getLegalActions(state, content, player);
    if (all.length === 0) throw new Error(`no legal action for ${player}`);
    const turnEnding = all.filter((a) => a.type !== 'refreshRow' && a.type !== 'discardCard');
    const legal = freeInARow >= 2 && turnEnding.length > 0 ? turnEnding : all;
    const choice = choices.length > 0 ? (choices[step % choices.length] ?? 1) : 1;
    const pool = choice % risk === 0 ? legal : calmOptions(state, legal);
    const action = pool[Math.floor(choice / risk) % pool.length] as Action;
    freeInARow = action.type === 'refreshRow' || action.type === 'discardCard' ? freeInARow + 1 : 0;
    state = applyAction(state, content, action).state;
    actions.push(action);
    states.push(state);
  }
  return { setup, state, actions, states };
}

function checkInvariants(state: GameState): void {
  const last = trackLength(rules) - 1;
  for (const p of state.players) {
    for (const r of RESOURCES)
      expect(Number.isInteger(p.resources[r]) && p.resources[r] >= 0).toBe(true);
    expect(p.stress).toBeGreaterThanOrEqual(0);
    expect(p.stress).toBeLessThanOrEqual(last);
    expect(Math.abs(p.sth)).toBeLessThanOrEqual(rules.sthRange);
    expect(p.time).toBeGreaterThanOrEqual(0);
    expect(p.alive).toBe(p.death === null);
    if (!p.alive) expect(p.time).toBe(0);
  }
  if (state.phase === 'action') {
    const current = state.players.find((p) => p.id === state.current);
    expect(current?.alive && current.time > 0).toBe(true);
    for (const p of state.players) {
      if (p.id !== state.current) expect(getLegalActions(state, content, p.id)).toEqual([]);
    }
  }
  // Cards are conserved: deck + discard + face-up + tableaus + archives = the whole deck, no duplicates.
  const owned = state.players.flatMap((p) => [
    ...p.tableau.map((c) => c.cardId),
    ...p.archive.map((a) => a.cardId),
  ]);
  for (const row of ROWS) {
    const { deck, discard, slots } = state.market[row];
    const inRow = new Set(content.decks[row]);
    const all = [
      ...deck,
      ...discard,
      ...slots.filter((c) => c !== null),
      ...owned.filter((c) => inRow.has(c)),
    ];
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(content.decks[row].length);
  }
  for (const p of state.players) {
    const jobs = p.tableau.filter((c) => content.cards.get(c.cardId)?.kind === 'job');
    expect(jobs.length).toBeLessThanOrEqual(1);
    for (const c of p.tableau) {
      for (const holder of new Set(c.roles ?? [])) {
        if (holder !== null) {
          expect(c.roles?.filter((h) => h === holder).length).toBeLessThanOrEqual(
            rules.groupRolesPerPlayer,
          );
        }
      }
    }
  }
}

const gameArgs = fc.record({
  players: fc.integer({ min: 1, max: 4 }),
  seed: fc.string({ maxLength: 12 }),
  choices: fc.array(fc.nat({ max: 200 }), { maxLength: 400 }),
  risk: fc.integer({ min: 1, max: 12 }),
});

describe('engine invariants (property-based)', () => {
  it('random legal play always terminates and keeps every invariant', () => {
    fc.assert(
      fc.property(gameArgs, ({ players, seed, choices, risk }) => {
        const { state, states } = playRandomGame(players, seed, choices, risk);
        states.forEach(checkInvariants);
        expect(state.result?.standings).toHaveLength(players);
        expect(state.players.every((p) => !p.alive)).toBe(true);
      }),
      { numRuns: 60 },
    );
  });

  it('random play covers both early stress deaths and Old Age deaths', () => {
    const causes = new Set<string>();
    fc.assert(
      fc.property(gameArgs, ({ players, seed, choices, risk }) => {
        const { state } = playRandomGame(players, seed, choices, risk);
        for (const p of state.players) causes.add(p.death?.cause ?? 'none');
      }),
      { numRuns: 60, seed: 1 },
    );
    expect([...causes].sort()).toEqual(['oldAge', 'stress']);
  });

  it('random play exercises every card mechanic', () => {
    const seen = new Set<string>();
    fc.assert(
      fc.property(gameArgs, ({ players, seed, choices, risk }) => {
        const { state } = playRandomGame(players, seed, choices, risk);
        for (const event of state.log) {
          if (event.type === 'cardTaken') {
            seen.add(`take:${content.cards.get(event.cardId)?.kind ?? ''}`);
          } else if (event.type === 'levelReached') {
            seen.add(`level:${String(event.level)}`);
          } else {
            seen.add(event.type);
          }
        }
      }),
      { numRuns: 80, seed: 2 },
    );
    const expected = [
      'take:basicProject',
      'take:singleRoundProject',
      'take:groupProject',
      'take:item',
      'take:activity',
      'take:job',
      'take:partner',
      'groupRoleTaken',
      'level:4',
      'promoted',
      'upkeepPaid',
      'upkeepRefused',
      'cardArchived',
      'lifeGoalScored',
    ];
    expect(expected.filter((e) => !seen.has(e))).toEqual([]);
  });

  it('determinism: replaying seed + actions reproduces the game; state survives JSON round-trip', () => {
    fc.assert(
      fc.property(gameArgs, ({ players, seed, choices, risk }) => {
        const { setup, state, actions } = playRandomGame(players, seed, choices, risk);
        expect(replay(setup, content, seed, actions)).toEqual(state);
        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
      }),
      { numRuns: 30 },
    );
  });

  it('applyAction never mutates its input state', () => {
    fc.assert(
      fc.property(gameArgs, ({ players, seed, choices, risk }) => {
        const { states, actions } = playRandomGame(players, seed, choices.slice(0, 60), risk);
        const index = Math.min(states.length - 2, choices.length % 40);
        const before = states[index] as GameState;
        const snapshot = structuredClone(before);
        applyAction(before, content, actions[index] as Action);
        expect(before).toEqual(snapshot);
      }),
      { numRuns: 30 },
    );
  });
});
