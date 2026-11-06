import { getLegalActions, nextFloat } from '../engine/index.ts';
import { botRng, turnActions, type Bot } from './types.ts';

/** Uniformly random legal moves — for tests and as a baseline in simulations (R-BOT-02). */
export const randomBot: Bot = {
  name: 'random',
  choose(state, content, player) {
    const options = turnActions(getLegalActions(state, content, player));
    const pick = options[Math.floor(nextFloat(botRng(state, player)) * options.length)];
    if (!pick) throw new Error(`No legal action for ${player}`);
    return pick;
  },
};
