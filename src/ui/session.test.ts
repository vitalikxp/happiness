import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { greedyBot } from '../ai/index.ts';
import { replay } from '../engine/index.ts';
import { content } from './content.ts';
import { history, records } from './history.ts';
import {
  canUndo,
  leaveGame,
  play,
  savedGame,
  session,
  startGame,
  undo,
  type Profile,
  type Session,
} from './session.ts';

const hero: Profile = { name: 'Агнесса', gender: 'f', tincture: 'azure', charge: 'star' };
const bot = greedyBot();

function current(): Session {
  const s = session.value;
  if (!s) throw new Error('no session');
  return s;
}

/** The human plays like a greedy bot (solo: nobody else moves). */
function step(): void {
  const s = current();
  play(bot.choose(s.state, content, s.human));
}

beforeEach(() => {
  localStorage.clear();
  history.value = [];
});
afterEach(leaveGame);

describe('autosave', () => {
  it('R-META-01: an unfinished life is saved after every move and replays to the same state', () => {
    startGame(hero, 0, 'save-test');
    for (let i = 0; i < 5; i++) step();
    const saved = savedGame();
    expect(saved?.actions).toHaveLength(5);
    expect(saved?.state).toEqual(current().state);
    expect(saved?.profiles).toEqual({ p0: hero });
  });

  it('a save made with other content is not offered', () => {
    startGame(hero, 0, 'stale');
    step();
    const raw = localStorage.getItem('happiness.save.v1') ?? '';
    localStorage.setItem(
      'happiness.save.v1',
      raw.replace(/"fingerprint":"[^"]+"/, '"fingerprint":"x"'),
    );
    expect(savedGame()).toBeNull();
  });
});

describe('undo', () => {
  it('takes back the human’s last move of the round, as if it never happened', () => {
    startGame(hero, 0, 'undo-test');
    step(); // Child Trait
    step();
    const before = current();
    step();
    expect(canUndo.value).toBe(true);
    undo();
    const after = current();
    expect(after.actions).toEqual(before.actions);
    expect(after.state).toEqual(before.state);
    expect(after.state).toEqual(replay(after.setup, content, after.seed, after.actions));
    expect(after.undos).toBe(1);
  });

  it('never reaches into a previous round', () => {
    startGame(hero, 0, 'undo-round');
    const round = () => current().state.round;
    step();
    while (round() < 2) step();
    while (canUndo.value) undo();
    const s = current();
    expect(s.state.round).toBe(2);
    expect(s.rounds.at(-1)).toBeLessThan(2);
  });
});

describe('archive', () => {
  it('R-META-01: a finished life goes to the archive with its record and the save is cleared', () => {
    startGame(hero, 0, 'whole-life');
    while (current().state.phase !== 'gameOver') step();
    expect(savedGame()).toBeNull();
    const [life] = history.value;
    expect(life).toMatchObject({ id: 'whole-life', solo: true, players: 1, place: 1 });
    expect(life?.lth).toBe(current().state.players[0]?.lth);
    expect(life?.biography[0]).toMatch(/^Агнесса/);
    expect(records(history.value)).toMatchObject({ lives: 1, bestSolo: life, bestVsBots: null });
    expect(JSON.parse(localStorage.getItem('happiness.history.v1') ?? '[]')).toHaveLength(1);
  });
});
