import type { AchievementCondition, Pack } from '../../schema.ts';
import { id } from './define.ts';

// Achievements (R-META-02) and what they unlock (R-META-03). Conditions are checked for the human
// when a life ends.

type Achievement = NonNullable<Pack['achievements']>[number];

interface Authored {
  achievement: Achievement;
  ru: { name: string; description: string };
}

function achievement(
  slug: string,
  when: AchievementCondition[],
  unlocks: string[],
  name: string,
  description: string,
): Authored {
  return {
    achievement: { id: id('achievement', slug), when, ...(unlocks.length ? { unlocks } : {}) },
    ru: { name, description },
  };
}

const metric = (m: Extract<AchievementCondition, { kind: 'metric' }>['metric'], atLeast: number) =>
  ({ kind: 'metric', metric: m, atLeast }) as const;

const authored: Authored[] = [
  achievement(
    'first_chronicle',
    [metric('lth', 0)],
    [],
    'Первая летопись',
    'Прожить жизнь до конца.',
  ),
  achievement(
    'long_road',
    [metric('roundsLived', 8)],
    [id('trait', 'iron_will')],
    'Долгая дорога',
    'Дожить до последней главы.',
  ),
  achievement(
    'guild_master',
    [metric('jobLevel', 3)],
    [id('trait', 'wanderer_blood')],
    'Мастер гильдии',
    'Дослужиться до должности 3-го уровня.',
  ),
  achievement(
    'family_hearth',
    [metric('partnerLevel', 4)],
    [id('trait', 'hearth_keeper')],
    'Семейный очаг',
    'Дойти со спутником жизни до «Семьи».',
  ),
  achievement(
    'lone_victory',
    [{ kind: 'win', maxOpponents: 0 }],
    [id('trait', 'lucky_moon')],
    'Своя дорога',
    'Победить в одиночной жизни.',
  ),
  achievement(
    'first_among_equals',
    [{ kind: 'win', minOpponents: 3 }],
    [id('goal', 'treasury_of_talents')],
    'Первый среди равных',
    'Победить трёх соперников.',
  ),
  achievement(
    'masterwork',
    [metric('basicProjectsCompleted', 2)],
    [id('goal', 'master_builder')],
    'Дважды до конца',
    'Довести два начинания до последнего шага.',
  ),
  achievement(
    'bon_vivant',
    [metric('activitiesDone', 4)],
    [id('goal', 'joy_of_life')],
    'Жизнелюб',
    'Провести досуг четыре раза за жизнь.',
  ),
  achievement('happy_life', [metric('lth', 60)], [], 'Счастливая жизнь', 'Набрать 60 Счастья.'),
  achievement(
    'full_house',
    [metric('itemsOwned', 4)],
    [],
    'Полный дом',
    'Владеть четырьмя вещами.',
  ),
  achievement(
    'golden_chest',
    [metric('moneyAtDeath', 15)],
    [],
    'Сундук золота',
    'Оставить после себя 15 Золота.',
  ),
];

export const achievements: Achievement[] = authored.map((a) => a.achievement);

export const achievementsRu: Record<string, string> = Object.fromEntries(
  authored.flatMap(({ achievement: a, ru }) => [
    [`${a.id}.name`, ru.name],
    [`${a.id}.description`, ru.description],
  ]),
);
