import {
  VALUE,
  costValue,
  resourcesValue,
  rewardValue,
  type Card,
  type CardOf,
  type ContentIndex,
  type Reward,
  type ValueWeights,
} from '../content/index.ts';
import {
  getLegalActions,
  nextFloat,
  previewAction,
  timeForRound,
  trackLength,
  type Action,
  type GameState,
  type PlayerDelta,
  type PlayerId,
  type PlayerState,
} from '../engine/index.ts';
import { TASTES, TASTE_BONUS, type Personality, type Taste } from './personalities.ts';
import { botRng, turnActions, type Bot } from './types.ts';

// Greedy 1-ply bot (R-BOT-02): previews every legal action and scores it with the value model
// (docs/BALANCE.md §2) plus a heuristic value of the future a card opens up.

/** Ongoing income counts this share of each remaining round (risk and flexibility). */
const ONGOING_DISCOUNT = 0.8;
/** Future project/partner levels are uncertain: count this share of their value. */
const POTENTIAL_DISCOUNT = 0.6;
/** Expected uses of a Child Trait ability over a life. */
const TRAIT_USES = 5;
const DEATH = -1e9;

interface Ctx {
  content: ContentIndex;
  state: GameState;
  me: PlayerState;
  /** Full rounds after the current one. */
  roundsLeft: number;
  w: ValueWeights;
  taste: Taste;
}

export function greedyBot(personality: Personality = 'balanced'): Bot {
  return {
    name: personality === 'balanced' ? 'greedy' : `greedy:${personality}`,
    choose(state, content, player) {
      const options = turnActions(getLegalActions(state, content, player));
      const ctx = context(state, content, player, TASTES[personality]);
      const rng = botRng(state, player);
      let best: { action: Action; score: number } | null = null;
      for (const action of options) {
        // Tiny random jitter breaks ties without favouring the first listed action.
        const score = evaluate(ctx, action) + nextFloat(rng) * 1e-6;
        if (!best || score > best.score) best = { action, score };
      }
      if (!best) throw new Error(`No legal action for ${player}`);
      return best.action;
    },
  };
}

function context(state: GameState, content: ContentIndex, player: PlayerId, taste: Taste): Ctx {
  const me = state.players.find((p) => p.id === player);
  if (!me) throw new Error(`Unknown player ${player}`);
  const roundsLeft = Math.max(0, content.rules.maxRounds - state.round);
  // Late in life resources are worth little more than their inheritance (5 R → 1 LTH).
  const resource = 0.4 + 0.6 * Math.min(1, roundsLeft / 3);
  const time = VALUE.time * resource;
  // Good Health also buys an extra round of life in Old Age (see survivalValue).
  const lifeRound = roundsLeft > 0 ? content.rules.startTime * time * SURVIVAL_SHARE : 0;
  return {
    content,
    state,
    me,
    roundsLeft,
    taste,
    w: { ...VALUE, resource, time, goodHealth: VALUE.goodHealth + lifeRound },
  };
}

export function evaluate(ctx: Ctx, action: Action): number {
  const preview = previewAction(ctx.state, ctx.content, action);
  if (!preview.legal) return DEATH;
  const delta = preview.players[ctx.me.id];
  if (delta?.died) return DEATH;
  const score =
    (delta ? deltaValue(ctx, delta) : 0) + futureValue(ctx, action) + goalValue(ctx, action, delta);
  return score > 0 && matchesTaste(ctx, action) ? score * TASTE_BONUS : score;
}

function deltaValue(ctx: Ctx, d: PlayerDelta): number {
  return (
    resourcesValue(d.resources, ctx.w) +
    d.time * ctx.w.time +
    d.lth * ctx.w.lth +
    d.sth * ctx.w.sth +
    stressValue(ctx, d.stress)
  );
}

/** Value lost per Stress point: more as Old Age nears. */
function stressPerPoint(ctx: Ctx): number {
  return ctx.state.round >= ctx.content.rules.stages.oldAge[0] - 1 ? 2.5 : 1;
}

