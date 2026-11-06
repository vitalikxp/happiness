import { describe, expect, it } from 'vitest';
import { coreTestPack } from './packs/core-test/index.ts';
import type { PackInput } from './schema.ts';
import { loadPack, validatePack } from './validate.ts';

const clonePack = (): PackInput => structuredClone(coreTestPack);

function at<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No item at ${String(index)}`);
  return item;
}

describe('validatePack', () => {
  it('accepts the core-test pack', () => {
    const result = validatePack(coreTestPack);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('indexes every card and deck', () => {
    const content = loadPack(coreTestPack);
    expect(content.cards.size).toBe(47);
    expect(content.decks.childTraits).toHaveLength(8);
    expect(content.cards.get('core-test.job.arts_l2')?.kind).toBe('job');
  });

  it('rejects unknown fields (typos in content)', () => {
    const pack = clonePack();
    Object.assign(at(pack.cards.projects, 0), { lht: 1 });
    expect(validatePack(pack)).toMatchObject({ ok: false });
  });

  it('rejects duplicate ids and ids outside the pack namespace', () => {
    const pack = clonePack();
    at(pack.cards.itemsActivities, 1).id = at(pack.cards.itemsActivities, 0).id;
    at(pack.cards.partners, 0).id = 'other.partner.someone';
    const result = validatePack(pack);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('duplicate card id'))).toBe(true);
    expect(result.errors.some((e) => e.startsWith('other.partner.someone'))).toBe(true);
  });

  it('checks rules consistency: single start zone, contiguous stages, old-age keys', () => {
    const pack = clonePack();
    at(pack.rules.stressZones, 0).start = true;
    pack.rules.stages.adulthood = [3, 5];
    pack.rules.oldAgeStress['3'] = 1;
    const result = validatePack(pack);
    expect(result.ok ? [] : result.errors).toEqual([
      'rules.stressZones: exactly one zone must have start (found 2)',
      'rules.stages.adulthood: must start at round 2 and not end before it starts',
      'rules.oldAgeStress.3: round is not an Old Age round',
    ]);
  });

  it('requires promotions below the top job level only, and every track × level', () => {
    const pack = clonePack();
    delete at(pack.cards.jobs, 0).promotion;
    pack.cards.jobs.splice(8, 1);
    const result = validatePack(pack);
    expect(result.ok ? [] : result.errors).toEqual([
      'core-test.job.science_l1: job below level 3 needs a promotion',
      'cards.jobs: missing social job of level 3',
    ]);
  });
});
