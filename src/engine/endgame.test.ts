import { describe, expect, it } from 'vitest';
import { finishGame } from './flow.ts';
import { getLegalActions } from './game.ts';
import {
  calmAction,
  content,
  edit,
  finishRound,
  playToEnd,
  playerOf,
  startedGame,
} from './testing.ts';
import type { Action, GameState } from './types.ts';

describe('death & end of game', () => {
  it('scripted solo life: plays from setup to game over', () => {
    const end = playToEnd(startedGame(1, 'scripted'));
    expect(end.phase).toBe('gameOver');
    expect(end.current).toBeNull();
    // Calm play only Rests; Old Age Stress (+3, +6, +10) still kills in the last round.
    expect(playerOf(end, 'p0').death).toEqual({ round: 8, cause: 'oldAge' });
    expect(end.result?.winners).toEqual(['p0']);
  });

  it('R-DTH-01: a player still alive after the last round dies of old age at its end', () => {
    let state = startedGame(1);
    while (state.round < 7) state = finishRound(state);
    state = edit(state, (d) => {
      const p0 = d.players[0];
      if (p0) p0.stress = 0; // survives round 8's Old Age Stress (+10 → space 10)
    });
    const last = finishRound(state);
    expect(last).toMatchObject({ round: 8, phase: 'action' });
    const end = finishRound(last);
    expect(end.phase).toBe('gameOver');
    expect(playerOf(end, 'p0').death).toEqual({ round: 8, cause: 'endOfLife' });
  });

  it('R-RND-03: the game continues while anyone lives, and ends when all have died', () => {
    const state = edit(startedGame(2), (d) => {
      const p1 = d.players[1];
      if (p1) p1.stress = 14;
    });
    // p1 always studies: the second Study this round costs 1 Stress and kills; p0 plays on alone.
    const policy = (s: GameState): Action =>
      s.current === 'p1' ? { type: 'placeTime', player: 'p1', space: 'study' } : calmAction(s);
    let next = finishRound(state, policy);
    expect(playerOf(next, 'p1').alive).toBe(false);
    expect(next.phase).toBe('action');
    expect(getLegalActions(next, content, 'p1')).toEqual([]);
    next = playToEnd(next);
    expect(next.phase).toBe('gameOver');
  });

  it('R-DTH-03: highest LTH wins; ties broken by resources + money held at death; then shared', () => {
    const ended = (lth: number[], money: number[]): GameState =>
      edit(startedGame(3), (d) => {
        d.players.forEach((p, i) => {
          p.lth = lth[i] ?? 0;
          p.resources = { knowledge: 0, creativity: 0, influence: 0, money: money[i] ?? 0 };
        });
        finishGame(d);
      });
    expect(ended([10, 12, 3], [0, 0, 0]).result?.winners).toEqual(['p1']);
    expect(ended([12, 12, 3], [1, 4, 9]).result).toMatchObject({
      winners: ['p1'],
      standings: [
        { player: 'p1', lth: 12, leftovers: 4 },
        { player: 'p0', lth: 12, leftovers: 1 },
        { player: 'p2', lth: 3, leftovers: 9 },
      ],
    });
    expect(ended([12, 12, 3], [4, 4, 0]).result?.winners).toEqual(['p0', 'p1']);
  });
});
