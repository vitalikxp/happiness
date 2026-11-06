import type { BoardSpaceId, CardId, ContentIndex } from '../content/index.ts';
import {
  addToTableau,
  archive,
  canAfford,
  cardOf,
  countSlots,
  findInTableau,
  inMarket,
  meetsRequirement,
  pay,
  removeFromTableau,
  takeFromMarket,
  toDiscard,
} from './cards.ts';
import { applyReward } from './effects.ts';
import { emit, getPlayer } from './state.ts';
import { addStress, applySthToCost } from './tracks.ts';
import type { Action, GameState, IllegalReason, PlayerState, SpaceChoice } from './types.ts';

// Card-driven board spaces (GDD §6, §7) and card actions in the tableau.

const CHOICES: Partial<Record<BoardSpaceId, readonly SpaceChoice['kind'][]>> = {
  takeProject: ['project', 'joinGroup'],
  spend: ['spend'],
  getJob: ['job'],
  developRelationship: ['startRelationship', 'advanceRelationship'],
};

export function needsChoice(space: BoardSpaceId): boolean {
  return space in CHOICES;
}

/** Group Projects move the Time marker from the space onto the card (R-PRJ-G-01). */
export function movesMarkerToCard(content: ContentIndex, choice: SpaceChoice | undefined): boolean {
  if (choice?.kind === 'joinGroup') return true;
  return choice?.kind === 'project' && content.cards.get(choice.card)?.kind === 'groupProject';
}

/** R-PRJ-01: Stress for adding a slot-occupying card when the slots are already full. */
function slotPenalty(content: ContentIndex, player: PlayerState, freedSlots = 0): number {
  const { slots } = countSlots(content, player);
  return slots - freedSlots >= content.rules.slotLimit ? content.rules.slotOverloadStress : 0;
}

const rolesHeldBy = (roles: readonly (string | null)[], player: string) =>
  roles.filter((holder) => holder === player).length;

export function validateChoice(
  state: GameState,
  content: ContentIndex,
  player: PlayerState,
  space: BoardSpaceId,
  choice: SpaceChoice | undefined,
): IllegalReason[] {
  const allowed = CHOICES[space];
  if (!allowed) return choice ? [{ code: 'unexpectedChoice' }] : [];
  if (!choice) return [{ code: 'missingChoice' }];
  if (!allowed.includes(choice.kind)) return [{ code: 'unexpectedChoice' }];

  switch (choice.kind) {
    case 'project': {
      if (!inMarket(state, 'projects', choice.card)) return [{ code: 'cardNotInMarket' }];
      const card = cardOf(content, choice.card, [
        'basicProject',
        'singleRoundProject',
        'groupProject',
      ]);
      if (!card) return [{ code: 'wrongCardKind' }];
      if (card.kind === 'groupProject') {
        if (choice.level !== undefined) return [{ code: 'invalidLevel' }];
        const role = card.roles[choice.role ?? -1];
        if (!role) return [{ code: 'invalidRole' }];
        return canAfford(player, role.cost) ? [] : [{ code: 'cannotAfford' }];
      }
      if (choice.role !== undefined) return [{ code: 'invalidRole' }];
      const level =
        card.kind === 'basicProject' ? (choice.level === undefined ? 1 : -1) : (choice.level ?? -1);
      const priced = card.levels[level - 1];
      if (!priced) return [{ code: 'invalidLevel' }];
      return canAfford(player, priced.cost) ? [] : [{ code: 'cannotAfford' }];
    }

    case 'joinGroup': {
      const owner = state.players.find((p) => p.id === choice.owner);
      const entry = owner ? findInTableau(owner, choice.instanceId) : null;
      const card = entry ? cardOf(content, entry.cardId, ['groupProject']) : null;
      if (!entry?.roles || !card) return [{ code: 'notInTableau' }];
      const role = card.roles[choice.role];
      if (!role) return [{ code: 'invalidRole' }];
      if (entry.roles[choice.role] !== null) return [{ code: 'roleTaken' }];
      if (rolesHeldBy(entry.roles, player.id) >= content.rules.groupRolesPerPlayer)
        return [{ code: 'roleLimit' }];
      return canAfford(player, role.cost) ? [] : [{ code: 'cannotAfford' }];
    }

    case 'spend': {
      if (!inMarket(state, 'itemsActivities', choice.card)) return [{ code: 'cardNotInMarket' }];
      const card = cardOf(content, choice.card, ['item', 'activity']);
      if (!card) return [{ code: 'wrongCardKind' }];
      const level = card.levels[choice.level - 1];
      if (!level) return [{ code: 'invalidLevel' }];
      return canAfford(player, level.cost) ? [] : [{ code: 'cannotAfford' }];
    }

    case 'job': {
      if (!inMarket(state, 'jobs', choice.card)) return [{ code: 'cardNotInMarket' }];
      const card = cardOf(content, choice.card, ['job']);
      if (!card) return [{ code: 'wrongCardKind' }];
      return canAfford(player, card.hire.cost) ? [] : [{ code: 'cannotAfford' }];
    }

    case 'startRelationship': {
      if (!inMarket(state, 'partners', choice.card)) return [{ code: 'cardNotInMarket' }];
      return cardOf(content, choice.card, ['partner']) ? [] : [{ code: 'wrongCardKind' }];
    }

    case 'advanceRelationship': {
      const entry = findInTableau(player, choice.instanceId);
      const card = entry ? cardOf(content, entry.cardId, ['partner']) : null;
      if (!entry || !card) return [{ code: 'notInTableau' }];
      const next = card.levels[entry.level ?? 0];
      if (!next) return [{ code: 'maxLevel' }];
      const requirement = 'requirement' in next ? next.requirement : {};
      return meetsRequirement(player, requirement) ? [] : [{ code: 'requirementNotMet' }];
    }
  }
}

