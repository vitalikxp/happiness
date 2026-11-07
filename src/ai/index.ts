// Bots built on the public engine API (docs/GDD.md §12).
import { greedyBot } from './greedy.ts';
import { noviceBot } from './novice.ts';
import { PERSONALITIES, type Personality } from './personalities.ts';
import { randomBot } from './random.ts';
import type { Bot } from './types.ts';

export { greedyBot } from './greedy.ts';
export { noviceBot } from './novice.ts';
export { PERSONALITIES, type Personality } from './personalities.ts';
export { randomBot } from './random.ts';
export type { Bot } from './types.ts';

/** `random`, `greedy`, `greedy:<personality>`, `novice` or `novice:<personality>`. */
export function botByName(name: string): Bot {
  if (name === 'random') return randomBot;
  const [kind, personality = 'balanced'] = name.split(':');
  if ((PERSONALITIES as readonly string[]).includes(personality)) {
    if (kind === 'greedy') return greedyBot(personality as Personality);
    if (kind === 'novice') return noviceBot(personality as Personality);
  }
  throw new Error(
    `Unknown bot "${name}" (use random, greedy[:<personality>] or novice[:<personality>], personality: ${PERSONALITIES.join('|')})`,
  );
}
