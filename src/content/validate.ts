import {
  JOB_TRACKS,
  PackSchema,
  STAGES,
  type Card,
  type CardId,
  type CardKind,
  type CardOf,
  type Pack,
  type RowId,
  type RulesConfig,
} from './schema.ts';

const MAX_PLAYERS = 4;

/** Middle segment of a card id: `<pack>.<kind>.<slug>`. */
const ID_KIND: Record<CardKind, string> = {
  basicProject: 'project',
  singleRoundProject: 'project',
  groupProject: 'project',
  item: 'item',
  activity: 'activity',
  job: 'job',
  partner: 'partner',
  childTrait: 'trait',
  lifeGoal: 'goal',
};

export type PackValidation = { ok: true; pack: Pack } | { ok: false; errors: string[] };

/** Schema validation plus cross-field checks the schema can't express. */
export function validatePack(input: unknown): PackValidation {
  const parsed = PackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }
  const pack = parsed.data;
  const errors = [...checkRules(pack.rules), ...checkCards(pack)];
  return errors.length > 0 ? { ok: false, errors } : { ok: true, pack };
}

function checkRules(rules: RulesConfig): string[] {
  const errors: string[] = [];

  const starts = rules.stressZones.filter((zone) => zone.start).length;
  if (starts !== 1)
    errors.push(`rules.stressZones: exactly one zone must have start (found ${String(starts)})`);

  let expectedFirst = 1;
  for (const stage of STAGES) {
    const [first, last] = rules.stages[stage];
    if (first !== expectedFirst || last < first) {
      errors.push(
        `rules.stages.${stage}: must start at round ${String(expectedFirst)} and not end before it starts`,
      );
    }
    expectedFirst = last + 1;
  }
  if (expectedFirst !== rules.maxRounds + 1) {
    errors.push('rules.stages: oldAge must end at maxRounds');
  }

  const [oldFirst, oldLast] = rules.stages.oldAge;
  for (const key of Object.keys(rules.oldAgeStress)) {
    const round = Number(key);
    if (round < oldFirst || round > oldLast) {
      errors.push(`rules.oldAgeStress.${key}: round is not an Old Age round`);
    }
  }
  return errors;
}

function checkCards(pack: Pack): string[] {
  const errors: string[] = [];
  const { cards, rules } = pack;
  const all: Card[] = Object.values(cards).flat();

  const seen = new Set<CardId>();
  for (const card of all) {
    if (seen.has(card.id)) errors.push(`${card.id}: duplicate card id`);
    seen.add(card.id);
    const expectedPrefix = `${pack.id}.${ID_KIND[card.kind]}.`;
    if (
      !card.id.startsWith(expectedPrefix) ||
      !/^[a-z0-9_]+$/.test(card.id.slice(expectedPrefix.length))
    ) {
      errors.push(`${card.id}: id must look like ${expectedPrefix}<snake_case_slug>`);
    }
  }

  for (const job of cards.jobs) errors.push(...checkJob(job));
  for (const track of JOB_TRACKS) {
    for (const level of [1, 2, 3]) {
      if (!cards.jobs.some((job) => job.track === track && job.level === level)) {
        errors.push(`cards.jobs: missing ${track} job of level ${String(level)}`);
      }
    }
  }

  const maxRowSize = Math.max(...Object.values(rules.marketSize));
  const minimums: [keyof Pack['cards'], number][] = [
    ['projects', maxRowSize],
    ['itemsActivities', maxRowSize],
    ['jobs', MAX_PLAYERS],
    ['partners', MAX_PLAYERS],
    ['childTraits', rules.childTraitsDealt * MAX_PLAYERS],
    ['lifeGoals', Math.max(MAX_PLAYERS, rules.solo.lifeGoals)],
  ];
  for (const [deck, minimum] of minimums) {
    if (cards[deck].length < minimum) {
      errors.push(
        `cards.${deck}: needs at least ${String(minimum)} cards (has ${String(cards[deck].length)})`,
      );
    }
  }
  return errors;
}

function checkJob(job: CardOf<'job'>): string[] {
  const isTop = job.level === 3;
  if (isTop && job.promotion) return [`${job.id}: top-level job must not have a promotion`];
  if (!isTop && !job.promotion) return [`${job.id}: job below level 3 needs a promotion`];
  return [];
}

/** Read-only lookup structure handed to the engine. */
export interface ContentIndex {
  readonly packId: string;
  readonly packVersion: string;
  readonly rules: RulesConfig;
  readonly cards: ReadonlyMap<CardId, Card>;
  readonly decks: Readonly<Record<RowId | 'childTraits' | 'lifeGoals', readonly CardId[]>>;
}

export function buildContentIndex(pack: Pack): ContentIndex {
  const { cards } = pack;
  const ids = (list: readonly Card[]) => list.map((card) => card.id);
  return {
    packId: pack.id,
    packVersion: pack.version,
    rules: pack.rules,
    cards: new Map(
      Object.values(cards)
        .flat()
        .map((card): [CardId, Card] => [card.id, card]),
    ),
    decks: {
      projects: ids(cards.projects),
      itemsActivities: ids(cards.itemsActivities),
      jobs: ids(cards.jobs),
      partners: ids(cards.partners),
      childTraits: ids(cards.childTraits),
      lifeGoals: ids(cards.lifeGoals),
    },
  };
}

/** Validate and index a pack, throwing with all problems listed. */
export function loadPack(input: unknown): ContentIndex {
  const result = validatePack(input);
  if (!result.ok) throw new Error(`Invalid content pack:\n- ${result.errors.join('\n- ')}`);
  return buildContentIndex(result.pack);
}