export function resolveChoice(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  choice: SpaceChoice,
): void {
  const { rules } = content;
  switch (choice.kind) {
    case 'project': {
      const card = cardOf(content, choice.card, [
        'basicProject',
        'singleRoundProject',
        'groupProject',
      ]);
      if (!card) return;
      takeFromMarket(draft, 'projects', card.id);
      if (card.kind === 'groupProject') {
        // R-PRJ-G-01
        const role = choice.role ?? 0;
        const roles: (string | null)[] = [null, null, null, null];
        roles[role] = player.id;
        const entry = addToTableau(draft, player, card.id, { roles });
        emit(draft, {
          type: 'groupRoleTaken',
          player: player.id,
          instanceId: entry.instanceId,
          role,
        });
        const priced = card.roles[role];
        if (!priced) return;
        pay(draft, player, priced.cost);
        applyReward(draft, rules, player, priced.reward, 'projects');
        return;
      }
      // R-PRJ-B-01 (L1 on take), R-PRJ-S-01 (any one level)
      const level = card.kind === 'basicProject' ? 1 : (choice.level ?? 1);
      const priced = card.levels[level - 1];
      if (!priced) return;
      if (card.kind === 'basicProject')
        addStress(draft, rules, player, slotPenalty(content, player), 'overload');
      pay(draft, player, priced.cost);
      addToTableau(draft, player, card.id, { level });
      applyReward(draft, rules, player, priced.reward, 'projects');
      return;
    }

    case 'joinGroup': {
      // R-PRJ-G-02
      const owner = getPlayer(draft, choice.owner);
      const entry = findInTableau(owner, choice.instanceId);
      const card = entry ? cardOf(content, entry.cardId, ['groupProject']) : null;
      const priced = card?.roles[choice.role];
      if (!entry?.roles || !priced) return;
      entry.roles[choice.role] = player.id;
      emit(draft, {
        type: 'groupRoleTaken',
        player: player.id,
        instanceId: entry.instanceId,
        role: choice.role,
      });
      pay(draft, player, priced.cost);
      applyReward(draft, rules, player, priced.reward, 'projects');
      return;
    }

    case 'spend': {
      // R-ITM-01
      const card = cardOf(content, choice.card, ['item', 'activity']);
      const level = card?.levels[choice.level - 1];
      if (!card || !level) return;
      takeFromMarket(draft, 'itemsActivities', card.id);
      pay(draft, player, level.cost);
      addToTableau(draft, player, card.id, { level: choice.level });
      applyReward(draft, rules, player, level.reward, 'itemsActivities');
      return;
    }

    case 'job': {
      // R-JOB-02: one Job at a time; the old one is discarded without penalty.
      const card = cardOf(content, choice.card, ['job']);
      if (!card) return;
      const oldJob = player.tableau.find((c) => content.cards.get(c.cardId)?.kind === 'job');
      addStress(draft, rules, player, slotPenalty(content, player, oldJob ? 1 : 0), 'overload');
      if (oldJob) {
        removeFromTableau(player, oldJob.instanceId);
        toDiscard(draft, content, oldJob.cardId);
      }
      takeFromMarket(draft, 'jobs', card.id);
      pay(draft, player, card.hire.cost);
      addToTableau(draft, player, card.id);
      applyReward(draft, rules, player, card.hire.reward, 'jobs');
      return;
    }

    case 'startRelationship': {
      // R-REL-02
      const card = cardOf(content, choice.card, ['partner']);
      if (!card) return;
      const { partners } = countSlots(content, player);
      addStress(draft, rules, player, slotPenalty(content, player), 'overload');
      if (partners > 0) addStress(draft, rules, player, rules.extraPartnerStress, 'overload');
      takeFromMarket(draft, 'partners', card.id);
      addToTableau(draft, player, card.id, { level: 1, version: choice.version });
      applyReward(draft, rules, player, card.levels[0].reward, 'partners');
      return;
    }

    case 'advanceRelationship': {
      // R-REL-03
      const entry = findInTableau(player, choice.instanceId);
      const card = entry ? cardOf(content, entry.cardId, ['partner']) : null;
      if (!entry || !card) return;
      const level = (entry.level ?? 1) + 1;
      const next = card.levels[level - 1];
      if (!next) return;
      entry.level = level;
      emit(draft, {
        type: 'levelReached',
        player: player.id,
        instanceId: entry.instanceId,
        cardId: card.id,
        level,
      });
      applyReward(draft, rules, player, next.reward, 'partners');
      return;
    }
  }
}

