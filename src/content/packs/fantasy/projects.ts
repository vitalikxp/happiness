import { bundle, id, type Authored, type Category, type Res } from './define.ts';

// 30 basic projects (9 with Good Health), 10 single-round projects (contests), 8 group projects
// (expeditions). Budgets follow BALANCE §3; resources come from the category.

/** Primary, secondary and third resource used by a category. */
const RESOURCES: Record<Category, [Res, Res, Res]> = {
  arcane: ['knowledge', 'creativity', 'influence'],
  craft: ['creativity', 'knowledge', 'money'],
  martial: ['influence', 'creativity', 'money'],
  court: ['influence', 'knowledge', 'creativity'],
  trade: ['money', 'influence', 'knowledge'],
  nature: ['knowledge', 'creativity', 'money'],
  faith: ['knowledge', 'influence', 'money'],
};

type Shape = 'standard' | 'long' | 'health';

function basic(
  slug: string,
  category: Category,
  shape: Shape,
  name: string,
  levels: [string, string, string, string],
  flavor: string,
): Authored<'basicProject'> {
  const [a, b, c] = RESOURCES[category];
  const l3 =
    shape === 'health'
      ? { cost: { time: 1, ...bundle([a, 2], [c, 2]) }, reward: { lth: 2, sth: 2, relax: 1 } }
      : { cost: { time: 1, ...bundle([a, 2], [c, 2]) }, reward: { lth: 3, sth: 1 } };
  const l4 = {
    standard: { cost: { time: 2, ...bundle([a, 2], [b, 2]) }, reward: { lth: 6 } },
    long: { cost: { time: 3, ...bundle([a, 3], [b, 2]) }, reward: { lth: 7 } },
    health: { cost: { time: 2, ...bundle([a, 2], [b, 2]) }, reward: { goodHealth: 1 as const } },
  }[shape];
  return {
    card: {
      id: id('project', slug),
      kind: 'basicProject',
      category,
      levels: [
        { cost: bundle([a, 1]), reward: { ...bundle([b, 3]), sth: 1 } },
        {
          cost: { time: 1, ...bundle([a, 2], [b, 1]) },
          reward: shape === 'health' ? { lth: 2, sth: 1, relax: 1 } : { lth: 3 },
        },
        l3,
        l4,
      ],
    },
    ru: { name, flavor, parts: levels },
  };
}

function contest(
  slug: string,
  category: Category,
  name: string,
  levels: [string, string, string, string],
  flavor: string,
  /** Override the category's resources (primary, secondary). */
  pays?: [Res, Res],
): Authored<'singleRoundProject'> {
  const [a, b] = pays ?? RESOURCES[category];
  return {
    card: {
      id: id('project', slug),
      kind: 'singleRoundProject',
      category,
      levels: [
        { cost: bundle([a, 2]), reward: { lth: 2, sth: 1 } },
        { cost: bundle([a, 3], [b, 1]), reward: { lth: 3, sth: 1 } },
        { cost: bundle([a, 4], [b, 2]), reward: { lth: 4 } },
        { cost: bundle([a, 5], [b, 3]), reward: { lth: 4, sth: 2 } },
      ],
    },
    ru: { name, flavor, parts: levels },
  };
}

function expedition(
  slug: string,
  category: Category,
  name: string,
  roles: [[string, Res, Res], [string, Res, Res], [string, Res, Res], [string, Res, Res]],
  flavor: string,
): Authored<'groupProject'> {
  const role = ([, pays, gets]: [string, Res, Res]) => ({
    cost: bundle([pays, 3]),
    reward: { ...bundle([gets, 3]), sth: 1 },
  });
  return {
    card: {
      id: id('project', slug),
      kind: 'groupProject',
      category,
      roles: [role(roles[0]), role(roles[1]), role(roles[2]), role(roles[3])],
      bonus: [{ lth: 1 }, { money: 1 }, { sth: 1 }, { sth: 1 }],
    },
    ru: { name, flavor, parts: roles.map(([roleName]) => roleName) },
  };
}

