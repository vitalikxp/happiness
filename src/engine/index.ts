// Pure, deterministic game rules (docs/ARCHITECTURE.md §3). Public API only — internals stay private.
export { applyAction, createGame, explainIllegal, getLegalActions, replay } from './game.ts';
export { isSpaceOpen } from './actions.ts';
export { previewAction, type PlayerDelta, type Preview } from './preview.ts';
export {
  applySthToCost,
  inheritance,
  startPosition,
  timeForRound,
  trackLength,
  zoneIndexAt,
} from './tracks.ts';
export { nextFloat, seedRng, shuffle, type RngState } from './rng.ts';
export { stageOf } from './state.ts';
export { IllegalActionError } from './types.ts';
export type * from './types.ts';