type AdvanceProject = Extract<Action, { type: 'advanceProject' }>;
type Promote = Extract<Action, { type: 'promote' }>;

/** R-PRJ-B-02 with the R-STH-02 discount/surcharge. */
export function validateAdvanceProject(
  content: ContentIndex,
  player: PlayerState,
  action: AdvanceProject,
): IllegalReason[] {
  const entry = findInTableau(player, action.instanceId);
  const card = entry ? cardOf(content, entry.cardId, ['basicProject']) : null;
  if (!entry || !card) return [{ code: 'notInTableau' }];
  const next = card.levels[entry.level ?? 4];
  if (!next) return [{ code: 'maxLevel' }];
  const time = 'time' in next.cost ? next.cost.time : 0;
  if (player.time < time) return [{ code: 'noTime' }];
  const price = applySthToCost(next.cost, player.sth, action.sthAllocation);
  if (!price) return [{ code: 'invalidSthAllocation' }];
  return canAfford(player, price) ? [] : [{ code: 'cannotAfford' }];
}

export function resolveAdvanceProject(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  action: AdvanceProject,
): void {
  const entry = findInTableau(player, action.instanceId);
  const card = entry ? cardOf(content, entry.cardId, ['basicProject']) : null;
  if (!entry || !card) return;
  const level = (entry.level ?? 1) + 1;
  const next = card.levels[level - 1];
  const price = next ? applySthToCost(next.cost, player.sth, action.sthAllocation) : null;
  if (!next || !price) return;
  pay(draft, player, { ...price, time: 'time' in next.cost ? next.cost.time : 0 });
  entry.level = level;
  emit(draft, {
    type: 'levelReached',
    player: player.id,
    instanceId: entry.instanceId,
    cardId: card.id,
    level,
  });
  applyReward(draft, content.rules, player, next.reward, 'projects');
  // R-PRJ-B-03: a completed project leaves the tableau and frees its slot.
  if (level === card.levels.length) archive(draft, player, entry);
}

