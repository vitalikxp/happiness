import { BOARD_SPACES, RESOURCES, STAGES, type Card, type Pack } from './schema.ts';

// Text keys of a content pack (docs/CONTENT.md §6). Card texts live under the card id.

/** Keys every pack with locales provides, besides per-card texts. */
export const GENERIC_TEXT_KEYS: readonly string[] = [
  'pack.name',
  ...RESOURCES.map((r) => `term.${r}`),
  ...['time', 'stress', 'sth', 'lth', 'relax', 'goodHealth'].map((t) => `term.${t}`),
  ...STAGES.map((s) => `stage.${s}`),
  ...BOARD_SPACES.map((s) => `space.${s}`),
  ...[1, 2, 3, 4].map((l) => `partnerLevel.${String(l)}`),
  ...['science', 'arts', 'social'].map((t) => `track.${t}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((r) => `bio.age.${String(r)}`),
  ...[
    'bio.trait',
    'bio.project.completed',
    'bio.project.single',
    'bio.project.group',
    'bio.item',
    'bio.activity',
    'bio.job.hired',
    'bio.job.promoted',
    'bio.partner.met',
    'bio.partner.2',
    'bio.partner.3',
    'bio.partner.4',
    'bio.died.stress',
    'bio.died.oldAge',
    'bio.died.endOfLife',
    'bio.summary',
  ].flatMap((key) => [`${key}.f`, `${key}.m`]),
];

/** Texts a single card needs: name, flavor, and one name per level / role / version. */
export function cardTextKeys(card: Card): string[] {
  const keys = [`${card.id}.name`, `${card.id}.flavor`];
  const numbered = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => `${card.id}.${prefix}${String(i + 1)}`);
  switch (card.kind) {
    case 'basicProject':
    case 'singleRoundProject':
    case 'item':
    case 'activity':
      return [...keys, ...numbered('l', card.levels.length)];
    case 'groupProject':
      return [...keys, ...numbered('role', card.roles.length)];
    case 'partner':
      return [`${card.id}.v0.name`, `${card.id}.v1.name`, keys[1] ?? ''];
    case 'job':
    case 'childTrait':
    case 'lifeGoal':
      return keys;
  }
}

/** Missing required keys in the pack's default locale (empty when the pack has no locales). */
export function missingTextKeys(pack: Pack): string[] {
  if (!pack.locales) return [];
  const texts = pack.locales[pack.defaultLocale ?? ''] ?? {};
  const required = [
    ...GENERIC_TEXT_KEYS,
    ...Object.values(pack.cards).flat().flatMap(cardTextKeys),
    ...(pack.achievements ?? []).flatMap((a) => [`${a.id}.name`, `${a.id}.description`]),
  ];
  return required.filter((key) => !texts[key]?.trim());
}