/** Stress costs per point plus the Time a zone change costs every remaining round. */
function stressValue(ctx: Ctx, change: number): number {
  if (change === 0) return 0;
  const { rules } = ctx.content;
  const perPoint = stressPerPoint(ctx);
  const from = ctx.me.stress;
  const timeChange = timeForRound(rules, from + change) - timeForRound(rules, from);
  return (
    -change * perPoint + timeChange * ctx.w.time * ctx.roundsLeft + survivalValue(ctx, from, change)
  );
}

/**
 * Old Age Stress arrives at the next Upkeep: crossing the line between surviving it and dying from
 * it is worth (roughly) the rest of the life.
 */
function survivalValue(ctx: Ctx, from: number, change: number): number {
  const { rules } = ctx.content;
  if (ctx.roundsLeft === 0) return 0;
  const incoming = rules.oldAgeStress[String(ctx.state.round + 1)] ?? 0;
  const last = trackLength(rules) - 1;
  const survives = (position: number) => position + incoming <= last;
  if (survives(from) === survives(from + change)) return 0;
  const life = ctx.roundsLeft * rules.startTime * ctx.w.time * SURVIVAL_SHARE;
  return survives(from + change) ? life : -life;
}

/** Share of the remaining rounds' Time a bot puts on staying alive. */
const SURVIVAL_SHARE = 0.5;

const net = (ctx: Ctx, reward: Reward, cost: Parameters<typeof costValue>[0]) =>
  rewardValue(reward, ctx.w) - costValue(cost, ctx.w);

/** Value of the levels after `level` of a Basic Project or Partner, if the chain is worth it. */
function levelsPotential(ctx: Ctx, card: Card, level: number): number {
  let total = 0;
  if (card.kind === 'basicProject') {
    for (const next of card.levels.slice(level))
      total += net(ctx, next.reward, next.cost) - ctx.w.time;
  } else if (card.kind === 'partner') {
    for (const next of card.levels.slice(level))
      total += rewardValue(next.reward, ctx.w) - ctx.w.time;
  }
  const feasible = Math.min(1, ctx.roundsLeft / 2);
  return Math.max(0, total) * POTENTIAL_DISCOUNT * feasible;
}

/**
 * R-UPK-05: extra Stress every future Upkeep from changing the slot-occupying cards
 * (`slots` and `partners` are the change, e.g. +1 for a new Partner, −1 for a finished project).
 */
function overloadCost(ctx: Ctx, slots: number, partners: number): number {
  const { rules } = ctx.content;
  const kinds = ctx.me.tableau.map((c) => ctx.content.cards.get(c.cardId)?.kind);
  const nowSlots = kinds.filter(
    (k) => k === 'basicProject' || k === 'job' || k === 'partner',
  ).length;
  const nowPartners = kinds.filter((k) => k === 'partner').length;
  const overload = (s: number, p: number) =>
    Math.max(0, s - rules.slotLimit) * rules.slotOverloadStress +
    Math.max(0, p - 1) * rules.extraPartnerStress;
  const extra =
    overload(nowSlots + slots, nowPartners + partners) - overload(nowSlots, nowPartners);
  // A point of Stress per round is also a step towards a worse zone: weigh it like Time lost.
  return extra * ctx.roundsLeft * (stressPerPoint(ctx) + ctx.w.time / 2);
}

function ongoing(ctx: Ctx, perRound: number): number {
  return perRound * ctx.roundsLeft * ONGOING_DISCOUNT;
}

function jobPerRound(ctx: Ctx, job: CardOf<'job'>): number {
  return net(ctx, job.upkeep.reward, job.upkeep.cost);
}

function partnerUpkeep(ctx: Ctx, card: CardOf<'partner'>, level: number): number {
  const upkeep = card.levels[level - 1]?.upkeep;
  return upkeep ? net(ctx, upkeep.reward, upkeep.cost) : 0;
}

/** End-of-round group bonus I'd gain by holding one more role (others may still join later). */
function groupGain(
  ctx: Ctx,
  card: CardOf<'groupProject'>,
  roles: readonly (string | null)[],
): number {
  const covered = roles.filter((r) => r !== null).length;
  const mine = roles.filter((r) => r === ctx.me.id).length;
  const tiers = (n: number) =>
    card.bonus.slice(0, n).reduce((s, t) => s + rewardValue(t, ctx.w), 0);
  return (mine + 1) * tiers(covered + 1) - mine * tiers(covered);
}

