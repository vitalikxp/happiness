// Headless balance simulation: `pnpm sim --games 1000 --bots greedy,greedy --seed 1`.
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { botByName } from '../ai/index.ts';
import { PACKS } from '../content/packs/index.ts';
import { aggregate, type GameRecord } from './metrics.ts';
import { formatReport } from './report.ts';
import { runJob, type WorkerJob } from './job.ts';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '200' },
    bots: { type: 'string', default: 'greedy,greedy,greedy' },
    seed: { type: 'string', default: '1' },
    pack: { type: 'string', default: 'core-test' },
    workers: { type: 'string', default: String(availableParallelism()) },
    json: { type: 'string' },
    'unlock-all': { type: 'boolean', default: false },
  },
});

if (!PACKS[values.pack]) {
  throw new Error(`Unknown pack "${values.pack}" (${Object.keys(PACKS).join(', ')})`);
}
const names = values.bots.split(',').map((name) => name.trim());
names.forEach(botByName); // fail fast on unknown bot names
const games = Number(values.games);
const workers = Math.max(1, Math.min(Number(values.workers), games));

function runInWorker(job: WorkerJob): Promise<GameRecord[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { workerData: job });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}

const started = performance.now();
const jobs = Array.from({ length: workers }, (_, w): WorkerJob => ({
  pack: values.pack,
  bots: names,
  seed: values.seed,
  unlockAll: values['unlock-all'],
  indices: Array.from({ length: games }, (_, i) => i).filter((i) => i % workers === w),
}));
const parts = workers === 1 ? jobs.map(runJob) : await Promise.all(jobs.map(runInWorker));
// Records are reordered by game index, so the report doesn't depend on the number of workers.
const records = parts
  .flat()
  .sort((a, b) => Number(a.seed.split('-').at(-1)) - Number(b.seed.split('-').at(-1)));
const report = aggregate(records, performance.now() - started);

console.log(formatReport(report, `Simulation: ${values.pack}, ${names.join(' vs ')}`));
if (values.json) {
  writeFileSync(values.json, `${JSON.stringify({ args: values, report }, null, 2)}\n`);
  console.log(`\nJSON written to ${values.json}`);
}
