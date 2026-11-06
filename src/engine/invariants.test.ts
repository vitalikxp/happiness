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

/** Actions that never add Stress: a board space not used yet this round, or Rest. */
function calmOptions(state: GameState, legal: Action[]): Action[] {
  const calm = legal.filter(
    (a) =>
      a.type === 'placeTime' &&
      (a.space === 'rest' || !state.placements[a.space].includes(a.player)),
  );
  return calm.length > 0 ? calm : legal;
}

/**
 * Play with choices from fast-check. With probability ~1/`risk` a choice picks any legal action
 * (repeats, refreshes, Overtime…), otherwise a calm one — so lives end both early (stress) and in
 * Old Age. Exhausted choices play calm.
 */
function playRandomGame(players: number, seed: string, choices: number[], risk = 4) {
  const setup = setupFor(players);
  let state = createGame(setup, content, seed);
  const actions: Action[] = [];
  const states: GameState[] = [state];
  for (let step = 0; state.phase !== 'gameOver'; step++) {
    if (step >= MAX_STEPS) throw new Error('game did not terminate');
    const player = actor(state);
    if (player === null) throw new Error(`nobody to act in phase ${state.phase}`);
    const legal = getLegalActions(state, content, player);
    if (legal.length === 0) throw new Error(`no legal action for ${player}`);
    const choice = choices[step] ?? 1;
    const pool = choice % risk === 0 ? legal : calmOptions(state, legal);
    const action = pool[Math.floor(choice / risk) % pool.length] as Action;
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
  // Cards are conserved per row: deck + discard + face-up = the whole deck, no duplicates.
  for (const row of ROWS) {
    const { deck, discard, slots } = state.market[row];
    const all = [...deck, ...discard, ...slots.filter((c) => c !== null)];
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(content.decks[row].length);
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