function futureValue(ctx: Ctx, action: Action): number {
  const { content, me } = ctx;
  const cardOf = (id: string) => content.cards.get(id);
  const entryOf = (instanceId: string) => me.tableau.find((c) => c.instanceId === instanceId);

  switch (action.type) {
    case 'chooseChildTrait': {
      const trait = cardOf(action.card);
      if (trait?.kind !== 'childTrait') return 0;
      return trait.triggers.reduce((s, t) => s + rewardValue(t.reward, ctx.w), 0) * TRAIT_USES;
    }
    case 'placeTime': {
      const choice = action.choice;
      if (!choice) return 0;
      switch (choice.kind) {
        case 'project': {
          const card = cardOf(choice.card);
          if (card?.kind === 'basicProject') {
            return levelsPotential(ctx, card, 1) - overloadCost(ctx, 1, 0);
          }
          if (card?.kind === 'groupProject') return groupGain(ctx, card, [null, null, null, null]);
          return 0;
        }
        case 'joinGroup': {
          const owner = ctx.state.players.find((p) => p.id === choice.owner);
          const entry = owner?.tableau.find((c) => c.instanceId === choice.instanceId);
          const card = entry ? cardOf(entry.cardId) : undefined;
          return card?.kind === 'groupProject' && entry?.roles
            ? groupGain(ctx, card, entry.roles)
            : 0;
        }
        case 'spend': {
          const card = cardOf(choice.card);
          const upkeep = card?.kind === 'item' ? card.levels[choice.level - 1]?.upkeep : undefined;
          return upkeep ? ongoing(ctx, net(ctx, upkeep.reward, upkeep.cost)) : 0;
        }
        case 'job': {
          const card = cardOf(choice.card);
          if (card?.kind !== 'job') return 0;
          const current = me.tableau.map((c) => cardOf(c.cardId)).find((c) => c?.kind === 'job');
          const lost = current?.kind === 'job' ? jobPerRound(ctx, current) : 0;
          return (
            ongoing(ctx, jobPerRound(ctx, card) - lost) - overloadCost(ctx, current ? 0 : 1, 0)
          );
        }
        case 'startRelationship': {
          const card = cardOf(choice.card);
          if (card?.kind !== 'partner') return 0;
          return (
            levelsPotential(ctx, card, 1) +
            ongoing(ctx, partnerUpkeep(ctx, card, 1)) -
            overloadCost(ctx, 1, 1)
          );
        }
        case 'advanceRelationship': {
          const entry = entryOf(choice.instanceId);
          const card = entry ? cardOf(entry.cardId) : undefined;
          if (card?.kind !== 'partner' || !entry) return 0;
          const level = (entry.level ?? 1) + 1;
          return (
            levelsPotential(ctx, card, level) +
            ongoing(ctx, partnerUpkeep(ctx, card, level) - partnerUpkeep(ctx, card, level - 1))
          );
        }
      }
      return 0;
    }
    case 'advanceProject': {
      const entry = entryOf(action.instanceId);
      const card = entry ? cardOf(entry.cardId) : undefined;
      if (!card || !entry) return 0;
      const level = (entry.level ?? 1) + 1;
      // Completing the project frees its slot.
      const freed =
        card.kind === 'basicProject' && level === card.levels.length
          ? -overloadCost(ctx, -1, 0)
          : 0;
      return levelsPotential(ctx, card, level) + freed;
    }
    case 'promote': {
      const entry = entryOf(action.instanceId);
      const from = entry ? cardOf(entry.cardId) : undefined;
      const to = cardOf(action.card);
      if (from?.kind !== 'job' || to?.kind !== 'job') return 0;
      return ongoing(ctx, jobPerRound(ctx, to) - jobPerRound(ctx, from));
    }
    case 'payUpkeep': {
      // Keeping the card: its next rounds of income (if any) and the levels it can still reach.
      const entry = entryOf(action.instanceId);
      const card = entry ? cardOf(entry.cardId) : undefined;
      if (!card || !entry) return 0;
      const later = Math.max(0, ctx.roundsLeft - 1) * ONGOING_DISCOUNT;
      if (card.kind === 'job') return Math.max(0, jobPerRound(ctx, card)) * later;
      if (card.kind === 'partner') {
        return (
          Math.max(0, partnerUpkeep(ctx, card, entry.level ?? 1)) * later +
          levelsPotential(ctx, card, entry.level ?? 1)
        );
      }
      if (card.kind === 'item') {
        const upkeep = card.levels[(entry.level ?? 1) - 1]?.upkeep;
        return upkeep ? Math.max(0, net(ctx, upkeep.reward, upkeep.cost)) * later : 0;
      }
      return 0;
    }
    case 'refuseUpkeep':
    case 'refreshRow':
    case 'discardCard':
      return 0;
  }
}

