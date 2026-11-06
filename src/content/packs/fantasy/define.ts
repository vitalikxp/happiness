import type { CardInputOf, CardKind, ResourceBundle, Reward } from '../../schema.ts';

// Authoring helpers for the fantasy pack: each card is written together with its Russian texts;
// the `ru` locale is assembled from them (keys: docs/CONTENT.md §6, `src/content/text.ts`).

export interface CardTexts {
  name: string;
  flavor: string;
  /** Level names (projects, items, activities) or role names (group projects). */
  parts?: readonly string[];
  /** Partner names: [female version, male version]. */
  versions?: readonly [string, string];
}

/** A card with its texts; distributes over kinds so lists can mix them. */
export type Authored<K extends CardKind = CardKind> = K extends CardKind
  ? { card: CardInputOf<K>; ru: CardTexts }
  : never;

export const PACK = 'fantasy';

export type Skill = 'knowledge' | 'creativity' | 'influence';
export type Res = Skill | 'money';
export type Category = 'arcane' | 'craft' | 'martial' | 'court' | 'trade' | 'nature' | 'faith';

export const id = (kind: string, slug: string) => `${PACK}.${kind}.${slug}`;

/** `{ a: 2, b: 1 }` with repeated resources summed (`bundle(['knowledge', 2], ['knowledge', 1])`). */
export function bundle(...parts: [Res, number][]): ResourceBundle {
  const out: Partial<Record<Res, number>> = {};
  for (const [r, n] of parts) out[r] = (out[r] ?? 0) + n;
  return out;
}

export function reward(...parts: [Res, number][]): Reward {
  return bundle(...parts);
}

/** Flatten authored cards into locale entries. */
export function toLocale(cards: readonly Authored[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { card, ru } of cards) {
    out[`${card.id}.name`] = ru.name;
    out[`${card.id}.flavor`] = ru.flavor;
    const prefix = card.kind === 'groupProject' ? 'role' : 'l';
    ru.parts?.forEach((part, i) => (out[`${card.id}.${prefix}${String(i + 1)}`] = part));
    ru.versions?.forEach((name, i) => (out[`${card.id}.v${String(i)}.name`] = name));
  }
  return out;
}
