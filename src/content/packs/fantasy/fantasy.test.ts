import { describe, expect, it } from 'vitest';
import { budgetPack } from '../../budget.ts';
import { cardTextKeys, GENERIC_TEXT_KEYS } from '../../text.ts';
import { validatePack } from '../../validate.ts';
import { fantasyPack } from './index.ts';

const result = validatePack(fantasyPack);
if (!result.ok) throw new Error(`fantasy pack is invalid:\n${result.errors.join('\n')}`);
const pack = result.pack;
const ru = pack.locales?.ru ?? {};
const cards = Object.values(pack.cards).flat();

describe('fantasy pack', () => {
  it('has the deck sizes of docs/CONTENT.md §4', () => {
    const count = (kind: string) => cards.filter((c) => c.kind === kind).length;
    expect(pack.cards.projects).toHaveLength(48);
    expect([count('basicProject'), count('singleRoundProject'), count('groupProject')]).toEqual([
      30, 10, 8,
    ]);
    expect(pack.cards.itemsActivities).toHaveLength(40);
    expect([count('item'), count('activity')]).toEqual([24, 16]);
    expect(pack.cards.jobs).toHaveLength(18);
    expect(pack.cards.partners).toHaveLength(12);
    expect(pack.cards.childTraits).toHaveLength(8);
    expect(pack.cards.lifeGoals).toHaveLength(9);
  });

  it('offers at least 8 Good Health projects', () => {
    const health = pack.cards.projects.filter(
      (c) => c.kind === 'basicProject' && c.levels.some((l) => l.reward.goodHealth),
    );
    expect(health.length).toBeGreaterThanOrEqual(8);
  });

  it('is within its budget bands', () => {
    expect(budgetPack(pack).filter((l) => !l.ok)).toEqual([]);
  });

  it('has every Russian text, and no stray card keys', () => {
    const required = new Set([...GENERIC_TEXT_KEYS, ...cards.flatMap(cardTextKeys)]);
    const ids = new Set(cards.map((c) => c.id));
    const stray = Object.keys(ru).filter((key) => {
      const card = key.split('.').slice(0, 3).join('.');
      return ids.has(card) && !required.has(key) && !key.endsWith('.name');
    });
    expect(stray).toEqual([]);
    expect([...required].filter((key) => !ru[key])).toEqual([]);
  });

  it('biography templates only use known placeholders and come in both genders', () => {
    const allowed = new Set(['age', 'name', 'card', 'level', 'partner', 'lth']);
    for (const [key, text] of Object.entries(ru).filter(([k]) => k.startsWith('bio.'))) {
      for (const [, name] of text.matchAll(/\{(\w+)\}/g)) expect(allowed, key).toContain(name);
      if (key.endsWith('.f')) expect(ru[key.replace(/\.f$/, '.m')], key).toBeTruthy();
    }
  });
});
