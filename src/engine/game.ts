import { BOARD_SPACES, ROWS, type ContentIndex, type RowId } from '../content/index.ts';
import { resolve, validate } from './actions.ts';
import { emptyPlacements } from './flow.ts';
import { seedRng, shuffle } from './rng.ts';
import { startPosition } from './tracks.ts';
import {
  IllegalActionError,
  type Action,
  type GameEvent,
  type GameSetup,
  type GameState,
  type IllegalReason,
  type MarketRow,
  type PlayerId,
  type PlayerState,
} from './types.ts';

const MAX_PLAYERS = 4;

/** R-SET-*: a new game waiting for Child Trait choices. */
export function createGame(setup: GameSetup, content: ContentIndex, seed: string): GameState {
  const count = setup.players.length;
  if (count < 1 || count > MAX_PLAYERS)
    throw new Error(`A game needs 1–${String(MAX_PLAYERS)} players`);
  const { rules, decks } = content;
  const rng = seedRng(seed);

  // R-SET-02
  const market = Object.fromEntries(
    ROWS.map((row): [RowId, MarketRow] => [
      row,
      { deck: shuffle(rng, decks[row]), discard: [], slots: [] },
    ]),
  ) as Record<RowId, MarketRow>;
  const traitDeck = shuffle(rng, decks.childTraits);
  // R-SET-04, R-SOLO-01
  const lifeGoals = shuffle(rng, decks.lifeGoals).slice(
    0,
    count === 1 ? rules.solo.lifeGoals : count,
  );

  const players = setup.players.map((seat, i): PlayerState => ({
    id: `p${String(i)}`,
    kind: seat.kind,
    resources: { knowledge: 0, creativity: 0, influence: 0, money: 0 },
    time: 0,
    stress: startPosition(rules), // R-SET-03
    sth: 0,
    lth: 0,
    lthBySource: {},
    alive: true,
    death: null,
    childTrait: null,
    traitOffer: traitDeck.splice(0, rules.childTraitsDealt), // R-SET-06
    tableau: [],
  }));
  const first = players.find((p) => p.kind === 'human') ?? players[0];
  if (!first) throw new Error('A game needs players');

  return {
    version: 1,
    packId: content.packId,
    packVersion: content.packVersion,
    seed,
    rng,
    round: 1, // R-SET-05
    phase: 'setup',
    pending: { type: 'chooseChildTrait', player: first.id },
    firstPlayer: first.id, // R-SET-07
    current: null,
    market,
    placements: emptyPlacements(),
    players,
    lifeGoals,
    nextInstanceId: 1,
    result: null,
    log: [{ type: 'gameCreated', seed, players: players.map((p) => p.id), lifeGoals }],
  };
}

/** Every action `player` may take now. The only source of truth for UI and bots. */
export function getLegalActions(
  state: GameState,
  content: ContentIndex,
  player: PlayerId,
): Action[] {
  const self = state.players.find((p) => p.id === player);
  if (!self) return [];
  const candidates: Action[] =
    state.phase === 'setup'
      ? self.traitOffer.map((card) => ({ type: 'chooseChildTrait', player, card }))
      : [
          ...BOARD_SPACES.map((space): Action => ({ type: 'placeTime', player, space })),
          ...ROWS.map((row): Action => ({ type: 'refreshRow', player, row })),
          ...self.tableau.map((c): Action => ({
            type: 'discardCard',
            player,
            instanceId: c.instanceId,
          })),
        ];
  return candidates.filter((action) => validate(state, content, action).length === 0);
}

/** Reasons the action is illegal (empty if legal) — for "can't because…" hints. */
export function explainIllegal(
  state: GameState,
  content: ContentIndex,
  action: Action,
): IllegalReason[] {
  return validate(state, content, action);
}

/** Pure transition: returns a new state and the events it produced. Throws on illegal actions. */
export function applyAction(
  state: GameState,
  content: ContentIndex,
  action: Action,
): { state: GameState; events: GameEvent[] } {
  const reasons = validate(state, content, action);
  if (reasons.length > 0) throw new IllegalActionError(action, reasons);
  const draft = structuredClone(state);
  const logStart = draft.log.length;
  resolve(draft, content, action);
  return { state: draft, events: draft.log.slice(logStart) };
}

/** Rebuild a game from its seed and action log (saves, undo, bug reports). */
export function replay(
  setup: GameSetup,
  content: ContentIndex,
  seed: string,
  actions: readonly Action[],
): GameState {
  return actions.reduce(
    (state, action) => applyAction(state, content, action).state,
    createGame(setup, content, seed),
  );
}
