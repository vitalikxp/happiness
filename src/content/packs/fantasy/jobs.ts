import { bundle, id, type Authored, type Skill } from './define.ts';

// 3 guilds × 3 levels × 2 variants. Budget (BALANCE §3): per round +2…+5 R, promotion +3…+6 R.

type Track = 'science' | 'arts' | 'social';
const SKILL: Record<Track, Skill> = {
  science: 'knowledge',
  arts: 'creativity',
  social: 'influence',
};

interface JobSpec {
  slug: string;
  track: Track;
  level: 1 | 2 | 3;
  /** Variant B trades some income for LTH. */
  variant: 'a' | 'b';
  name: string;
  flavor: string;
}

function job(spec: JobSpec): Authored<'job'> {
  const s = SKILL[spec.track];
  const { level, variant } = spec;
  const hire = [
    { cost: bundle([s, 3]), reward: bundle(['money', 4]) },
    { cost: bundle([s, 5]), reward: bundle(['money', 6]) },
    { cost: bundle([s, 7]), reward: { ...bundle(['money', 6]), lth: 2 } },
  ][level - 1];
  const upkeep = {
    a: [
      { cost: { time: 1, ...bundle([s, 1]) }, reward: bundle(['money', 6]) },
      { cost: { time: 1, ...bundle([s, 2]) }, reward: bundle(['money', 9]) },
      { cost: { time: 1, ...bundle([s, 3]) }, reward: bundle(['money', 11]) },
    ],
    b: [
      { cost: { time: 1, ...bundle([s, 1]) }, reward: { ...bundle(['money', 5]), lth: 1 } },
      { cost: { time: 1, ...bundle([s, 2]) }, reward: { ...bundle(['money', 7]), lth: 1 } },
      { cost: { time: 1, ...bundle([s, 3]) }, reward: { ...bundle(['money', 8]), lth: 1 } },
    ],
  }[variant][level - 1];
  const promotion =
    level === 1
      ? { cost: bundle([s, 3]), reward: { ...bundle(['money', 1]), lth: 3 } }
      : level === 2
        ? { cost: bundle([s, 5]), reward: { ...bundle(['money', 1]), lth: 4 } }
        : undefined;
  if (!hire || !upkeep) throw new Error(`bad job ${spec.slug}`);
  return {
    card: {
      id: id('job', spec.slug),
      kind: 'job',
      track: spec.track,
      level,
      hire,
      upkeep,
      ...(promotion ? { promotion } : {}),
    },
    ru: { name: spec.name, flavor: spec.flavor },
  };
}

export const jobs: Authored<'job'>[] = [
  // Гильдия магов
  job({
    slug: 'alchemist_apprentice',
    track: 'science',
    level: 1,
    variant: 'a',
    name: 'Ученик алхимика',
    flavor: 'Мыть колбы — тоже наука. Особенно если они взрываются.',
  }),
  job({
    slug: 'tower_copyist',
    track: 'science',
    level: 1,
    variant: 'b',
    name: 'Переписчик в башне магов',
    flavor: 'Тихо, пыльно и иногда страницы шепчут в ответ.',
  }),
  job({
    slug: 'court_astrologer',
    track: 'science',
    level: 2,
    variant: 'a',
    name: 'Придворный звездочёт',
    flavor: 'Звёзды говорят королю ровно то, что он хочет услышать.',
  }),
  job({
    slug: 'potion_master',
    track: 'science',
    level: 2,
    variant: 'b',
    name: 'Мастер зелий',
    flavor: 'Лечебное, приворотное, от икоты — всё по рецепту.',
  }),
  job({
    slug: 'archmage',
    track: 'science',
    level: 3,
    variant: 'a',
    name: 'Архимаг Совета',
    flavor: 'Кресло в Совете неудобное, зато вид из башни лучший в королевстве.',
  }),
  job({
    slug: 'academy_rector',
    track: 'science',
    level: 3,
    variant: 'b',
    name: 'Ректор Академии чар',
    flavor: 'Половина студентов — гении, вторая половина — бедствие.',
  }),
  // Гильдия мастеров
  job({
    slug: 'smith_apprentice',
    track: 'arts',
    level: 1,
    variant: 'a',
    name: 'Подмастерье кузнеца',
    flavor: 'Молот тяжёлый, зато руки крепнут с каждым днём.',
  }),
  job({
    slug: 'street_minstrel',
    track: 'arts',
    level: 1,
    variant: 'b',
    name: 'Уличный менестрель',
    flavor: 'Медяки в шляпе и аплодисменты от голубей.',
  }),
  job({
    slug: 'jeweler',
    track: 'arts',
    level: 2,
    variant: 'a',
    name: 'Мастер-ювелир',
    flavor: 'Каждый камень хочет стать короной. Ваше дело — помочь.',
  }),
  job({
    slug: 'court_painter',
    track: 'arts',
    level: 2,
    variant: 'b',
    name: 'Придворный художник',
    flavor: 'Королева на портрете всегда немного моложе.',
  }),
  job({
    slug: 'royal_architect',
    track: 'arts',
    level: 3,
    variant: 'a',
    name: 'Великий зодчий',
    flavor: 'Ваши мосты переживут не одну династию.',
  }),
  job({
    slug: 'kings_bard',
    track: 'arts',
    level: 3,
    variant: 'b',
    name: 'Бард короля',
    flavor: 'Ваши баллады поют на каждой свадьбе — и на каждых поминках.',
  }),
  // Торговая гильдия и двор
  job({
    slug: 'guild_clerk',
    track: 'social',
    level: 1,
    variant: 'a',
    name: 'Писарь торговой гильдии',
    flavor: 'Цифры, печати и бесконечные очереди купцов.',
  }),
  job({
    slug: 'town_crier',
    track: 'social',
    level: 1,
    variant: 'b',
    name: 'Городской глашатай',
    flavor: 'Слушайте, слушайте! Новости — за полчаса до сплетен.',
  }),
  job({
    slug: 'guild_treasurer',
    track: 'social',
    level: 2,
    variant: 'a',
    name: 'Казначей гильдии',
    flavor: 'Ключ от сундука носят на шее. Спят — вполглаза.',
  }),
  job({
    slug: 'free_city_envoy',
    track: 'social',
    level: 2,
    variant: 'b',
    name: 'Посол вольного города',
    flavor: 'Улыбаться, кланяться и никогда не подписывать сразу.',
  }),
  job({
    slug: 'chancellor',
    track: 'social',
    level: 3,
    variant: 'a',
    name: 'Канцлер королевства',
    flavor: 'Король правит, а вы — решаете.',
  }),
  job({
    slug: 'guild_master',
    track: 'social',
    level: 3,
    variant: 'b',
    name: 'Глава торговой гильдии',
    flavor: 'Половина кораблей в порту ходит под вашим флагом.',
  }),
];
