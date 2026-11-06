import type { ContentIndex } from '../content/index.ts';
import type { GameState, LthSource } from '../engine/index.ts';

// Balance metrics from docs/BALANCE.md §4, collected from finished bot games.

export interface GameRecord {
  seed: string;
  bots: string[];
  players: {
    bot: string;
    seat: number;
    lth: number;
    lthBySource: Partial<Record<LthSource, number>>;
    deathRound: number;
    deathCause: string;
    won: boolean;
    /** 1 / number of winners (shared victories split the win). */
    winShare: number;
  }[];
  soloWon: boolean | null;
  actions: number;
  picks: Record<string, number>;
  seen: Record<string, number>;
  goodHealthSeenByRound4: boolean;
  /** Life Goals in play and whether someone got each. */
  lifeGoals: { card: string; achieved: boolean }[];
}

export function recordGame(state: GameState, bots: string[], content: ContentIndex): GameRecord {
  const winners = state.result?.winners ?? [];
  const picks: Record<string, number> = {};
  const seen: Record<string, number> = {};
  const health = new Set(
    content.decks.projects.filter((id) => {
      const card = content.cards.get(id);
      return card?.kind === 'basicProject' && card.levels.some((l) => l.reward.goodHealth);
    }),
  );
  let round = 1;
  let healthSeen = false;
  for (const event of state.log) {
    if (event.type === 'roundStarted') round = event.round;
    if (event.type === 'cardTaken') picks[event.cardId] = (picks[event.cardId] ?? 0) + 1;
    if (event.type === 'slotRefilled' && event.card !== null) {
      seen[event.card] = (seen[event.card] ?? 0) + 1;
    }
    if (event.type === 'marketRefilled' || event.type === 'rowRefreshed') {
      for (const card of event.slots) {
        if (card === null) continue;
        seen[card] = (seen[card] ?? 0) + 1;
        if (round <= 4 && health.has(card)) healthSeen = true;
      }
    }
  }
  return {
    seed: state.seed,
    bots,
    players: state.players.map((p, seat) => ({
      bot: bots[seat] ?? '?',
      seat,
      lth: p.lth,
      lthBySource: p.lthBySource,
      deathRound: p.death?.round ?? 0,
      deathCause: p.death?.cause ?? 'alive',
      won: winners.includes(p.id),
      winShare: winners.includes(p.id) ? 1 / winners.length : 0,
    })),
    soloWon: state.result?.solo?.won ?? null,
    actions: state.log.filter((e) => e.type === 'timePlaced').length,
    picks,
    seen,
    goodHealthSeenByRound4: healthSeen,
    lifeGoals: (state.result?.lifeGoals ?? []).map((g) => ({
      card: g.card,
      achieved: g.winner !== null,
    })),
  };
}

export interface Report {
  games: number;
  players: number;
  msPerGame: number;
  avgLth: number;
  soloWinRate: number | null;
  byBot: Record<string, { seats: number; avgLth: number; winRate: number; avgDeathRound: number }>;
  bySeat: { seat: number; winRate: number; avgLth: number }[];
  deathRounds: Record<string, number>;
  deathCauses: Record<string, number>;
  lthBySource: Partial<Record<LthSource, number>>;
  pickRateOutliers: { card: string; rate: number; seen: number }[];
  goodHealthSeenByRound4: number;
  /** Share of games in which each Life Goal (when in play) was achieved by someone. */
  lifeGoalRates: { card: string; inPlay: number; rate: number }[];
}

const avg = (values: number[]) =>
  values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const pct = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Minimum appearances before a card's pick rate is judged. */
const MIN_SEEN = 20;
/** BALANCE §4: no card picked < 2% or > 40% when visible. */
export const PICK_RATE_BAND: readonly [number, number] = [0.02, 0.4];

export function aggregate(records: GameRecord[], elapsedMs: number): Report {
  const all = records.flatMap((r) => r.players);
  const playersPerGame = records[0]?.players.length ?? 0;

  const byBot: Report['byBot'] = {};
  for (const bot of new Set(all.map((p) => p.bot))) {
    const mine = all.filter((p) => p.bot === bot);
    byBot[bot] = {
      seats: mine.length,
      avgLth: avg(mine.map((p) => p.lth)),
      winRate: pct(
        mine.reduce((s, p) => s + p.winShare, 0),
        mine.length,
      ),
      avgDeathRound: avg(mine.map((p) => p.deathRound)),
    };
  }

  const bySeat = Array.from({ length: playersPerGame }, (_, seat) => {
    const mine = all.filter((p) => p.seat === seat);
    return {
      seat,
      winRate: pct(
        mine.reduce((s, p) => s + p.winShare, 0),
        mine.length,
      ),
      avgLth: avg(mine.map((p) => p.lth)),
    };
  });

  const count = (key: (p: (typeof all)[number]) => string) => {
    const out: Record<string, number> = {};
    for (const p of all) out[key(p)] = (out[key(p)] ?? 0) + 1;
    return out;
  };

  const sources: Partial<Record<LthSource, number>> = {};
  let positive = 0;
  for (const p of all) {
    for (const [source, value] of Object.entries(p.lthBySource) as [LthSource, number][]) {
      if (value <= 0) continue;
      sources[source] = (sources[source] ?? 0) + value;
      positive += value;
    }
  }
  for (const source of Object.keys(sources) as LthSource[]) {
    sources[source] = pct(sources[source] ?? 0, positive);
  }

  const picks: Record<string, number> = {};
  const seen: Record<string, number> = {};
  for (const r of records) {
    for (const [card, n] of Object.entries(r.picks)) picks[card] = (picks[card] ?? 0) + n;
    for (const [card, n] of Object.entries(r.seen)) seen[card] = (seen[card] ?? 0) + n;
  }
  const pickRateOutliers = Object.entries(seen)
    .filter(([, n]) => n >= MIN_SEEN)
    .map(([card, n]) => ({ card, seen: n, rate: Math.min(1, (picks[card] ?? 0) / n) }))
    .filter((c) => c.rate < PICK_RATE_BAND[0] || c.rate > PICK_RATE_BAND[1])
    .sort((a, b) => a.rate - b.rate);

  const goals = new Map<string, { inPlay: number; achieved: number }>();
  for (const g of records.flatMap((r) => r.lifeGoals)) {
    const entry = goals.get(g.card) ?? { inPlay: 0, achieved: 0 };
    entry.inPlay++;
    if (g.achieved) entry.achieved++;
    goals.set(g.card, entry);
  }
  const lifeGoalRates = [...goals.entries()]
    .map(([card, g]) => ({ card, inPlay: g.inPlay, rate: pct(g.achieved, g.inPlay) }))
    .sort((a, b) => a.rate - b.rate);

  const solo = records.filter((r) => r.soloWon !== null);
  return {
    games: records.length,
    players: playersPerGame,
    msPerGame: records.length > 0 ? elapsedMs / records.length : 0,
    avgLth: avg(all.map((p) => p.lth)),
    soloWinRate: solo.length > 0 ? pct(solo.filter((r) => r.soloWon).length, solo.length) : null,
    byBot,
    bySeat,
    deathRounds: count((p) => String(p.deathRound)),
    deathCauses: count((p) => p.deathCause),
    lthBySource: sources,
    pickRateOutliers,
    goodHealthSeenByRound4: pct(
      records.filter((r) => r.goodHealthSeenByRound4).length,
      records.length,
    ),
    lifeGoalRates,
  };
}