export const projects: Authored<'basicProject' | 'singleRoundProject' | 'groupProject'>[] = [
  // Arcane
  basic(
    'learn_runes',
    'arcane',
    'standard',
    'Изучить руны',
    ['Рунный алфавит', 'Простые заклятья', 'Руническая вязь', 'Мастер рун'],
    'Каждая руна — дверь. Главное — не открыть не ту.',
  ),
  basic(
    'tame_familiar',
    'arcane',
    'standard',
    'Приручить фамильяра',
    ['Блюдце молока', 'Первое доверие', 'Мысленная связь', 'Верный фамильяр'],
    'Кот делает вид, что это он вас приручил.',
  ),
  basic(
    'build_tower',
    'arcane',
    'long',
    'Построить свою башню',
    ['Чертёж', 'Фундамент', 'Обсерватория', 'Башня до облаков'],
    'Каждый уважающий себя маг рано или поздно строит башню.',
  ),
  basic(
    'read_stars',
    'arcane',
    'standard',
    'Читать звёзды',
    ['Карта неба', 'Первое предсказание', 'Сбывшийся прогноз', 'Звездочёт'],
    'Звёзды не лгут. Они просто очень расплывчато выражаются.',
  ),
  basic(
    'elemental_magic',
    'arcane',
    'standard',
    'Покорить стихию',
    ['Искра на ладони', 'Огненный шар', 'Дождь по заказу', 'Повелитель стихий'],
    'Сначала научитесь гасить то, что зажгли.',
  ),
  // Craft
  basic(
    'forge_blade',
    'craft',
    'long',
    'Выковать легендарный клинок',
    ['Первый гвоздь', 'Добрый нож', 'Меч с узором', 'Клинок из легенд'],
    'Барды ещё будут петь о нём. И, может быть, о вас.',
  ),
  basic(
    'build_ship',
    'craft',
    'long',
    'Построить корабль',
    ['Лодка', 'Шлюп', 'Бриг', 'Корабль мечты'],
    'Море зовёт тех, у кого есть на чём ответить.',
  ),
  basic(
    'weave_tapestry',
    'craft',
    'standard',
    'Соткать гобелен',
    ['Первый узор', 'Полотно', 'История в нитях', 'Гобелен для замка'],
    'Вся жизнь — в одном полотне. Нитка за ниткой.',
  ),
  basic(
    'brew_ale',
    'craft',
    'standard',
    'Сварить лучший эль',
    ['Первая бочка', 'Сносный эль', 'Эль на ярмарку', 'Эль, о котором поют'],
    'Гномы попробовали и одобрительно хмыкнули. Это успех.',
  ),
  basic(
    'carve_statue',
    'craft',
    'standard',
    'Изваять статую',
    ['Глиняная фигурка', 'Мраморный бюст', 'Статуя на площади', 'Шедевр'],
    'Нужно просто отсечь всё лишнее. Всего-то.',
  ),
  // Court
  basic(
    'write_chronicle',
    'court',
    'standard',
    'Написать летопись',
    ['Заметки', 'Первая глава', 'Толстый том', 'Летопись королевства'],
    'История пишется победителями. И теми, у кого есть перо.',
  ),
  basic(
    'court_etiquette',
    'court',
    'standard',
    'Освоить придворный этикет',
    ['Поклон', 'Танец на балу', 'Место за королевским столом', 'Душа двора'],
    'Какой вилкой есть дракона? Вот и узнаете.',
  ),
  basic(
    'compose_ballad',
    'court',
    'standard',
    'Сочинить балладу',
    ['Куплет', 'Песня', 'Баллада', 'Песня, которую знают все'],
    'Рифма к слову «дракон» — главная загадка поэзии.',
  ),
  basic(
    'found_salon',
    'court',
    'standard',
    'Открыть литературный салон',
    ['Чтения у камина', 'Кружок поэтов', 'Модный салон', 'Салон, куда мечтают попасть'],
    'Чай, стихи и немного изысканных сплетен.',
  ),
  // Faith
  basic(
    'found_shelter',
    'faith',
    'standard',
    'Основать приют',
    ['Миска супа', 'Тёплый угол', 'Приют', 'Дом для сирот'],
    'Доброе дело, которое переживёт вас.',
  ),
  basic(
    'pilgrimage',
    'faith',
    'health',
    'Совершить паломничество',
    ['Первые мили', 'Святой источник', 'Горный монастырь', 'Обретённый покой'],
    'Дорога лечит лучше любого зелья.',
  ),
  basic(
    'monk_training',
    'faith',
    'health',
    'Учиться у монахов',
    ['Утренняя молитва', 'Пост и тишина', 'Тайны дыхания', 'Внутренний свет'],
    'Тишина бывает очень громкой — если долго слушать.',
  ),
  basic(
    'healing_arts',
    'faith',
    'health',
    'Учиться целительству',
    ['Перевязка', 'Отвары', 'Вправить вывих', 'Целитель'],
    'Сначала — не навредить. Потом — не испугаться.',
  ),
  // Nature
  basic(
    'herbalism',
    'nature',
    'health',
    'Изучить травничество',
    ['Ромашка и мята', 'Своя сушильня', 'Настойки', 'Травник'],
    'От всех болезней — травка. От остальных — две.',
  ),
  basic(
    'grow_garden',
    'nature',
    'health',
    'Вырастить сад',
    ['Грядка', 'Плодовые деревья', 'Сад с беседкой', 'Сад, где отдыхает душа'],
    'Посадите яблоню. Внуки скажут спасибо.',
  ),
  basic(
    'beekeeping',
    'nature',
    'standard',
    'Завести пасеку',
    ['Первый улей', 'Мёд к столу', 'Медовуха', 'Пасека на всю долину'],
    'Пчёлы трудятся, вы пожинаете. Почти честно.',
  ),
  basic(
    'map_wilds',
    'nature',
    'standard',
    'Составить карту Диких земель',
    ['Окрестности', 'Тропы', 'Перевалы', 'Карта, которой нет у короля'],
    'Там, где на картах пусто, обычно водятся драконы.',
  ),
  basic(
    'climb_dragon_peak',
    'nature',
    'health',
    'Покорить Драконий пик',
    ['Предгорья', 'Ледник', 'Последний гребень', 'Вершина'],
    'Дракона на вершине нет. Есть вид, ради которого стоило.',
  ),
  // Martial
  basic(
    'fencing_school',
    'martial',
    'health',
    'Пройти школу фехтования',
    ['Деревянный меч', 'Стойка', 'Финт', 'Мастер клинка'],
    'Лучший бой — тот, после которого все живы.',
  ),
  basic(
    'horse_riding',
    'martial',
    'health',
    'Научиться верховой езде',
    ['Пони', 'Рысь', 'Галоп', 'Лучший всадник'],
    'Конь всегда знает, кто из вас главный. Пока что — он.',
  ),
  basic(
    'archery',
    'martial',
    'standard',
    'Стать лучником',
    ['Тетива', 'В яблочко', 'Белку в глаз', 'Меткий, как эльф'],
    'Ветер, дыхание, выстрел. И никаких яблок на головах.',
  ),
  basic(
    'lead_militia',
    'martial',
    'standard',
    'Возглавить ополчение',
    ['Дозор', 'Десяток', 'Сотня', 'Защитник города'],
    'Город спит спокойно, пока вы не спите.',
  ),
  // Trade
  basic(
    'trade_route',
    'trade',
    'long',
    'Проложить торговый путь',
    ['Повозка', 'Караван', 'Свой склад', 'Путь через горы'],
    'Шёлк с востока, вино с юга и пошлины — вам.',
  ),
  basic(
    'open_shop',
    'trade',
    'standard',
    'Открыть лавку',
    ['Прилавок', 'Лавка', 'Лавка с вывеской', 'Сеть лавок'],
    'Покупатель всегда прав. Особенно когда платит.',
  ),
  basic(
    'learn_languages',
    'trade',
    'standard',
    'Выучить языки дальних стран',
    ['Ругательства', 'Простые фразы', 'Беглая речь', 'Полиглот'],
    'Сначала — как торговаться. Потом — как извиняться.',
  ),

  // Single-round projects: contests and festivals
  contest(
    'knight_tourney',
    'martial',
    'Рыцарский турнир',
    ['Оруженосец', 'Участник', 'Финалист', 'Чемпион турнира'],
    'Копья ломаются, репутации — тоже.',
  ),
  contest(
    'bard_contest',
    'court',
    'Состязание бардов',
    ['Выступление', 'Похвала жюри', 'Приз зрителей', 'Золотая лютня'],
    'Три аккорда, честное сердце и немного лести жюри.',
  ),
  contest(
    'harvest_fair',
    'trade',
    'Осенняя ярмарка',
    ['Свой прилавок', 'Бойкая торговля', 'Лучший товар', 'Король ярмарки'],
    'Тыквы, сидр и самый громкий зазывала.',
    ['influence', 'money'],
  ),
  contest(
    'wizard_duel',
    'arcane',
    'Дуэль магов',
    ['Фокус', 'Ничья', 'Победа', 'Легендарная дуэль'],
    'Правило одно: не превращать судью в жабу.',
  ),
  contest(
    'cooking_contest',
    'craft',
    'Кулинарный конкурс',
    ['Пирог', 'Жаркое', 'Пир на весь мир', 'Повар года'],
    'Секретный ингредиент — щепотка драконьего перца.',
  ),
  contest(
    'sphinx_riddles',
    'arcane',
    'Загадки сфинкса',
    ['Одна загадка', 'Три загадки', 'Семь загадок', 'Сфинкс в восторге'],
    'Утром на четырёх ногах… Вы знаете ответ. Наверное.',
  ),
  contest(
    'archery_contest',
    'martial',
    'Состязание лучников',
    ['Мишень', 'Подвижная мишень', 'Яблоко на шесте', 'Стрела в стрелу'],
    'Победитель получает серебряную стрелу и зависть всех соседей.',
  ),
  contest(
    'masquerade',
    'court',
    'Королевский маскарад',
    ['Маска', 'Танец', 'Тайна', 'Королева бала'],
    'Кто под маской — неважно. Важно, кто запомнит.',
  ),
  contest(
    'smith_contest',
    'craft',
    'Состязание кузнецов',
    ['Подкова', 'Шлем', 'Кольчуга', 'Доспех для короля'],
    'Жар горна, звон молота и толпа зевак.',
  ),
  contest(
    'winter_festival',
    'faith',
    'Праздник Солнцеворота',
    ['Свеча', 'Хоровод', 'Костёр до неба', 'Душа праздника'],
    'Самая длинная ночь — для самых тёплых песен.',
  ),

  // Group projects: expeditions and great works
  expedition(
    'dragon_hunt',
    'martial',
    'Охота на дракона',
    [
      ['Воин', 'influence', 'creativity'],
      ['Маг', 'knowledge', 'influence'],
      ['Лекарь', 'knowledge', 'money'],
      ['Следопыт', 'creativity', 'knowledge'],
    ],
    'Дракон, скорее всего, просто хочет, чтобы его оставили в покое.',
  ),
  expedition(
    'dungeon_delve',
    'martial',
    'Спуск в подземелье',
    [
      ['Вор', 'creativity', 'money'],
      ['Воин', 'influence', 'creativity'],
      ['Факельщик', 'money', 'influence'],
      ['Картограф', 'knowledge', 'creativity'],
    ],
    'Сокровища, ловушки и подозрительно добрый гоблин.',
  ),
  expedition(
    'cathedral',
    'faith',
    'Строительство собора',
    [
      ['Зодчий', 'knowledge', 'creativity'],
      ['Каменщик', 'creativity', 'money'],
      ['Витражист', 'creativity', 'influence'],
      ['Казначей', 'money', 'influence'],
    ],
    'Строят веками. Вы успеете заложить свою часть.',
  ),
  expedition(
    'royal_wedding',
    'court',
    'Королевская свадьба',
    [
      ['Распорядитель', 'influence', 'knowledge'],
      ['Повар', 'creativity', 'money'],
      ['Музыкант', 'creativity', 'influence'],
      ['Церемониймейстер', 'knowledge', 'influence'],
    ],
    'Три дня пира, сто бочек вина и одна сбежавшая невеста.',
  ),
  expedition(
    'northern_expedition',
    'nature',
    'Экспедиция на Север',
    [
      ['Проводник', 'knowledge', 'creativity'],
      ['Охотник', 'creativity', 'money'],
      ['Учёный', 'knowledge', 'influence'],
      ['Снабженец', 'money', 'knowledge'],
    ],
    'Там, говорят, ночь длится полгода, а медведи — вежливые.',
  ),
  expedition(
    'theatre_play',
    'craft',
    'Постановка пьесы',
    [
      ['Автор', 'knowledge', 'influence'],
      ['Актёр', 'creativity', 'influence'],
      ['Декоратор', 'creativity', 'money'],
      ['Суфлёр', 'knowledge', 'creativity'],
    ],
    'Весь мир — театр. Особенно в пятницу вечером.',
  ),
  expedition(
    'great_library',
    'arcane',
    'Великая библиотека',
    [
      ['Хранитель', 'knowledge', 'influence'],
      ['Переписчик', 'creativity', 'knowledge'],
      ['Переводчик', 'knowledge', 'money'],
      ['Меценат', 'money', 'influence'],
    ],
    'Все книги мира под одной крышей. И одна очень строгая библиотекарша.',
  ),
  expedition(
    'merchant_fleet',
    'trade',
    'Торговая флотилия',
    [
      ['Капитан', 'influence', 'money'],
      ['Штурман', 'knowledge', 'creativity'],
      ['Кок', 'creativity', 'influence'],
      ['Казначей', 'money', 'knowledge'],
    ],
    'Десять кораблей, один флаг и целое море возможностей.',
  ),
];
