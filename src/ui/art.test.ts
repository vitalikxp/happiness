import { describe, expect, it } from 'vitest';
import { ART } from './art.ts';
import { content } from './content.ts';

describe('bundled card art (art/STYLE.md §4)', () => {
  it('is named by known card ids', () => {
    expect([...ART.keys()].filter((id) => !content.cards.has(id))).toEqual([]);
  });
});
