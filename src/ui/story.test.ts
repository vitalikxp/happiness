import { describe, expect, it } from 'vitest';
import { greedyBot } from '../ai/index.ts';
import { applyAction, createGame, type GameState } from '../engine/index.ts';
import { content } from './content.ts';
import { optionsFor } from './options.ts';
import type { Profile } from './session.ts';
import { biography, chronicle } from './story.ts';

const agnes: Profile = { name: 'Агнесса', gender: 'f', tincture: 'azure', charge: 'star' };
const gideon: Profile = { name: 'Гедеон', gender: 'm', tincture: 'gules', charge: 'cross' };

/** A whole fantasy game played by greedy bots for both seats. */
function playedGame(seed: string): GameState {
  let state = createGame({ players: [{ kind: 'human' }, { kind: 'bot' }] }, content, seed);
  const bots = [greedyBot('family'), greedyBot('scholar')];
  while (state.phase !== 'gameOver') {
    const actor = state.pending?.player ?? state.current ?? '';
    const bot = bots[state.players.findIndex((p) => p.id === actor)];
    if (!bot) throw new Error('no bot');
    state = applyAction(state, content, bot.choose(state, content, actor)).state;
  }
  return state;
}

const game = playedGame('story');
const profiles = { p0: agnes, p1: gideon };

describe('chronicle', () => {
  const entries = chronicle(game, content, profiles);

  it('opens a chapter per round and ends with the end of the chronicle', () => {
    const chapters = entries.filter((e) => e.kind === 'chapter').map((e) => e.text);
    expect(chapters[0]).toBe('Глава 1. Юность');
    expect(chapters.some((c) => c.includes('Старость'))).toBe(true);
    expect(entries.at(-1)?.text).toBe('Конец летописи.');
  });

  it('names players and never leaks raw keys or placeholders', () => {
    const lines = entries.filter((e) => e.kind === 'line');
    expect(lines.some((e) => e.text.startsWith('Агнесса'))).toBe(true);
    for (const entry of entries) {
      expect(entry.text).not.toMatch(/\{|\}|fantasy\.|undefined/);
    }
  });
});

describe('biography', () => {
  it('tells a life in the player’s grammatical gender, from birth to the final tally', () => {
    const her = biography(game, content, 'p0', agnes);
    const his = biography(game, content, 'p1', gideon);
    expect(her[0]).toMatch(/^Агнесса родилась под знамением «.+»\.$/);
    expect(his[0]).toMatch(/^Гедеон родился под знамением «.+»\.$/);
    expect(her.at(-1)).toMatch(/^Её жизнь принесла \d+ Счастья\.$/);
    expect(his.at(-1)).toMatch(/^Его жизнь принесла \d+ Счастья\.$/);
    for (const line of [...her, ...his]) expect(line).not.toMatch(/\{|\}|bio\.|fantasy\./);
    expect(her.length).toBeGreaterThan(3);
  });
});

describe('options for the UI', () => {
  it('groups every candidate action and explains the illegal ones', () => {
    let state = createGame({ players: [{ kind: 'human' }] }, content, 'opts');
    const trait = optionsFor(state, content, 'p0').traits[0];
    if (!trait) throw new Error('no trait option');
    state = applyAction(state, content, trait.action).state;
    const options = optionsFor(state, content, 'p0');
    expect(options.spaces.study).toMatchObject({ legal: true });
    expect(options.spaces.study?.delta?.time).toBe(-1);
    expect(options.market.size).toBeGreaterThan(0);
    const illegal = [...options.market.values()].flat().find((o) => !o.legal);
    expect(illegal?.reasons.length).toBeGreaterThan(0);
    expect(illegal?.delta).toBeNull();
  });
});
