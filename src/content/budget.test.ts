import { describe, expect, it } from 'vitest';
import { budgetCard, budgetPack } from './budget.ts';
import { PACKS } from './packs/index.ts';
import type { Card } from './schema.ts';
import { validatePack } from './validate.ts';

describe('budget linter', () => {
  it('computes net = reward − cost − 3R per Time for each level', () => {
    const card: Card = {
      id: 't.project.x',
      kind: 'basicProject',
      category: 'craft',
      levels: [
        { cost: { knowledge: 1 }, reward: { creativity: 4 } }, // 4 − 1 − 3 = 0
        // Resource-only rewards keep this test independent of the LTH price.
        { cost: { time: 1, creativity: 1 }, reward: { creativity: 6 } }, // 6 − 4 = 2
        { cost: { time: 1 }, reward: { knowledge: 2 } }, // 2 − 3 = −1 → out of band
        { cost: { time: 2, knowledge: 1 }, reward: { knowledge: 12 } }, // 12 − 7 = 5
      ],
    };
    expect(budgetCard(card).map((l) => [l.part, l.net, l.ok])).toEqual([
      ['L1', 0, true],
      ['L2', 2, true],
      ['L3', -1, false],
      ['L4', 5, true],
    ]);
  });

  it('a balanceNote accepts an out-of-band card', () => {
    const result = validatePack(PACKS['core-test']);
    if (!result.ok) throw new Error('core-test must be valid');
    const pack = structuredClone(result.pack);
    const job = pack.cards.jobs[0];
    if (!job) throw new Error('no job');
    job.upkeep.reward = { money: 100 };
    expect(budgetPack(pack).find((l) => l.card === job.id && l.part === 'per round')?.ok).toBe(
      false,
    );
    job.balanceNote = 'test: intentionally generous';
    expect(budgetPack(pack).find((l) => l.card === job.id && l.part === 'per round')?.ok).toBe(
      true,
    );
  });

  it('every pack that opts into budget linting is within its bands', () => {
    for (const [id, input] of Object.entries(PACKS)) {
      const result = validatePack(input);
      if (!result.ok) throw new Error(`${id} is invalid`);
      if (result.pack.budgetLint === false) continue;
      expect(
        budgetPack(result.pack).filter((l) => !l.ok),
        id,
      ).toEqual([]);
    }
  });
});
