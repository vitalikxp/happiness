import type { BoardSpaceId } from '../content/index.ts';

/** R-BOT-04: flavor weights that make bots (and their biographies) differ. */
export const PERSONALITIES = [
  'balanced',
  'scholar',
  'artisan',
  'courtier',
  'family',
  'hedonist',
] as const;
export type Personality = (typeof PERSONALITIES)[number];

export interface Taste {
  categories: readonly string[];
  tracks: readonly string[];
  spaces: readonly BoardSpaceId[];
  partners: boolean;
  itemsActivities: boolean;
}

/** Multiplier for positive scores of actions matching the bot's taste. */
export const TASTE_BONUS = 1.3;

export const TASTES: Record<Personality, Taste> = {
  balanced: { categories: [], tracks: [], spaces: [], partners: false, itemsActivities: false },
  scholar: {
    categories: ['arcane', 'faith'],
    tracks: ['science'],
    spaces: ['study'],
    partners: false,
    itemsActivities: false,
  },
  artisan: {
    categories: ['craft', 'nature'],
    tracks: ['arts'],
    spaces: ['play'],
    partners: false,
    itemsActivities: false,
  },
  courtier: {
    categories: ['court', 'trade', 'martial'],
    tracks: ['social'],
    spaces: ['interact'],
    partners: false,
    itemsActivities: false,
  },
  family: { categories: [], tracks: [], spaces: [], partners: true, itemsActivities: false },
  hedonist: { categories: [], tracks: [], spaces: [], partners: false, itemsActivities: true },
};