/** How much an action moves the player towards the revealed Life Goals (R-LG-01). */
function goalValue(ctx: Ctx, action: Action, delta: PlayerDelta | undefined): number {
  const { content, state } = ctx;
  const solo = state.players.length === 1;
  // Resources only count at death, so hoarding matters late in life.
  const lateness = Math.min(1, Math.max(0.2, 1 - ctx.roundsLeft / 4));
  let total = 0;
  for (const goalId of state.lifeGoals) {
    const goal = content.cards.get(goalId);
    if (goal?.kind !== 'lifeGoal') continue;
    const target = goal.solo.atLeast;
    const before = goalMetric(ctx, goal.metric);
    const after = before + goalProgress(ctx, goal.metric, action, delta);
    const gain = (Math.min(after, target) - Math.min(before, target)) / target;
    if (gain === 0) continue;
    const resourceGoal = goal.metric.endsWith('AtDeath');
    // Solo: the three goals decide the win, so they weigh more than their LTH.
    const weight = goal.award.lth * ctx.w.lth * (solo ? GOAL_SOLO_WEIGHT : 1);
    total += gain * weight * (resourceGoal ? lateness : 1);
  }
  return total;
}

/** Solo games are won only with all three goals: value their progress above their LTH. */
const GOAL_SOLO_WEIGHT = 2.5;

function goalMetric(ctx: Ctx, metric: CardOf<'lifeGoal'>['metric']): number {
  const { me, content } = ctx;
  const kindOf = (id: string) => content.cards.get(id)?.kind;
  switch (metric) {
    case 'knowledgeAtDeath':
      return me.resources.knowledge;
    case 'creativityAtDeath':
      return me.resources.creativity;
    case 'influenceAtDeath':
      return me.resources.influence;
    case 'moneyAtDeath':
      return me.resources.money;
    case 'completedProjects':
      return me.archive.filter((a) => (kindOf(a.cardId) ?? '').endsWith('roject')).length;
    case 'itemsOwned':
      return me.tableau.filter((c) => kindOf(c.cardId) === 'item').length;
    case 'partnerLevel':
      return Math.max(
        0,
        ...me.tableau.filter((c) => kindOf(c.cardId) === 'partner').map((c) => c.level ?? 0),
      );
    case 'jobLevel':
      return Math.max(
        0,
        ...me.tableau.map((c) => {
          const card = content.cards.get(c.cardId);
          return card?.kind === 'job' ? card.level : 0;
        }),
      );
    case 'roundsLived':
      return 0; // handled by Stress valuation
    case 'activitiesDone':
      return [...me.archive, ...me.tableau].filter((c) => kindOf(c.cardId) === 'activity').length;
    case 'basicProjectsCompleted':
      return me.archive.filter((a) => kindOf(a.cardId) === 'basicProject').length;
    case 'resourcesAtDeath':
      return me.resources.knowledge + me.resources.creativity + me.resources.influence;
  }
}