/** R-JOB-04 */
export function validatePromote(
  state: GameState,
  content: ContentIndex,
  player: PlayerState,
  action: Promote,
): IllegalReason[] {
  const entry = findInTableau(player, action.instanceId);
  const job = entry ? cardOf(content, entry.cardId, ['job']) : null;
  if (!entry || !job) return [{ code: 'notInTableau' }];
  if (!job.promotion) return [{ code: 'maxLevel' }];
  const target = cardOf(content, action.card, ['job']);
  if (
    !target ||
    !inMarket(state, 'jobs', action.card) ||
    target.track !== job.track ||
    target.level !== job.level + 1
  ) {
    return [{ code: 'noPromotionAvailable' }];
  }
  if (player.time < content.rules.promotionTime) return [{ code: 'noTime' }];
  return canAfford(player, job.promotion.cost) ? [] : [{ code: 'cannotAfford' }];
}

export function resolvePromote(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  action: Promote,
): void {
  const entry = findInTableau(player, action.instanceId);
  const job = entry ? cardOf(content, entry.cardId, ['job']) : null;
  if (!entry || !job?.promotion) return;
  pay(draft, player, { ...job.promotion.cost, time: content.rules.promotionTime });
  applyReward(draft, content.rules, player, job.promotion.reward, 'jobs');
  removeFromTableau(player, entry.instanceId);
  toDiscard(draft, content, job.id);
  takeFromMarket(draft, 'jobs', action.card);
  emit(draft, { type: 'promoted', player: player.id, from: job.id, to: action.card });
  addToTableau(draft, player, action.card);
}

/** Market cards that `kind` choices can target — used to enumerate legal actions. */
export function marketChoices(state: GameState, content: ContentIndex): SpaceChoice[] {
  const choices: SpaceChoice[] = [];
  const present = (card: CardId | null): card is CardId => card !== null;
  for (const id of state.market.projects.slots.filter(present)) {
    const card = content.cards.get(id);
    if (card?.kind === 'basicProject') choices.push({ kind: 'project', card: id });
    if (card?.kind === 'singleRoundProject') {
      card.levels.forEach((_, i) => choices.push({ kind: 'project', card: id, level: i + 1 }));
    }
    if (card?.kind === 'groupProject') {
      card.roles.forEach((_, role) => choices.push({ kind: 'project', card: id, role }));
    }
  }
  for (const owner of state.players) {
    for (const entry of owner.tableau) {
      entry.roles?.forEach((holder, role) => {
        if (holder === null)
          choices.push({ kind: 'joinGroup', owner: owner.id, instanceId: entry.instanceId, role });
      });
    }
  }
  for (const id of state.market.itemsActivities.slots.filter(present)) {
    const card = content.cards.get(id);
    if (card?.kind === 'item' || card?.kind === 'activity') {
      card.levels.forEach((_, i) => choices.push({ kind: 'spend', card: id, level: i + 1 }));
    }
  }
  for (const id of state.market.jobs.slots.filter(present)) choices.push({ kind: 'job', card: id });
  for (const id of state.market.partners.slots.filter(present)) {
    choices.push({ kind: 'startRelationship', card: id, version: 0 });
    choices.push({ kind: 'startRelationship', card: id, version: 1 });
  }
  return choices;
}
