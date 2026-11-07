import { describe, expect, it } from 'vitest';
import { loadPack } from '../content/index.ts';
import { coreTestPack } from '../content/packs/core-test/index.ts';
import { applyAction, createGame, type GameState } from '../engine/index.ts';
import { botByName, greedyBot, noviceBot, randomBot, type Bot } from './index.ts';

const content = loadPack(coreTestPack);

/** Plays a bot-only game; applyAction throws if a bot ever picks an illegal action. */
function play(bots: Bot[], seed: string): GameState {
  let state = createGame({ players: bots.map(() => ({ kind: 'bot' as const })) }, content, seed);
  for (let step = 0; state.phase !== 'gameOver'; step++) {
    if (step > 5000) throw new Error('did not finish');
    const actor = state.pending?.player ?? state.current ?? '';
    const bot = bots[state.players.findIndex((p) => p.id === actor)];
    if (!bot) throw new Error('no bot');
    state = applyAction(state, content, bot.choose(state, content, actor)).state;
  }
  return state;
}

const avgLth = (bots: Bot[], games: number) => {
  let total = 0;
  for (let i = 0; i < games; i++) total += play(bots, `avg-${String(i)}`).players[0]?.lth ?? 0;
  return total / games;
};

describe('bots', () => {
  it('R-BOT-01: bots only ever choose legal actions and finish games', () => {
    for (const seed of ['a', 'b', 'c']) {
      const end = play([randomBot, greedyBot(), greedyBot('family'), noviceBot()], seed);
      expect(end.phase).toBe('gameOver');
    }
  });

  it('R-BOT-02: greedy plays clearly better than random', () => {
    expect(avgLth([greedyBot()], 10)).toBeGreaterThan(avgLth([randomBot], 10) + 10);
  });

  it('R-BOT-02: the novice sits between random and greedy', () => {
    const novice = avgLth([noviceBot()], 10);
    expect(novice).toBeGreaterThan(avgLth([randomBot], 10));
    expect(novice).toBeLessThan(avgLth([greedyBot()], 10));
  });

  it('R-BOT-03: decisions are reproducible from the game seed', () => {
    const bots = [greedyBot(), noviceBot('scholar'), randomBot];
    expect(play(bots, 'same')).toEqual(play(bots, 'same'));
  });

  it('R-BOT-04: personalities change behaviour', () => {
    const studies = (bot: Bot) => {
      let n = 0;
      for (let i = 0; i < 5; i++) {
        n += play([bot], `taste-${String(i)}`).log.filter(
          (e) => e.type === 'timePlaced' && e.space === 'study',
        ).length;
      }
      return n;
    };
    expect(studies(greedyBot('scholar'))).toBeGreaterThan(studies(greedyBot('artisan')));
  });

  it('botByName parses random, greedy[:<personality>] and novice[:<personality>]', () => {
    expect(botByName('random').name).toBe('random');
    expect(botByName('greedy').name).toBe('greedy');
    expect(botByName('greedy:hedonist').name).toBe('greedy:hedonist');
    expect(botByName('novice').name).toBe('novice');
    expect(botByName('novice:family').name).toBe('novice:family');
    expect(() => botByName('greedy:pirate')).toThrow(/Unknown bot/);
    expect(() => botByName('smart')).toThrow(/Unknown bot/);
  });
});
