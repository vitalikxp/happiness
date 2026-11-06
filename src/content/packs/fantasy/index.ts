import type { PackInput } from '../../schema.ts';
import { PACK, toLocale, type Authored } from './define.ts';
import { itemsActivities } from './itemsActivities.ts';
import { jobs } from './jobs.ts';
import { partners } from './partners.ts';
import { projects } from './projects.ts';
import { generalRu } from './texts.ts';
import { childTraits, lifeGoals } from './traitsGoals.ts';

/** «Дорога к счастью»: an ordinary life in a classic fantasy kingdom (docs/CONTENT.md). */

const cards = <T extends Authored>(list: readonly T[]): T['card'][] => list.map((a) => a.card);
const all: Authored[] = [
  ...projects,
  ...itemsActivities,
  ...jobs,
  ...partners,
  ...childTraits,
  ...lifeGoals,
];

export const fantasyPack = {
  id: PACK,
  version: '0.1.0',
  defaultLocale: 'ru',
  locales: { ru: { ...generalRu, ...toLocale(all) } },
  rules: {
    maxRounds: 8,
    stages: { youth: [1, 1], adulthood: [2, 5], oldAge: [6, 8] },
    startTime: 6,
    basicActionYield: 3,
    slotLimit: 3,
    sthRange: 5,
    marketSize: { '1': 3, '2': 3, '3': 3, '4': 4 },
    stressZones: [
      { id: 'blessed', spaces: 3, timeModifier: 1 },
      { id: 'healthy', spaces: 4, timeModifier: 0, start: true },
      { id: 'strained', spaces: 3, timeModifier: -1 },
      { id: 'ill', spaces: 3, timeModifier: -2 },
      { id: 'failing', spaces: 2, timeModifier: -3 },
    ],
    oldAgeStress: { '6': 6, '7': 8, '8': 5 },
    inheritanceRate: 5,
    repeatSpaceStress: 1,
    overtime: { time: 2, stress: 2 },
    rest: { relax: 2 },
    refreshRow: { sth: 1 },
    discardCard: { stress: 1, sth: 1 },
    upkeepFailure: { stress: 1, sth: 1 },
    slotOverloadStress: 1,
    extraPartnerStress: 1,
    promotionTime: 1,
    groupRolesPerPlayer: 2,
    childTraitsDealt: 2,
    solo: { marketPlayers: 2, lifeGoals: 3, winLth: 50 },
  },
  cards: {
    projects: cards(projects),
    itemsActivities: cards(itemsActivities),
    jobs: cards(jobs),
    partners: cards(partners),
    childTraits: cards(childTraits),
    lifeGoals: cards(lifeGoals),
  },
} satisfies PackInput;
