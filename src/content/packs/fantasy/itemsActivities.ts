import { bundle, id, type Authored, type Category, type Skill } from './define.ts';

// 24 items and 16 activities. Budgets (BALANCE §3): item level −1…+2 R (upkeep levels judged over
// 3 rounds), activity level 0…+2 R. Each line below names the card's shape.

type ItemShape =
  /** Happiness that grows with comfort (3 levels, upkeep at 2–3). */
  | 'grand'
  /** Something nice to own (2 levels, upkeep at 2). */
  | 'small'
  /** Pays a resource every round. */
  | { skill: Skill }
  /** Rest for body and soul. */
  | 'relaxing';

function item(
  slug: string,
  category: Category,
  shape: ItemShape,
  name: string,
  parts: string[],
  flavor: string,
): Authored<'item'> {
  const g = (n: number) => bundle(['money', n]);
  const levels =
    shape === 'grand'
      ? [
          { cost: g(3), reward: { lth: 1, sth: 1, ...bundle(['influence', 2]) } },
          { cost: g(6), reward: { lth: 3 }, upkeep: { cost: g(2), reward: { lth: 1 } } },
          {
            cost: g(9),
            reward: { lth: 4, sth: 1 },
            upkeep: { cost: g(3), reward: { lth: 1, sth: 1 } },
          },
        ]
      : shape === 'small'
        ? [
            { cost: g(2), reward: { lth: 1, sth: 2 } },
            { cost: g(5), reward: { lth: 2, sth: 1 }, upkeep: { cost: g(2), reward: { lth: 1 } } },
          ]
        : shape === 'relaxing'
          ? [
              { cost: g(2), reward: { lth: 1, sth: 1, relax: 1 } },
              {
                cost: g(5),
                reward: { lth: 2, relax: 1 },
                upkeep: { cost: g(1), reward: { relax: 1 } },
              },
            ]
          : [
              { cost: g(2), reward: { lth: 1, ...bundle([shape.skill, 3]) } },
              {
                cost: g(5),
                reward: { lth: 1, ...bundle([shape.skill, 2]) },
                upkeep: { cost: g(1), reward: bundle([shape.skill, 2]) },
              },
            ];
  if (parts.length !== levels.length)
    throw new Error(`${slug}: ${String(levels.length)} level names expected`);
  return {
    card: { id: id('item', slug), kind: 'item', category, levels },
    ru: { name, flavor, parts },
  };
}

type ActivityShape = 'leisure' | { skill: Skill };

function activity(
  slug: string,
  category: Category,
  shape: ActivityShape,
  name: string,
  parts: [string, string, string],
  flavor: string,
): Authored<'activity'> {
  const g = (n: number) => bundle(['money', n]);
  const levels =
    shape === 'leisure'
      ? [
          { cost: g(1), reward: { lth: 1, sth: 2 } },
          { cost: g(3), reward: { lth: 2, sth: 1 } },
          { cost: g(5), reward: { lth: 2, sth: 2, relax: 1 } },
        ]
      : [
          { cost: g(1), reward: { lth: 1, ...bundle([shape.skill, 2]) } },
          { cost: g(3), reward: { lth: 2, ...bundle([shape.skill, 1]) } },
          { cost: g(5), reward: { lth: 2, sth: 1, ...bundle([shape.skill, 2]) } },
        ];
  return {
    card: { id: id('activity', slug), kind: 'activity', category, levels },
    ru: { name, flavor, parts },
  };
}

