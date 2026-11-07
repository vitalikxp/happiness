// A slice of a simulation: plays the given games and records their metrics.
import { botByName } from '../ai/index.ts';
import { loadPack } from '../content/index.ts';
import { PACKS } from '../content/packs/index.ts';
import { recordGame, type GameRecord } from './metrics.ts';
import { runGame } from './run.ts';

export interface WorkerJob {
  pack: string;
  bots: string[];
  seed: string;
  /** Game indices to play; game i uses seed `${seed}-${i}`. */
  indices: number[];
  /** Play with every unlockable card in the decks (R-META-03). */
  unlockAll?: boolean;
}

export function runJob(job: WorkerJob): GameRecord[] {
  const input = PACKS[job.pack];
  if (!input) throw new Error(`Unknown pack "${job.pack}"`);
  const content = loadPack(input);
  const bots = job.bots.map(botByName);
  return job.indices.map((i) =>
    recordGame(
      runGame(content, bots, `${job.seed}-${String(i)}`, job.unlockAll),
      job.bots,
      content,
    ),
  );
}
