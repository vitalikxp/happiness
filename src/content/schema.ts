import { z } from 'zod';

// Canonical engine terms (ADR-007). Packs map them to display names; they never add new ones.

export const RESOURCES = ['knowledge', 'creativity', 'influence', 'money'] as const;
export const ResourceIdSchema = z.enum(RESOURCES);
export type ResourceId = z.infer<typeof ResourceIdSchema>;

export const BOARD_SPACES = [
  'study',
  'play',
  'interact',
  'tempJob',
  'takeProject',
  'spend',
  'getJob',
  'developRelationship',
  'overtime',
  'rest',
] as const;
export const BoardSpaceIdSchema = z.enum(BOARD_SPACES);
export type BoardSpaceId = z.infer<typeof BoardSpaceIdSchema>;

export const ROWS = ['projects', 'itemsActivities', 'jobs', 'partners'] as const;
export const RowIdSchema = z.enum(ROWS);
export type RowId = z.infer<typeof RowIdSchema>;

export const STAGES = ['youth', 'adulthood', 'oldAge'] as const;
export type Stage = (typeof STAGES)[number];

export const CATEGORIES = [
  'arcane',
  'craft',
  'martial',
  'court',
  'trade',
  'nature',
  'faith',
] as const;
export const CategorySchema = z.enum(CATEGORIES);

export const JOB_TRACKS = ['science', 'arts', 'social'] as const;
export const JobTrackSchema = z.enum(JOB_TRACKS);

const count = z.int().min(0);
const positive = z.int().min(1);

/** Resource amounts: costs, requirements, starting resources. */
export const ResourceBundleSchema = z.strictObject({
  knowledge: count.optional(),
  creativity: count.optional(),
  influence: count.optional(),
  money: count.optional(),
});
export type ResourceBundle = z.infer<typeof ResourceBundleSchema>;

/** A cost that may also take Time markers (placed on the card / spent). */
export const CostSchema = ResourceBundleSchema.extend({ time: positive.optional() });
export type Cost = z.infer<typeof CostSchema>;

/**
 * Declarative effect of a card (the effects DSL). Applied in a fixed order:
 * resources → time → sth → lth → goodHealth → relax → stress (see engine/effects.ts).
 */
export const RewardSchema = ResourceBundleSchema.extend({
  time: positive.optional(),
  sth: z.int().optional(),
  lth: z.int().optional(),
  goodHealth: z.literal(1).optional(),
  relax: positive.optional(),
  stress: positive.optional(),
});
export type Reward = z.infer<typeof RewardSchema>;

const UpkeepSchema = z.strictObject({ cost: CostSchema, reward: RewardSchema });
const PricedSchema = z.strictObject({ cost: ResourceBundleSchema, reward: RewardSchema });

const cardBase = {
  id: z.string(),
  /** Why the card intentionally sits outside its budget band (docs/BALANCE.md §3). */
  balanceNote: z.string().optional(),
};

export const BasicProjectSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('basicProject'),
  category: CategorySchema,
  levels: z.tuple([
    PricedSchema, // L1 is paid with the Take Project action itself
    z.strictObject({ cost: CostSchema.extend({ time: positive }), reward: RewardSchema }),
    z.strictObject({ cost: CostSchema.extend({ time: positive }), reward: RewardSchema }),
    z.strictObject({ cost: CostSchema.extend({ time: positive }), reward: RewardSchema }),
  ]),
});

export const SingleRoundProjectSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('singleRoundProject'),
  category: CategorySchema,
  levels: z.tuple([PricedSchema, PricedSchema, PricedSchema, PricedSchema]),
});

export const GroupProjectSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('groupProject'),
  category: CategorySchema,
  roles: z.tuple([PricedSchema, PricedSchema, PricedSchema, PricedSchema]),
  /** bonus[i] is paid per held role when at least i+1 roles are covered. */
  bonus: z.tuple([RewardSchema, RewardSchema, RewardSchema, RewardSchema]),
});

export const ItemSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('item'),
  category: CategorySchema,
  levels: z
    .array(PricedSchema.extend({ upkeep: UpkeepSchema.optional() }))
    .min(1)
    .max(4),
});

export const ActivitySchema = z.strictObject({
  ...cardBase,
  kind: z.literal('activity'),
  category: CategorySchema,
  levels: z.array(PricedSchema).min(1).max(4),
});

export const JobSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('job'),
  track: JobTrackSchema,
  level: z.int().min(1).max(3),
  hire: PricedSchema,
  upkeep: UpkeepSchema,
  /** Required below the top level, absent at the top level. */
  promotion: PricedSchema.optional(),
});

