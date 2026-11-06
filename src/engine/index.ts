// Pure, deterministic game rules (docs/ARCHITECTURE.md §3). Public API only — internals stay private.
export { applyAction, createGame, explainIllegal, getLegalActions, replay } from './game.ts';
export { isSpaceOpen } from './actions.ts';
export {
  applySthToCost,
  inheritance,
  startPosition,
  timeForRound,
  trackLength,
  zoneIndexAt,
} from './tracks.ts';
export { IllegalActionError } from './types.ts';
export type * from './types.ts';
