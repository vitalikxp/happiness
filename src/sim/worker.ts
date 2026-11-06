// Worker thread entry: runs one simulation job and posts the game records back.
import { parentPort, workerData } from 'node:worker_threads';
import { runJob, type WorkerJob } from './job.ts';

parentPort?.postMessage(runJob(workerData as WorkerJob));
