import type { BoardSpaceId, ContentIndex, Stage } from '../content/index.ts';
import {
  movesMarkerToCard,
  resolveAdvanceProject,
  resolveChoice,
  resolvePromote,
  validateAdvanceProject,
  validateChoice,
  validatePromote,
} from './cardActions.ts';
import { cardOf, isOneRound, removeFromTableau, toDiscard } from './cards.ts';
import { applyReward, gainResources, gainTime } from './effects.ts';
import { advanceTurn, beginActionPhase, beginRound } from './flow.ts';
import { redrawRow, rowSize } from './market.ts';
import { emit, getPlayer, stageOf } from './state.ts';
import { addStress, changeSth, relieveStress, stressHeadroom } from './tracks.ts';
import { resolveUpkeep, validateUpkeep } from './upkeep.ts';
import type { Action, GameState, IllegalReason, PlayerState } from './types.ts';

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

  switch (action.type) {
    case 'chooseChildTrait':
      if (state.phase !== 'setup' || state.pending?.type !== 'chooseChildTrait')
        return [{ code: 'wrongPhase' }];
      if (state.pending.player !== player.id) return [{ code: 'notYourTurn' }];
      return player.traitOffer.includes(action.card) ? [] : [{ code: 'notAnOption' }];
    case 'payUpkeep':
    case 'refuseUpkeep':
      return validateUpkeep(state, content, player, action.instanceId, action.type === 'payUpkeep');
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
      // R-A-OVERTIME, R-STR-06: Overtime may not kill you.
      if (
        action.space === 'overtime' &&
        overtimeStress(state, content, player) > stressHeadroom(rules, player)
      ) {
        reasons.push({ code: 'wouldDie' });
      }
      if (reasons.length > 0) return reasons;
      return validateChoice(state, content, player, action.space, action.choice);
    }
    case 'advanceProject':
      return validateAdvanceProject(content, player, action);
    case 'promote':
      return validatePromote(state, content, player, action);
    case 'refreshRow':
      return rowSize(rules, action.row, stage, state.players.length) > 0
        ? []
        : [{ code: 'rowUnavailable' }];
    case 'discardCard': {
      // R-ACT-05: one-round cards have done their work and just wait for the End of Round.
      const entry = player.tableau.find((c) => c.instanceId === action.instanceId);
      if (!entry) return [{ code: 'notInTableau' }];
      return isOneRound(content, entry.cardId) ? [{ code: 'notDiscardable' }] : [];
    }
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

    case 'payUpkeep':
    case 'refuseUpkeep': {
      const more = resolveUpkeep(
        draft,
        content,
        player,
        action.instanceId,
        action.type === 'payUpkeep',
      );
      if (!more) beginActionPhase(draft, content);
      return;
    }

    case 'placeTime': {
      // R-ACT-01, R-ACT-02; Group Projects take the marker onto the card (R-PRJ-G-01).
      const penalty = repeatPenalty(draft, content, player, action.space);
      player.time -= 1;
      if (!movesMarkerToCard(content, action.choice))
        draft.placements[action.space].push(player.id);
      emit(draft, { type: 'timePlaced', player: player.id, space: action.space });
      addStress(draft, rules, player, penalty, 'repeatSpace');
      if (player.alive) resolveBoardSpace(draft, content, player, action);
      if (player.alive) applyTriggers(draft, content, player, action.space);
      advanceTurn(draft, content);
      return;
    }

    case 'advanceProject':
      resolveAdvanceProject(draft, content, player, action);
      advanceTurn(draft, content);
      return;

    case 'promote':
      resolvePromote(draft, content, player, action);
      advanceTurn(draft, content);
      return;

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
      const card = removeFromTableau(player, action.instanceId);
      if (card) {
        toDiscard(draft, content, card.cardId);
        emit(draft, { type: 'cardDiscarded', player: player.id, cardId: card.cardId });
      }
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
  action: Extract<Action, { type: 'placeTime' }>,
): void {
  const { rules } = content;
  const amount = rules.basicActionYield;
  switch (action.space) {
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
      if (action.choice) resolveChoice(draft, content, player, action.choice);
      return;
  }
}

/** R-CHT-01: Child Trait abilities fire whenever their board space is used. */
function applyTriggers(
  draft: GameState,
  content: ContentIndex,
  player: PlayerState,
  space: BoardSpaceId,
): void {
  const trait = player.childTrait ? cardOf(content, player.childTrait, ['childTrait']) : null;
  for (const trigger of trait?.triggers ?? []) {
    if (trigger.on === space)
      applyReward(draft, content.rules, player, trigger.reward, 'childTrait');
  }
}
