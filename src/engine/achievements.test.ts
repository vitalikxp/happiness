import { describe, expect, it } from 'vitest';
import { earnedAchievements } from './achievements.ts';
import { createGame } from './game.ts';
import { content, edit, playToEnd, setupFor, startedGame } from './testing.ts';
import type { GameState } from './types.ts';

const LUCKY = 'core-test.trait.lucky';
const COLLECTOR = 'core-test.goal.collector';

/** All trait offers and Life Goals of many games with this setup. */
function dealt(unlocked?: string[]): Set<string> {
  const cards = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const setup = { ...setupFor(4), ...(unlocked ? { unlocked } : {}) };
    const state = createGame(setup, content, `deal-${String(i)}`);
    for (const p of state.players) for (const card of p.traitOffer) cards.add(card);
    for (const card of state.lifeGoals) cards.add(card);
  }
  return cards;
}

describe('unlockable content', () => {
  it('R-META-03: locked cards stay out of the decks unless the setup unlocks them', () => {
    const base = dealt();
    expect(base.has(LUCKY)).toBe(false);
    expect(base.has(COLLECTOR)).toBe(false);
    const unlocked = dealt([LUCKY, COLLECTOR]);
    expect(unlocked.has(LUCKY)).toBe(true);
    expect(unlocked.has(COLLECTOR)).toBe(true);
  });

  it('R-META-03: games without unlocks are dealt exactly as before (base decks unchanged)', () => {
    const a = createGame(setupFor(2), content, 'same');
    const b = createGame({ ...setupFor(2), unlocked: [] }, content, 'same');
    expect(b).toEqual(a);
  });
});

describe('achievements', () => {
  const finished = (state: GameState) => playToEnd(state);

  it('R-META-02: nothing is earned before the game ends', () => {
    expect(earnedAchievements(startedGame(1), content, 'p0')).toEqual([]);
  });

  it('R-META-02: metric conditions are checked on the finished game', () => {
    const end = finished(startedGame(1));
    const earned = earnedAchievements(end, content, 'p0');
    const rounds = end.players[0]?.death?.round ?? 0;
    expect(earned.includes('core-test.achievement.survivor')).toBe(rounds >= 2);
    expect(earned).not.toContain('core-test.achievement.rich');
  });

  it('R-META-02: win conditions respect the number of opponents', () => {
    const solo = edit(finished(startedGame(1)), (d) => {
      if (d.result?.solo) d.result.solo.won = true;
    });
    expect(earnedAchievements(solo, content, 'p0')).not.toContain('core-test.achievement.winner');

    const duel = finished(startedGame(2));
    const winner = duel.result?.winners[0] ?? '';
    const loser = duel.players.find((p) => p.id !== winner)?.id ?? '';
    expect(earnedAchievements(duel, content, winner)).toContain('core-test.achievement.winner');
    if (duel.result?.winners.length === 1) {
      expect(earnedAchievements(duel, content, loser)).not.toContain(
        'core-test.achievement.winner',
      );
    }
  });
});
