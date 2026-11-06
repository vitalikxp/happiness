import type { PackInput } from '../schema.ts';
import { coreTestPack } from './core-test/index.ts';

/** All content packs by id — used by the simulator, the budget linter and (later) the UI. */
export const PACKS: Readonly<Record<string, PackInput>> = {
  'core-test': coreTestPack,
};
