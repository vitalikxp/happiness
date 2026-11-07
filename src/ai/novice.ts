import { getLegalActions, nextFloat } from '../engine/index.ts';
import { greedyBot } from './greedy.ts';
import type { Personality } from './personalities.ts';
import { botRng, turnActions, type Bot } from './types.ts';

// The easy opponent (R-BOT-02): a greedy bot that now and then simply does what it fancies.

/** Share of decisions taken at random instead of by the value model. */
const WHIM = 0.2;

export function noviceBot(personality: Personality = 'balanced'): Bot {
  const greedy = greedyBot(personality);
  return {
    name: personality === 'balanced' ? 'novice' : `novice:${personality}`,
    choose(state, content, player) {
      const rng = botRng(state, player);
      // Upkeep and the Child Trait are always decided with care: whims are for turns.
      if (state.phase !== 'action' || nextFloat(rng) >= WHIM) {
        return greedy.choose(state, content, player);
      }
      const options = turnActions(getLegalActions(state, content, player));
      const pick = options[Math.floor(nextFloat(rng) * options.length)];
      return pick ?? greedy.choose(state, content, player);
    },
  };
}
