import { bundle, id, type Authored } from './define.ts';

// 8 base Child Traits (start resources worth ~4 R + an ability) and 9 base Life Goals.
// Unlockable traits/goals arrive with meta-progression (M6, R-META-03).

export const childTraits: Authored<'childTrait'>[] = [
  {
    card: {
      id: id('trait', 'sage_star'),
      kind: 'childTrait',
      start: bundle(['knowledge', 3], ['money', 1]),
      triggers: [{ on: 'study', reward: bundle(['knowledge', 1]) }],
    },
    ru: {
      name: 'Под звездой мудреца',
      flavor: 'Книги открываются сами, стоит вам подойти. Учёба приносит +1 Мудрость.',
    },
  },
  {
    card: {
      id: id('trait', 'forge_child'),
      kind: 'childTrait',
      start: bundle(['creativity', 3], ['money', 1]),
      triggers: [{ on: 'play', reward: bundle(['creativity', 1]) }],
    },
    ru: {
      name: 'Дитя кузницы',
      flavor: 'Первой игрушкой был молоток. Упражнения приносят +1 Мастерство.',
    },
  },
  {
    card: {
      id: id('trait', 'herald_voice'),
      kind: 'childTrait',
      start: bundle(['influence', 3], ['money', 1]),
      triggers: [{ on: 'interact', reward: bundle(['influence', 1]) }],
    },
    ru: {
      name: 'Голос глашатая',
      flavor: 'Вас слышно с другого конца площади. Вечер в таверне приносит +1 Славу.',
    },
  },
  {
    card: {
      id: id('trait', 'merchant_blood'),
      kind: 'childTrait',
      start: bundle(['money', 2], ['influence', 2]),
      triggers: [{ on: 'tempJob', reward: bundle(['money', 1]) }],
    },
    ru: {
      name: 'Купеческая жилка',
      flavor: 'Торговаться начали раньше, чем говорить. Подработка приносит +1 Золото.',
    },
  },
  {
    card: {
      id: id('trait', 'silver_spoon'),
      kind: 'childTrait',
      start: bundle(['money', 4]),
      triggers: [{ on: 'spend', reward: { sth: 1 } }],
    },
    ru: {
      name: 'Серебряная ложка',
      flavor: 'Родились в достатке и умеете им наслаждаться. Каждая трата приносит +1 Радость.',
    },
  },
  {
    card: {
      id: id('trait', 'storm_night'),
      kind: 'childTrait',
      start: bundle(['influence', 2], ['creativity', 2]),
      triggers: [{ on: 'overtime', reward: { relax: 1 } }],
    },
    ru: {
      name: 'Гроза в ночь рождения',
      flavor: 'Бури вам нипочём. Бессонные ночи дают Передышку.',
    },
  },
  {
    card: {
      id: id('trait', 'fairy_kiss'),
      kind: 'childTrait',
      start: bundle(['creativity', 2], ['knowledge', 1], ['influence', 1]),
      triggers: [{ on: 'developRelationship', reward: { sth: 1 } }],
    },
    ru: {
      name: 'Поцелуй феи',
      flavor: 'Сердца тянутся к вам. Сердечные дела приносят +1 Радость.',
    },
  },
  {
    card: {
      id: id('trait', 'quiet_soul'),
      kind: 'childTrait',
      start: bundle(['knowledge', 2], ['creativity', 2]),
      triggers: [{ on: 'rest', reward: { relax: 1 } }],
    },
    ru: {
      name: 'Тихий нрав',
      flavor: 'Умеете отдыхать по-настоящему. Отдых снимает ещё немного Бремени.',
    },
  },
];

type Metric =
  | 'knowledgeAtDeath'
  | 'creativityAtDeath'
  | 'influenceAtDeath'
  | 'moneyAtDeath'
  | 'completedProjects'
  | 'itemsOwned'
  | 'partnerLevel'
  | 'jobLevel'
  | 'roundsLived';

function goal(
  slug: string,
  metric: Metric,
  lth: number,
  soloAtLeast: number,
  name: string,
  flavor: string,
): Authored<'lifeGoal'> {
  return {
    card: {
      id: id('goal', slug),
      kind: 'lifeGoal',
      metric,
      award: { lth },
      solo: { atLeast: soloAtLeast },
    },
    ru: { name, flavor },
  };
}

export const lifeGoals: Authored<'lifeGoal'>[] = [
  goal(
    'keeper_of_lore',
    'knowledgeAtDeath',
    5,
    8,
    'Хранитель знаний',
    'Больше всех Мудрости к концу жизни. Соло: не меньше 8.',
  ),
  goal(
    'master_of_crafts',
    'creativityAtDeath',
    5,
    8,
    'Золотые руки',
    'Больше всех Мастерства к концу жизни. Соло: не меньше 8.',
  ),
  goal(
    'name_in_chronicles',
    'influenceAtDeath',
    5,
    8,
    'Имя в летописях',
    'Больше всех Славы к концу жизни. Соло: не меньше 8.',
  ),
  goal(
    'rich_legacy',
    'moneyAtDeath',
    5,
    12,
    'Богатое наследство',
    'Больше всех Золота к концу жизни. Соло: не меньше 12.',
  ),
  goal(
    'life_work',
    'completedProjects',
    5,
    5,
    'Дело всей жизни',
    'Больше всех завершённых начинаний, испытаний и походов. Соло: не меньше 5.',
  ),
  goal(
    'full_cup',
    'itemsOwned',
    5,
    5,
    'Полная чаша',
    'Больше всех имущества. Соло: не меньше 5 предметов.',
  ),
  goal(
    'big_family',
    'partnerLevel',
    5,
    3,
    'Большая семья',
    'Самые крепкие отношения со спутником жизни. Соло: дойти до «Союза».',
  ),
  goal(
    'guild_peak',
    'jobLevel',
    5,
    3,
    'Вершина гильдии',
    'Самая высокая должность. Соло: служба 3-го уровня.',
  ),
  goal(
    'long_life',
    'roundsLived',
    5,
    8,
    'Долгожитель',
    'Прожить дольше всех. Соло: дожить до последнего раунда.',
  ),
];