/** Estimated change of a goal metric caused by `action`. */
function goalProgress(
  ctx: Ctx,
  metric: CardOf<'lifeGoal'>['metric'],
  action: Action,
  delta: PlayerDelta | undefined,
): number {
  const { content, me } = ctx;
  const card = (id: string) => content.cards.get(id);
  switch (metric) {
    case 'knowledgeAtDeath':
    case 'creativityAtDeath':
    case 'influenceAtDeath':
    case 'moneyAtDeath': {
      const resource = metric.replace('AtDeath', '') as keyof PlayerDelta['resources'];
      return delta?.resources[resource] ?? 0;
    }
    case 'completedProjects': {
      if (action.type === 'advanceProject') {
        const entry = me.tableau.find((c) => c.instanceId === action.instanceId);
        const c = entry ? card(entry.cardId) : undefined;
        return c?.kind === 'basicProject' && (entry?.level ?? 0) + 1 === c.levels.length ? 1 : 0;
      }
      if (action.type === 'placeTime' && action.choice?.kind === 'project') {
        const kind = card(action.choice.card)?.kind;
        return kind === 'singleRoundProject' || kind === 'groupProject' ? 1 : 0;
      }
      return 0;
    }
    case 'itemsOwned':
      return action.type === 'placeTime' &&
        action.choice?.kind === 'spend' &&
        card(action.choice.card)?.kind === 'item'
        ? 1
        : 0;
    case 'partnerLevel': {
      if (action.type !== 'placeTime') return 0;
      const current = goalMetric(ctx, 'partnerLevel');
      if (action.choice?.kind === 'startRelationship') return current === 0 ? 1 : 0;
      if (action.choice?.kind === 'advanceRelationship') {
        const instanceId = action.choice.instanceId;
        const level = (me.tableau.find((c) => c.instanceId === instanceId)?.level ?? 0) + 1;
        return Math.max(0, level - current);
      }
      return 0;
    }
    case 'jobLevel': {
      const current = goalMetric(ctx, 'jobLevel');
      const target =
        action.type === 'promote'
          ? action.card
          : action.type === 'placeTime' && action.choice?.kind === 'job'
            ? action.choice.card
            : null;
      const c = target ? card(target) : undefined;
      return c?.kind === 'job' ? Math.max(0, c.level - current) : 0;
    }
    case 'roundsLived':
      return 0;
    case 'activitiesDone':
      return action.type === 'placeTime' &&
        action.choice?.kind === 'spend' &&
        card(action.choice.card)?.kind === 'activity'
        ? 1
        : 0;
    case 'basicProjectsCompleted': {
      if (action.type !== 'advanceProject') return 0;
      const entry = me.tableau.find((c) => c.instanceId === action.instanceId);
      const c = entry ? card(entry.cardId) : undefined;
      return c?.kind === 'basicProject' && (entry?.level ?? 0) + 1 === c.levels.length ? 1 : 0;
    }
    case 'resourcesAtDeath': {
      const r = delta?.resources;
      return (r?.knowledge ?? 0) + (r?.creativity ?? 0) + (r?.influence ?? 0);
    }
  }
}

function matchesTaste(ctx: Ctx, action: Action): boolean {
  const { taste, content } = ctx;
  const card = (id: string) => content.cards.get(id);
  const categoryOf = (id: string) => {
    const c = card(id);
    return c && 'category' in c ? c.category : null;
  };
  switch (action.type) {
    case 'placeTime': {
      if (taste.spaces.includes(action.space)) return true;
      const choice = action.choice;
      if (!choice) return false;
      switch (choice.kind) {
        case 'project':
          return taste.categories.includes(categoryOf(choice.card) ?? '');
        case 'spend':
          return taste.itemsActivities || taste.categories.includes(categoryOf(choice.card) ?? '');
        case 'job': {
          const c = card(choice.card);
          return c?.kind === 'job' && taste.tracks.includes(c.track);
        }
        case 'startRelationship':
        case 'advanceRelationship':
          return taste.partners;
        case 'joinGroup':
          return false;
      }
      return false;
    }
    case 'promote': {
      const c = card(action.card);
      return c?.kind === 'job' && taste.tracks.includes(c.track);
    }
    case 'advanceProject': {
      const entry = ctx.me.tableau.find((c) => c.instanceId === action.instanceId);
      return entry ? taste.categories.includes(categoryOf(entry.cardId) ?? '') : false;
    }
    default:
      return false;
  }
}