export const PartnerSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('partner'),
  /** Two versions with identical mechanics (R-REL-05); names/portraits come from locales/art. */
  versions: z.tuple([
    z.strictObject({ gender: z.enum(['female', 'male']) }),
    z.strictObject({ gender: z.enum(['female', 'male']) }),
  ]),
  levels: z.tuple([
    z.strictObject({ reward: RewardSchema, upkeep: UpkeepSchema.optional() }),
    z.strictObject({
      requirement: ResourceBundleSchema,
      reward: RewardSchema,
      upkeep: UpkeepSchema.optional(),
    }),
    z.strictObject({
      requirement: ResourceBundleSchema,
      reward: RewardSchema,
      upkeep: UpkeepSchema.optional(),
    }),
    z.strictObject({
      requirement: ResourceBundleSchema,
      reward: RewardSchema,
      upkeep: UpkeepSchema.optional(),
    }),
  ]),
});

export const ChildTraitSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('childTrait'),
  start: ResourceBundleSchema,
  /** Passive abilities: whenever the player uses `on`, they also get `reward` (R-CHT-01). */
  triggers: z.array(z.strictObject({ on: BoardSpaceIdSchema, reward: RewardSchema })).min(1),
});

export const LIFE_GOAL_METRICS = [
  'knowledgeAtDeath',
  'creativityAtDeath',
  'influenceAtDeath',
  'moneyAtDeath',
  'completedProjects',
  'itemsOwned',
  'partnerLevel',
  'jobLevel',
  'roundsLived',
] as const;

export const LifeGoalSchema = z.strictObject({
  ...cardBase,
  kind: z.literal('lifeGoal'),
  metric: z.enum(LIFE_GOAL_METRICS),
  award: z.strictObject({ lth: positive }),
  solo: z.strictObject({ atLeast: positive }),
});

export const CardSchema = z.discriminatedUnion('kind', [
  BasicProjectSchema,
  SingleRoundProjectSchema,
  GroupProjectSchema,
  ItemSchema,
  ActivitySchema,
  JobSchema,
  PartnerSchema,
  ChildTraitSchema,
  LifeGoalSchema,
]);
export type Card = z.infer<typeof CardSchema>;
export type CardKind = Card['kind'];
export type CardOf<K extends CardKind> = Extract<Card, { kind: K }>;
export type CardId = string;

const roundRange = z.tuple([positive, positive]);

export const RulesConfigSchema = z.strictObject({
  maxRounds: positive,
  /** Inclusive [first, last] round of each life stage; contiguous, covering 1..maxRounds. */
  stages: z.strictObject({ youth: roundRange, adulthood: roundRange, oldAge: roundRange }),
  startTime: positive,
  basicActionYield: positive,
  slotLimit: positive,
  sthRange: positive,
  /** Projects and Items & Activities row size by number of (market) players. */
  marketSize: z.record(z.enum(['1', '2', '3', '4']), positive),
  stressZones: z
    .array(
      z.strictObject({
        id: z.string(),
        spaces: positive,
        timeModifier: z.int(),
        start: z.literal(true).optional(),
      }),
    )
    .min(1),
  /** Stress gained at the start of each Old Age round, keyed by round number. */
  oldAgeStress: z.record(z.string().regex(/^\d+$/), count),
  inheritanceRate: positive,
  repeatSpaceStress: count,
  overtime: z.strictObject({ time: positive, stress: positive }),
  rest: z.strictObject({ relax: positive }),
  refreshRow: z.strictObject({ sth: positive }),
  discardCard: z.strictObject({ stress: count, sth: count }),
  /** R-UPK-07: penalty for an unpaid upkeep. */
  upkeepFailure: z.strictObject({ stress: count, sth: count }),
  /** R-UPK-05, R-PRJ-01: Stress per slot over the limit. */
  slotOverloadStress: count,
  /** R-UPK-05, R-REL-02: Stress per Partner beyond the first. */
  extraPartnerStress: count,
  /** R-JOB-04: Time spent on a promotion. */
  promotionTime: positive,
  /** R-PRJ-G-02: roles one player may hold in one Group Project. */
  groupRolesPerPlayer: positive,
  childTraitsDealt: positive,
  solo: z.strictObject({ marketPlayers: positive, lifeGoals: positive, winLth: positive }),
});
export type RulesConfig = z.infer<typeof RulesConfigSchema>;

export const PackSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Set to false for test packs: the budget linter then reports but never fails. */
  budgetLint: z.boolean().optional(),
  rules: RulesConfigSchema,
  cards: z.strictObject({
    projects: z.array(
      z.discriminatedUnion('kind', [
        BasicProjectSchema,
        SingleRoundProjectSchema,
        GroupProjectSchema,
      ]),
    ),
    itemsActivities: z.array(z.discriminatedUnion('kind', [ItemSchema, ActivitySchema])),
    jobs: z.array(JobSchema),
    partners: z.array(PartnerSchema),
    childTraits: z.array(ChildTraitSchema),
    lifeGoals: z.array(LifeGoalSchema),
  }),
});
export type Pack = z.infer<typeof PackSchema>;
/** Pack source as authored (before validation); same shape as `Pack`. */
export type PackInput = z.input<typeof PackSchema>;
/** Card source as authored (before validation). */
export type CardInputOf<K extends CardKind> = Extract<z.input<typeof CardSchema>, { kind: K }>;
