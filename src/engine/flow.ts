import {
  BOARD_SPACES,
  RESOURCES,
  ROWS,
  type BoardSpaceId,
  type ContentIndex,
} from '../content/index.ts';
import { archive, cardOf, countSlots } from './cards.ts';
import { applyReward } from './effects.ts';
import { scoreLifeGoals } from './lifeGoals.ts';
import { redrawRow, rowSize } from './market.ts';
import { clockwiseFrom, emit, getPlayer, stageOf } from './state.ts';
import { addStress, killPlayer, timeForRound } from './tracks.ts';
import { beginUpkeepDecisions } from './upkeep.ts';
import type { GameResult, GameState, PlayerState } from './types.ts';

// Round structure: Upkeep → Action → End of Round (GDD §5). Steps without decisions run automatically.

export function emptyPlacements(): Record<BoardSpaceId, string[]> {
  return Object.fromEntries(BOARD_SPACES.map((space) => [space, []])) as unknown as Record<
    BoardSpaceId,
    string[]
  >;
}

const alivePlayers = (draft: GameState) => draft.players.filter((p) => p.alive);

/** Automatic part of the Upkeep phase of `round` (R-UPK-01…05), then upkeep decisions. */
export function beginRound(draft: GameState, content: ContentIndex, round: number): void {
  const { rules } = content;
  draft.round = round; // R-UPK-01 (stage transitions are derived from the round)
  const stage = stageOf(rules, round);
  emit(draft, { type: 'roundStarted', round, stage });

  // R-UPK-02
  const oldAgeStress = rules.oldAgeStress[String(round)] ?? 0;
  if (stage === 'oldAge') {
    for (const player of alivePlayers(draft))
      addStress(draft, rules, player, oldAgeStress, 'oldAge');
  }

  // R-UPK-03
  for (const row of ROWS) {
    redrawRow(draft, row, rowSize(rules, row, stage, draft.players.length));
    emit(draft, { type: 'marketRefilled', row, slots: [...draft.market[row].slots] });
  }

  for (const player of alivePlayers(draft)) {
    // R-UPK-04
    player.time = timeForRound(rules, player.stress);
    emit(draft, { type: 'timeSet', player: player.id, time: player.time });
    // R-UPK-05
    const { slots, partners } = countSlots(content, player);
    const overload =
      Math.max(0, slots - rules.slotLimit) * rules.slotOverloadStress +
      Math.max(0, partners - 1) * rules.extraPartnerStress;
    addStress(draft, rules, player, overload, 'overload');
  }

  if (alivePlayers(draft).length === 0) {
    finishGame(draft, content);
    return;
  }
  // R-UPK-06: players with upkeep decide card by card; the Action phase starts afterwards.
  if (!beginUpkeepDecisions(draft, content)) beginActionPhase(draft, content);
}

/** After Upkeep: the first player with Time acts (R-ACT-01). */
export function beginActionPhase(draft: GameState, content: ContentIndex): void {
  draft.pending = null;
  if (alivePlayers(draft).length === 0) {
    finishGame(draft, content);
    return;
  }
  draft.phase = 'action';
  draft.current = nextToAct(draft, draft.firstPlayer, true);
  if (draft.current === null) endRound(draft, content);
}

/** First living player with Time, clockwise from `from` (R-ACT-01, R-ACT-03). */
function nextToAct(draft: GameState, from: string, inclusive: boolean): string | null {
  const order = clockwiseFrom(draft, from);
  const candidates = inclusive ? order : [...order.slice(1), ...order.slice(0, 1)];
  return candidates.find((p) => p.alive && p.time > 0)?.id ?? null;
}

/** After a turn-ending action: pass the turn, or end the round when nobody has Time left. */
export function advanceTurn(draft: GameState, content: ContentIndex): void {
  if (draft.current === null) return;
  draft.current = nextToAct(draft, draft.current, false);
  if (draft.current === null) endRound(draft, content);
}

/** R-END-01: each held role pays the bonus tiers 1…N, N = covered roles. */
function payGroupBonuses(draft: GameState, content: ContentIndex): void {
  for (const owner of draft.players) {
    for (const entry of owner.tableau) {
      const card = cardOf(content, entry.cardId, ['groupProject']);
      if (!card || !entry.roles) continue;
      const covered = entry.roles.filter((holder) => holder !== null).length;
      for (const holder of entry.roles) {
        if (holder === null) continue;
        const player = getPlayer(draft, holder);
        for (const tier of card.bonus.slice(0, covered)) {
          applyReward(draft, content.rules, player, tier, 'projects');
        }
      }
    }
  }
}

const ONE_ROUND_KINDS = new Set(['singleRoundProject', 'groupProject', 'activity']);

/** End of Round (R-END-*), then the next round or the end of the game. */
export function endRound(draft: GameState, content: ContentIndex): void {
  const { rules } = content;
  emit(draft, { type: 'roundEnding', round: draft.round });
  payGroupBonuses(draft, content);
  // R-END-02
  for (const player of draft.players) {
    for (const entry of [...player.tableau]) {
      if (ONE_ROUND_KINDS.has(content.cards.get(entry.cardId)?.kind ?? '')) {
        archive(draft, player, entry);
      }
    }
  }

  // R-END-03: Time placed on board spaces comes back (new markers are dealt in Upkeep).
  draft.placements = emptyPlacements();

  // R-END-04: highest STH among living players; ties go to the one furthest clockwise from the current first player.
  let best: PlayerState | null = null;
  for (const player of clockwiseFrom(draft, draft.firstPlayer)) {
    if (player.alive && (best === null || player.sth >= best.sth)) best = player;
  }
  if (best) draft.firstPlayer = best.id;

  // R-END-05
  for (const player of draft.players) player.sth = 0;
  emit(draft, { type: 'roundEnded', round: draft.round, nextFirstPlayer: best?.id ?? null });
  draft.current = null;

  if (draft.round >= rules.maxRounds) {
    // R-DTH-01: whoever is still alive dies at the end of the last round.
    for (const player of alivePlayers(draft)) killPlayer(draft, rules, player, 'endOfLife');
  }
  if (alivePlayers(draft).length === 0) {
    finishGame(draft, content);
    return;
  }
  beginRound(draft, content, draft.round + 1);
}

/** R-LG-01 / R-SOLO-02, then R-DTH-03 standings. */
export function finishGame(draft: GameState, content: ContentIndex): void {
  draft.phase = 'gameOver';
  draft.current = null;
  draft.pending = null;
  const goals = scoreLifeGoals(draft, content);
  const standings = draft.players
    .map((p) => ({
      player: p.id,
      lth: p.lth,
      leftovers: RESOURCES.reduce((sum, r) => sum + p.resources[r], 0),
    }))
    .sort((a, b) => b.lth - a.lth || b.leftovers - a.leftovers);
  const top = standings[0];
  const winners = top
    ? standings
        .filter((s) => s.lth === top.lth && s.leftovers === top.leftovers)
        .map((s) => s.player)
    : [];
  const result: GameResult = { standings, winners, ...goals };
  draft.result = result;
  emit(draft, { type: 'gameOver', result });
}
