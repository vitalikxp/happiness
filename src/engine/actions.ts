import type { BoardSpaceId, ContentIndex, Stage } from '../content/index.ts';
import { applyReward, gainResources, gainTime } from './effects.ts';
import { advanceTurn, beginRound } from './flow.ts';
import { redrawRow, rowSize } from './market.ts';
import { emit, getPlayer, stageOf } from './state.ts';
import { addStress, changeSth, relieveStress, stressHeadroom } from './tracks.ts';
import type { Action, GameState, IllegalReason, PlayerState } from './types.ts';

/** Spaces resolved by the engine so far; the rest arrive with card mechanics (Roadmap M2). */
const IMPLEMENTED_SPACES: ReadonlySet<BoardSpaceId> = new Set([
  'study',
  'play',
  'interact',
  'tempJob',
  'overtime',
  'rest',
]);

/** R-SET-05, R-UPK-01: actions locked by life stage. */
export function isSpaceOpen(space: BoardSpaceId, stage: Stage): boolean {
  if (space === 'getJob' || space === 'developRelationship') return stage !== 'youth';
  if (space === 'overtime') return stage === 'adulthood';
  return true;
}

/** Why `action` is illegal right now; empty when it is legal. */
export function validate(state: GameState, content: ContentIndex, action: Action): IllegalReason[] {
  const player = state.players.find((p) => p.id === action.player);
  if (!player) return [{ code: 'unknownPlayer' }];

  if (action.type === 'chooseChildTrait') {
    if (state.phase !== 'setup' || state.pending?.type !== 'chooseChildTrait')
      return [{ code: 'wrongPhase' }];
    if (state.pending.player !== player.id) return [{ code: 'notYourTurn' }];
    return player.traitOffer.includes(action.card) ? [] : [{ code: 'notAnOption' }];
  }

  if (state.phase !== 'action') return [{ code: 'wrongPhase' }];
  if (!player.alive) return [{ code: 'playerDead' }];
  if (state.current !== player.id) return [{ code: 'notYourTurn' }];

  const { rules } = content;
  const stage = stageOf(rules, state.round);
  switch (action.type) {
    case 'placeTime': {
      const reasons: IllegalReason[] = [];
      if (player.time <= 0) reasons.push({ code: 'noTime' });
      if (!isSpaceOpen(action.space, stage)) reasons.push({ code: 'spaceLocked', stage });
      if (!IMPLEMENTED_SPACES.has(action.space)) reasons.push({ code: 'notImplemented' });
      // R-A-OVERTIME, R-STR-06: Overtime may not kill you.
      if (
        action.space === 'overtime' &&
        overtimeStress(state, content, player) > stressHeadroom(rules, player)
      ) {
        reasons.push({ code: 'wouldDie' });
      }
      return reasons;
    }
    case 'refreshRow':
      return rowSize(rules, action.row, stage, state.players.length) > 0
        ? []
        : [{ code: 'rowUnavailable' }];
    case 'discardCard':
      return player.tableau.some((c) => c.instanceId === action.instanceId)
        ? []
        : [{ code: 'notInTableau' }];
  }
}

function repeatPenalty(
  state: GameState,
  content: ContentIndex,
  player: PlayerState,
  space: BoardSpaceId,
): number {
  return state.placements[space].includes(player.id) ? content.rules.repeatSpaceStress : 0;
}

function overtimeStress(state: GameState, content: ContentIndex, player: PlayerState): number {
  return repeatPenalty(state, content, player, 'overtime') + content.rules.overtime.stress;
}

/** Apply an already validated action to a draft. */
export function resolve(draft: GameState, content: ContentIndex, action: Action): void {
  const { rules } = content;
  const player = getPlayer(draft, action.player);

  switch (action.type) {
    case 'chooseChildTrait': {
      // R-SET-06
      player.childTrait = action.card;
      player.traitOffer = [];
      emit(draft, { type: 'childTraitChosen', player: player.id, card: action.card });
      const trait = content.cards.get(action.card);
      if (trait?.kind === 'childTrait')
        applyReward(draft, rules, player, trait.start, 'childTrait');
      const next = draft.players.find((p) => p.childTrait === null);
      if (next) {
        draft.pending = { type: 'chooseChildTrait', player: next.id };
      } else {
        draft.pending = null;
        beginRound(draft, content, 1);
      }
      return;
    }

    case 'placeTime': {
      // R-ACT-01, R-ACT-02
      const penalty = repeatPenalty(draft, content, player, action.space);
      player.time -= 1;
      draft.placements[action.space].push(player.id);
      emit(draft, { type: 'timePlaced', player: player.id, space: action.space });
      addStress(draft, rules, player, penalty, 'repeatSpace');
      if (player.alive) resolveBoardSpace(draft, content, player, action.space);
      advanceTurn(draft, content);
      return;
    }

    case 'refreshRow': {
      // R-ACT-04: doesn't end the turn.
      changeSth(draft, rules, player, -rules.refreshRow.sth);
      redrawRow(
        draft,
        action.row,
        rowSize(rules, action.row, stageOf(rules, draft.round), draft.players.length),
      );
      emit(draft, {
        type: 'rowRefreshed',
        player: player.id,
        row: action.row,
        slots: [...draft.market[action.row].slots],
      });
      return;
    }

    case 'discardCard': {
      // R-ACT-05: doesn't end the turn (unless the Stress kills).
      const index = player.tableau.findIndex((c) => c.instanceId === action.instanceId);
      const [card] = player.tableau.splice(index, 1);
      if (card) emit(draft, { type: 'cardDiscarded', player: player.id, cardId: card.cardId });
      changeSth(draft, rules, player, -rules.discardCard.sth);
      addStress(draft, rules, player, rules.discardCard.stress, 'discard');
      if (!player.alive) advanceTurn(draft, content);
      return;
    }
  }
}

/** GDD §6 board actions. */
function resolveBoardSpace(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  space: BoardSpaceId,
): void {
  const { rules } = content;
  const amount = rules.basicActionYield;
  switch (space) {
    case 'study':
      gainResources(draft, player, { knowledge: amount });
      return;
    case 'play':
      gainResources(draft, player, { creativity: amount });
      return;
    case 'interact':
      gainResources(draft, player, { influence: amount });
      return;
    case 'tempJob':
      gainResources(draft, player, { money: amount });
      return;
    case 'overtime':
      addStress(draft, rules, player, rules.overtime.stress, 'overtime');
      if (player.alive) gainTime(draft, player, rules.overtime.time);
      return;
    case 'rest':
      relieveStress(draft, rules, player, rules.rest.relax, 'rest');
      return;
    case 'takeProject':
    case 'spend':
    case 'getJob':
    case 'developRelationship':
      throw new Error(`Board space ${space} is not implemented yet`);
  }
}
