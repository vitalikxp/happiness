import {
  RESOURCES,
  ROWS,
  type CardId,
  type CardKind,
  type CardOf,
  type ContentIndex,
  type Cost,
  type ResourceBundle,
  type RowId,
} from '../content/index.ts';
import { draw } from './market.ts';
import { emit } from './state.ts';
import type { GameState, LthSource, PlayerState, TableauCard } from './types.ts';

// Shared card helpers for projects, items, jobs and partners (GDD §7).

export function cardOf<K extends CardKind>(
  content: ContentIndex,
  id: CardId,
  kinds: readonly K[],
): CardOf<K> | null {
  const card = content.cards.get(id);
  return card && (kinds as readonly CardKind[]).includes(card.kind) ? (card as CardOf<K>) : null;
}

export function canAfford(player: PlayerState, cost: Cost | ResourceBundle): boolean {
  const time = 'time' in cost ? (cost.time ?? 0) : 0;
  return player.time >= time && RESOURCES.every((r) => player.resources[r] >= (cost[r] ?? 0));
}

export function meetsRequirement(player: PlayerState, requirement: ResourceBundle): boolean {
  return RESOURCES.every((r) => player.resources[r] >= (requirement[r] ?? 0));
}

/** Pay resources (and Time, if the cost has any). Caller checks affordability first. */
export function pay(draft: GameState, player: PlayerState, cost: Cost | ResourceBundle): void {
  const resources: Partial<Record<(typeof RESOURCES)[number], number>> = {};
  for (const r of RESOURCES) {
    const amount = cost[r] ?? 0;
    player.resources[r] -= amount;
    if (amount > 0) resources[r] = amount;
  }
  const time = 'time' in cost ? (cost.time ?? 0) : 0;
  player.time -= time;
  if (time > 0 || Object.keys(resources).length > 0) {
    emit(draft, { type: 'paid', player: player.id, resources, time });
  }
}

export function lthSourceOf(kind: CardKind): LthSource {
  switch (kind) {
    case 'basicProject':
    case 'singleRoundProject':
    case 'groupProject':
      return 'projects';
    case 'item':
    case 'activity':
      return 'itemsActivities';
    case 'job':
      return 'jobs';
    case 'partner':
      return 'partners';
    case 'childTrait':
      return 'childTrait';
    case 'lifeGoal':
      return 'lifeGoals';
  }
}

export function rowOf(content: ContentIndex, card: CardId): RowId | null {
  return ROWS.find((row) => content.decks[row].includes(card)) ?? null;
}

export function inMarket(state: GameState, row: RowId, card: CardId): boolean {
  return state.market[row].slots.includes(card);
}

/** Remove `card` from its market slot; refill the slot unless it's the Jobs row (R-A-01). */
export function takeFromMarket(draft: GameState, row: RowId, card: CardId): void {
  const slots = draft.market[row].slots;
  const index = slots.indexOf(card);
  slots[index] = row === 'jobs' ? null : draw(draft, row);
}

/** Return a card leaving play to its row's discard pile (discards, breakups, replaced jobs). */
export function toDiscard(draft: GameState, content: ContentIndex, card: CardId): void {
  const row = rowOf(content, card);
  if (row) draft.market[row].discard.push(card);
}

export function addToTableau(
  draft: GameState,
  player: PlayerState,
  cardId: CardId,
  extra: Partial<Pick<TableauCard, 'level' | 'version' | 'roles'>> = {},
): TableauCard {
  const entry: TableauCard = {
    instanceId: `c${String(draft.nextInstanceId++)}`,
    cardId,
    level: extra.level ?? null,
    version: extra.version ?? null,
    roles: extra.roles ?? null,
    round: draft.round,
  };
  player.tableau.push(entry);
  emit(draft, {
    type: 'cardTaken',
    player: player.id,
    cardId,
    instanceId: entry.instanceId,
    level: entry.level,
  });
  return entry;
}

export function removeFromTableau(player: PlayerState, instanceId: string): TableauCard | null {
  const index = player.tableau.findIndex((c) => c.instanceId === instanceId);
  return index < 0 ? null : (player.tableau.splice(index, 1)[0] ?? null);
}

/** Set a card aside for good (completed projects, finished activities). */
export function archive(draft: GameState, player: PlayerState, entry: TableauCard): void {
  removeFromTableau(player, entry.instanceId);
  player.archive.push({ cardId: entry.cardId, round: draft.round });
  emit(draft, { type: 'cardArchived', player: player.id, cardId: entry.cardId });
}

export function findInTableau(player: PlayerState, instanceId: string): TableauCard | null {
  return player.tableau.find((c) => c.instanceId === instanceId) ?? null;
}

/** Slots used by Basic Projects, the Job and Partners (R-UPK-05, R-PRJ-01). */
export function countSlots(
  content: ContentIndex,
  player: PlayerState,
): { slots: number; partners: number } {
  let slots = 0;
  let partners = 0;
  for (const entry of player.tableau) {
    const kind = content.cards.get(entry.cardId)?.kind;
    if (kind === 'basicProject' || kind === 'job' || kind === 'partner') slots++;
    if (kind === 'partner') partners++;
  }
  return { slots, partners };
}
