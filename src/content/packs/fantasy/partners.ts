import { bundle, id, type Authored, type Res } from './define.ts';

// 12 double-sided partners (R-REL-05). Budget (BALANCE §3): each level +1…+4 R after the action.
// Requirements are held, not paid: Ухаживание / Союз / Семья ask for more of the partner's "taste".

interface PartnerSpec {
  slug: string;
  /** What this partner values: requirements are in it. */
  taste: Res;
  /** What a first date gives you. */
  gift: Res;
  female: string;
  male: string;
  name: string;
  flavor: string;
}

const NEED: Record<'skill' | 'money', [number, number, number]> = {
  skill: [4, 6, 9],
  money: [5, 8, 12],
};

function partner(spec: PartnerSpec): Authored<'partner'> {
  const [l2, l3, l4] = NEED[spec.taste === 'money' ? 'money' : 'skill'];
  return {
    card: {
      id: id('partner', spec.slug),
      kind: 'partner',
      versions: [{ gender: 'female' }, { gender: 'male' }],
      levels: [
        { reward: { ...bundle([spec.gift, 3]), sth: 2 } },
        {
          requirement: bundle([spec.taste, l2]),
          reward: { lth: 2, sth: 1 },
          upkeep: { cost: { time: 1 }, reward: { ...bundle([spec.gift, 1]), sth: 1 } },
        },
        {
          requirement: bundle([spec.taste, l3]),
          reward: { lth: 2, sth: 1 },
          upkeep: { cost: { time: 1, money: 1 }, reward: { lth: 2 } },
        },
        {
          requirement: bundle([spec.taste, l4]),
          reward: { lth: 2, sth: 1 },
          upkeep: { cost: { time: 1, money: 2 }, reward: { lth: 3, sth: 1 } },
        },
      ],
    },
    ru: { name: spec.name, flavor: spec.flavor, versions: [spec.female, spec.male] },
  };
}

export const partners: Authored<'partner'>[] = [
  partner({
    slug: 'elven_ranger',
    taste: 'creativity',
    gift: 'knowledge',
    female: 'Лиэль',
    male: 'Таэрон',
    name: 'Эльф-следопыт',
    flavor: 'Знает имя каждого дерева и ни одного трактирщика.',
  }),
  partner({
    slug: 'dwarf_smith',
    taste: 'money',
    gift: 'creativity',
    female: 'Дагна',
    male: 'Хальвар',
    name: 'Гном-оружейник',
    flavor: 'Ценит крепкий эль, крепкую сталь и крепкий кошелёк.',
  }),
  partner({
    slug: 'court_chronicler',
    taste: 'knowledge',
    gift: 'influence',
    female: 'Мирена',
    male: 'Альберих',
    name: 'Придворный летописец',
    flavor: 'Запишет вас в историю — если заслужите.',
  }),
  partner({
    slug: 'wandering_bard',
    taste: 'influence',
    gift: 'creativity',
    female: 'Иветта',
    male: 'Жиль',
    name: 'Странствующий бард',
    flavor: 'Поёт о любви в каждом городе. Надеетесь, что теперь — о вас.',
  }),
  partner({
    slug: 'temple_healer',
    taste: 'knowledge',
    gift: 'influence',
    female: 'Агата',
    male: 'Ансельм',
    name: 'Храмовый целитель',
    flavor: 'Лечит переломы, простуду и разбитые сердца.',
  }),
  partner({
    slug: 'halfling_innkeeper',
    taste: 'money',
    gift: 'influence',
    female: 'Розалинда',
    male: 'Бертрам',
    name: 'Хозяин «Пьяного гуся»',
    flavor: 'Лучший пирог в округе и худший характер по понедельникам.',
  }),
  partner({
    slug: 'merchant_heir',
    taste: 'money',
    gift: 'knowledge',
    female: 'Вероника',
    male: 'Лоренцо',
    name: 'Наследник торгового дома',
    flavor: 'Считает быстрее, чем вы успеваете моргнуть.',
  }),
  partner({
    slug: 'errant_knight',
    taste: 'influence',
    gift: 'knowledge',
    female: 'Ровена',
    male: 'Годрик',
    name: 'Странствующий рыцарь',
    flavor: 'Спасает всех подряд. Вас — в первую очередь.',
  }),
  partner({
    slug: 'forest_witch',
    taste: 'creativity',
    gift: 'knowledge',
    female: 'Ведана',
    male: 'Велимир',
    name: 'Лесной ведун',
    flavor: 'Травы, отвары и кот, который всё понимает.',
  }),
  partner({
    slug: 'ship_captain',
    taste: 'money',
    gift: 'influence',
    female: 'Марисоль',
    male: 'Корвин',
    name: 'Капитан «Морской девы»',
    flavor: 'Дом там, где штиль. То есть нигде.',
  }),
  partner({
    slug: 'fire_magister',
    taste: 'knowledge',
    gift: 'creativity',
    female: 'Илсабет',
    male: 'Тибальт',
    name: 'Магистр огня',
    flavor: 'Горячий нрав, тёплые руки и вечно опалённые брови.',
  }),
  partner({
    slug: 'orc_drummer',
    taste: 'creativity',
    gift: 'influence',
    female: 'Гарга',
    male: 'Гром',
    name: 'Орк-барабанщик',
    flavor: 'Громкий, честный и неожиданно нежный.',
  }),
];
