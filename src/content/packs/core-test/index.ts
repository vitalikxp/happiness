import type { CardInputOf, PackInput, Reward } from '../../schema.ts';

/**
 * Tiny pack for engine tests. Numbers are deliberately simple; never rebalance it casually —
 * tests depend on these exact values. No locales: tests work with ids.
 */
export const coreTestPack = {
  id: 'core-test',
  version: '0.1.0',
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
    oldAgeStress: { '6': 3, '7': 6, '8': 10 },
    inheritanceRate: 5,
    repeatSpaceStress: 1,
    overtime: { time: 2, stress: 2 },
    rest: { relax: 2 },
    refreshRow: { sth: 1 },
    discardCard: { stress: 1, sth: 1 },
    childTraitsDealt: 2,
    solo: { marketPlayers: 2, lifeGoals: 3, winLth: 50 },
  },
  cards: {
    projects: [
      basic('study_runes', 'arcane'),
      basic('forge_blade', 'craft'),
      basic('court_poetry', 'court'),
      basic('herb_garden', 'nature', { goodHealth: 1, lth: 3 }),
      basic('caravan_route', 'trade'),
      basic('sword_school', 'martial'),
      single('archery_contest', 'martial'),
      single('bard_duel', 'court'),
      group('dragon_hunt', 'martial'),
      group('tower_raising', 'arcane'),
    ],
    itemsActivities: [
      {
        id: 'core-test.item.horse',
        kind: 'item',
        category: 'trade',
        levels: [
          { cost: { money: 2 }, reward: { influence: 1, sth: 1 } },
          {
            cost: { money: 5 },
            reward: { influence: 2, lth: 2 },
            upkeep: { cost: { money: 2 }, reward: { lth: 1 } },
          },
        ],
      },
      item('cottage', 'nature'),
      item('library', 'arcane'),
      item('workshop', 'craft'),
      item('fine_clothes', 'court'),
      item('warhorse', 'martial'),
      activity('feast', 'court'),
      activity('fair', 'trade'),
      activity('hunt', 'nature'),
      activity('pilgrimage', 'faith'),
    ],
    jobs: [
      ...jobTrack('science', 'knowledge'),
      ...jobTrack('arts', 'creativity'),
      ...jobTrack('social', 'influence'),
    ],
    partners: [
      partner('elven_archer', 'creativity'),
      partner('court_scribe', 'knowledge'),
      partner('merchant_heir', 'money'),
      partner('wandering_bard', 'influence'),
      partner('temple_healer', 'knowledge'),
      partner('dwarf_smith', 'creativity'),
    ],
    childTraits: [
      trait('scholar', { knowledge: 2 }, 'study', { knowledge: 1 }),
      trait('artisan', { creativity: 2 }, 'play', { creativity: 1 }),
      trait('charmer', { influence: 2 }, 'interact', { influence: 1 }),
      trait('thrifty', { money: 2 }, 'tempJob', { money: 1 }),
      trait('calm', { knowledge: 1, creativity: 1 }, 'rest', { relax: 1 }),
      trait('dreamer', { creativity: 1, influence: 1 }, 'spend', { sth: 1 }),
      trait('ambitious', { influence: 1, money: 1 }, 'getJob', { influence: 1 }),
      trait('romantic', { creativity: 1, money: 1 }, 'developRelationship', { sth: 1 }),
    ],
    lifeGoals: [
      goal('hoarder', 'moneyAtDeath', 10),
      goal('sage', 'knowledgeAtDeath', 10),
      goal('builder', 'completedProjects', 2),
      goal('long_life', 'roundsLived', 7),
    ],
  },
} satisfies PackInput;

type Category = 'arcane' | 'craft' | 'martial' | 'court' | 'trade' | 'nature' | 'faith';

function basic(
  slug: string,
  category: Category,
  finalReward: Reward = { lth: 6 },
): CardInputOf<'basicProject'> {
  return {
    id: `core-test.project.${slug}`,
    kind: 'basicProject',
    category,
    levels: [
      { cost: { knowledge: 1 }, reward: { creativity: 2 } },
      { cost: { time: 1, creativity: 2 }, reward: { lth: 1, sth: 1 } },
      { cost: { time: 1, knowledge: 2, influence: 1 }, reward: { lth: 3 } },
      { cost: { time: 2, knowledge: 2, creativity: 2 }, reward: finalReward },
    ],
  };
}