export const itemsActivities: Authored<'item' | 'activity'>[] = [
  // Items
  item(
    'house',
    'trade',
    'grand',
    'Дом',
    ['Хижина', 'Дом в городе', 'Особняк'],
    'Свой угол, своя крыша и своя скрипучая ступенька.',
  ),
  item(
    'horse',
    'martial',
    'grand',
    'Конь',
    ['Смирная кобыла', 'Верный конь', 'Белый скакун'],
    'Лучший друг, который никогда не спорит. Почти.',
  ),
  item(
    'castle',
    'court',
    'grand',
    'Родовое гнездо',
    ['Старая башня', 'Усадьба', 'Замок над рекой'],
    'Стены помнят предков. И сквозняки — тоже.',
  ),
  item(
    'ship',
    'trade',
    'grand',
    'Судно',
    ['Рыбацкая лодка', 'Шхуна', 'Каравелла'],
    'Ветер в парусах и чайки, ворующие обед.',
  ),
  item(
    'wine_cellar',
    'trade',
    'grand',
    'Винный погреб',
    ['Бочонок', 'Погреб', 'Погреб с коллекцией'],
    'Вино стареет красиво. В отличие от некоторых.',
  ),
  item(
    'wardrobe',
    'court',
    'small',
    'Гардероб',
    ['Добротный плащ', 'Наряд для бала'],
    'Встречают по одёжке. Провожают — тоже, если повезёт.',
  ),
  item(
    'jewelry',
    'court',
    'small',
    'Украшения',
    ['Серебряное кольцо', 'Фамильное ожерелье'],
    'Блестит, звенит и вызывает зависть у соседей.',
  ),
  item(
    'armor',
    'martial',
    'small',
    'Доспехи',
    ['Кожаная куртка', 'Кольчуга'],
    'Тяжело, жарко, зато спокойно на тёмных улицах.',
  ),
  item(
    'sword',
    'martial',
    'small',
    'Оружие',
    ['Добрый кинжал', 'Меч мастера'],
    'Висит на стене и внушает уважение гостям.',
  ),
  item(
    'carriage',
    'trade',
    'small',
    'Экипаж',
    ['Телега', 'Карета с гербом'],
    'Грязь на дорогах теперь — проблема кучера.',
  ),
  item(
    'portrait',
    'craft',
    'small',
    'Портрет',
    ['Набросок углём', 'Парадный портрет'],
    'Глаза на картине следят за гостями. Так и задумано.',
  ),
  item(
    'tavern_share',
    'trade',
    'small',
    'Доля в таверне',
    ['Пай', 'Своя таверна'],
    'Лучший столик всегда свободен. Для вас.',
  ),
  item(
    'lute',
    'craft',
    { skill: 'creativity' },
    'Лютня',
    ['Простая лютня', 'Лютня мастера'],
    'Три струны из пяти держат строй. Этого хватит.',
  ),
  item(
    'library',
    'arcane',
    { skill: 'knowledge' },
    'Библиотека',
    ['Полка книг', 'Своя библиотека'],
    'Книг больше, чем можно прочесть за жизнь. Вызов принят.',
  ),
  item(
    'workshop',
    'craft',
    { skill: 'creativity' },
    'Мастерская',
    ['Верстак', 'Мастерская'],
    'Пахнет стружкой, клеем и замыслами.',
  ),
  item(
    'crystal_ball',
    'arcane',
    { skill: 'knowledge' },
    'Хрустальный шар',
    ['Мутный шар', 'Шар провидца'],
    'Показывает будущее. Чаще всего — дождь.',
  ),
  item(
    'telescope',
    'arcane',
    { skill: 'knowledge' },
    'Телескоп',
    ['Подзорная труба', 'Телескоп'],
    'Луна так близко, что можно пересчитать драконов.',
  ),
  item(
    'hounds',
    'martial',
    { skill: 'influence' },
    'Гончие',
    ['Щенок', 'Свора гончих'],
    'Все в округе знают, чьи это собаки.',
  ),
  item(
    'signet_ring',
    'court',
    { skill: 'influence' },
    'Перстень с печатью',
    ['Медный перстень', 'Золотой с гербом'],
    'Одна печать — и двери открываются.',
  ),
  item(
    'gazebo',
    'nature',
    'relaxing',
    'Беседка в саду',
    ['Скамейка', 'Беседка с розами'],
    'Чай, закат и никаких дел до утра.',
  ),
  item(
    'bathhouse',
    'nature',
    'relaxing',
    'Баня',
    ['Кадка с водой', 'Баня с паром'],
    'Пар костей не ломит. Зато ломит всё остальное.',
  ),
  item(
    'cat',
    'nature',
    'relaxing',
    'Кот',
    ['Котёнок', 'Важный кот'],
    'Хозяин дома — кот. Вы тут просто живёте.',
  ),
  item(
    'fireplace',
    'craft',
    'relaxing',
    'Камин',
    ['Очаг', 'Камин с креслом'],
    'Плед, треск поленьев и хорошая книга.',
  ),
  item(
    'carp_pond',
    'nature',
    'relaxing',
    'Пруд',
    ['Пруд', 'Пруд с карпами'],
    'Карпы ничего не говорят. За это их и любят.',
  ),
  // Activities
  activity(
    'feast',
    'court',
    'leisure',
    'Пир',
    ['Ужин в таверне', 'Застолье', 'Пир на весь мир'],
    'Мёд, жаркое и песни до утра.',
  ),
  activity(
    'fair',
    'trade',
    'leisure',
    'Ярмарка',
    ['Карусель', 'Гостинцы', 'Весь день на ярмарке'],
    'Пряники, скоморохи и медведь на цепи (добрый).',
  ),
  activity(
    'hunt',
    'martial',
    'leisure',
    'Охота',
    ['Прогулка с луком', 'Охота на кабана', 'Королевская охота'],
    'Главное — вернуться с добычей. Или хотя бы с историей.',
  ),
  activity(
    'picnic',
    'nature',
    'leisure',
    'Пикник',
    ['Корзинка с хлебом', 'Пикник у озера', 'Праздник на лугу'],
    'Муравьи тоже приглашены. Их никто не спрашивал.',
  ),
  activity(
    'journey',
    'trade',
    'leisure',
    'Путешествие',
    ['Соседняя деревня', 'Столица', 'Заморские страны'],
    'Чтобы понять, как хорошо дома, надо уехать.',
  ),
  activity(
    'hot_springs',
    'nature',
    'leisure',
    'Купальни',
    ['Речка', 'Городские купальни', 'Горячие источники'],
    'Вода смывает пыль дорог и половину забот.',
  ),
  activity(
    'circus',
    'craft',
    'leisure',
    'Цирк',
    ['Фокусник', 'Шапито', 'Цирк с драконом'],
    'Дракон дрессированный. Говорят.',
  ),
  activity(
    'dice',
    'trade',
    'leisure',
    'Игра в кости',
    ['По медяку', 'Ночь азарта', 'Игра с бароном'],
    'Удача любит смелых. И шулеров.',
  ),
  activity(
    'wine_tasting',
    'trade',
    'leisure',
    'Дегустация',
    ['Кружка сидра', 'Погреб купца', 'Вина с юга'],
    'Это не пьянство, это изучение культуры.',
  ),
  activity(
    'boat_trip',
    'nature',
    'leisure',
    'Прогулка на лодке',
    ['По речке', 'По озеру', 'К маяку'],
    'Вёсла скрипят, вода шепчет, время замедляется.',
  ),
  activity(
    'theatre',
    'craft',
    { skill: 'creativity' },
    'Театр',
    ['Бродячие актёры', 'Спектакль', 'Премьера в ложе'],
    'Плакали все. Даже суровый капитан стражи.',
  ),
  activity(
    'concert',
    'craft',
    { skill: 'creativity' },
    'Концерт',
    ['Уличные музыканты', 'Вечер лютни', 'Придворный оркестр'],
    'Музыка, после которой хочется творить.',
  ),
  activity(
    'lectures',
    'arcane',
    { skill: 'knowledge' },
    'Лекции в Академии',
    ['Открытая лекция', 'Курс лекций', 'Диспут магистров'],
    'Магистры спорят так, что искрят мантии.',
  ),
  activity(
    'curiosities',
    'arcane',
    { skill: 'knowledge' },
    'Кунсткамера',
    ['Диковины', 'Зал редкостей', 'Ночь в кунсткамере'],
    'Чучело василиска. Не смотреть в глаза.',
  ),
  activity(
    'ball',
    'court',
    { skill: 'influence' },
    'Бал',
    ['Танцы на площади', 'Бал в ратуше', 'Королевский бал'],
    'Один танец — и о вас говорит весь город.',
  ),
  activity(
    'tourney_watch',
    'martial',
    { skill: 'influence' },
    'Турнир со зрительской ложи',
    ['Место в толпе', 'Скамья у ристалища', 'Королевская ложа'],
    'Болеть за правильного рыцаря — тоже искусство.',
  ),
];