function single(slug: string, category: Category): CardInputOf<'singleRoundProject'> {
  return {
    id: `core-test.project.${slug}`,
    kind: 'singleRoundProject',
    category,
    levels: [
      { cost: { creativity: 1 }, reward: { sth: 1 } },
      { cost: { creativity: 3 }, reward: { lth: 1, sth: 1 } },
      { cost: { creativity: 4, knowledge: 2 }, reward: { lth: 3 } },
      { cost: { creativity: 6, knowledge: 3 }, reward: { lth: 5 } },
    ],
  };
}

function group(slug: string, category: Category): CardInputOf<'groupProject'> {
  const role = { cost: { influence: 2 }, reward: { lth: 1 } };
  return {
    id: `core-test.project.${slug}`,
    kind: 'groupProject',
    category,
    roles: [role, role, role, role],
    bonus: [{ money: 1 }, { lth: 1 }, { influence: 1 }, { lth: 2 }],
  };
}

function item(slug: string, category: Category): CardInputOf<'item'> {
  return {
    id: `core-test.item.${slug}`,
    kind: 'item',
    category,
    levels: [
      { cost: { money: 2 }, reward: { sth: 1, lth: 1 } },
      {
        cost: { money: 6 },
        reward: { lth: 3 },
        upkeep: { cost: { money: 1 }, reward: { lth: 1 } },
      },
    ],
  };
}

function activity(slug: string, category: Category): CardInputOf<'activity'> {
  return {
    id: `core-test.activity.${slug}`,
    kind: 'activity',
    category,
    levels: [
      { cost: { money: 1 }, reward: { sth: 1 } },
      { cost: { money: 3 }, reward: { sth: 2, lth: 1 } },
      { cost: { money: 5 }, reward: { sth: 2, lth: 3, relax: 1 } },
    ],
  };
}

type Skill = 'knowledge' | 'creativity' | 'influence';

function jobTrack(track: 'science' | 'arts' | 'social', skill: Skill): CardInputOf<'job'>[] {
  return [1, 2, 3].map((level) => ({
    id: `core-test.job.${track}_l${String(level)}`,
    kind: 'job',
    track,
    level,
    hire: { cost: { [skill]: 2 * level + 2 }, reward: { money: 3 * level + 3 } },
    upkeep: { cost: { time: 1, [skill]: level }, reward: { money: 3 * level + 3 } },
    ...(level < 3
      ? { promotion: { cost: { [skill]: 4 * level }, reward: { money: 2, lth: 3 } } }
      : {}),
  }));
}

function partner(slug: string, taste: Skill | 'money'): CardInputOf<'partner'> {
  return {
    id: `core-test.partner.${slug}`,
    kind: 'partner',
    versions: [{ gender: 'female' }, { gender: 'male' }],
    levels: [
      { reward: { sth: 1, creativity: 1 } },
      {
        requirement: { [taste]: 4 },
        reward: { lth: 2 },
        upkeep: { cost: { time: 1 }, reward: { sth: 1 } },
      },
      {
        requirement: { [taste]: 6 },
        reward: { lth: 4 },
        upkeep: { cost: { time: 1, money: 1 }, reward: { lth: 1 } },
      },
      {
        requirement: { [taste]: 8 },
        reward: { lth: 6 },
        upkeep: { cost: { time: 1, money: 2 }, reward: { lth: 2 } },
      },
    ],
  };
}

function trait(
  slug: string,
  start: Partial<Record<Skill | 'money', number>>,
  on:
    'study' | 'play' | 'interact' | 'tempJob' | 'rest' | 'spend' | 'getJob' | 'developRelationship',
  reward: Record<string, number>,
): CardInputOf<'childTrait'> {
  return { id: `core-test.trait.${slug}`, kind: 'childTrait', start, triggers: [{ on, reward }] };
}

function goal(
  slug: string,
  metric: 'moneyAtDeath' | 'knowledgeAtDeath' | 'completedProjects' | 'roundsLived',
  soloAtLeast: number,
): CardInputOf<'lifeGoal'> {
  return {
    id: `core-test.goal.${slug}`,
    kind: 'lifeGoal',
    metric,
    award: { lth: 5 },
    solo: { atLeast: soloAtLeast },
  };
}
