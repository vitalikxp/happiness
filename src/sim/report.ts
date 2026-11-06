import { PICK_RATE_BAND, type Report } from './metrics.ts';

// Human-readable report with the targets of docs/BALANCE.md §4.

const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
const fixed = (x: number) => x.toFixed(1);

interface Check {
  metric: string;
  value: string;
  target: string;
  ok: boolean | null;
}

export function checks(report: Report): Check[] {
  const solo = report.players === 1;
  const endOfLife = report.deathCauses.endOfLife ?? 0;
  const lives = Object.values(report.deathCauses).reduce((a, b) => a + b, 0);
  const deathRounds = Object.entries(report.deathRounds).sort((a, b) => b[1] - a[1]);
  const topSource = Object.entries(report.lthBySource).sort((a, b) => b[1] - a[1])[0];
  const bots = Object.values(report.byBot);
  const result: Check[] = [
    {
      metric: 'Avg final LTH',
      value: fixed(report.avgLth),
      target: solo ? '45–60 (greedy, solo)' : '—',
      ok: solo ? report.avgLth >= 45 && report.avgLth <= 60 : null,
    },
    {
      metric: 'Most common death round',
      value: deathRounds[0]?.[0] ?? '—',
      target: '7',
      ok: deathRounds[0]?.[0] === '7',
    },
    {
      metric: 'Lives reaching the end of round 8',
      value: percent(lives > 0 ? endOfLife / lives : 0),
      target: '5–15%',
      ok: lives > 0 && endOfLife / lives >= 0.05 && endOfLife / lives <= 0.15,
    },
    {
      metric: 'Biggest LTH source',
      value: topSource ? `${topSource[0]} ${percent(topSource[1])}` : '—',
      target: '≤ 50%',
      ok: topSource ? topSource[1] <= 0.5 : null,
    },
    {
      metric: 'Cards with pick rate outside 2–40%',
      value: String(report.pickRateOutliers.length),
      target: '0',
      ok: report.pickRateOutliers.length === 0,
    },
    {
      metric: 'Good Health offered by round 4',
      value: percent(report.goodHealthSeenByRound4),
      target: '≥ 70%',
      ok: report.goodHealthSeenByRound4 >= 0.7,
    },
  ];
  if (solo && report.soloWinRate !== null) {
    result.push({
      metric: 'Solo win rate',
      value: percent(report.soloWinRate),
      target: '25–45%',
      ok: report.soloWinRate >= 0.25 && report.soloWinRate <= 0.45,
    });
  }
  if (!solo) {
    const seat0 = report.bySeat[0]?.winRate ?? 0;
    result.push({
      metric: 'First seat win rate',
      value: percent(seat0),
      target: report.players === 4 ? '≤ 30% (4p)' : `≈ ${percent(1 / report.players)}`,
      ok: report.players === 4 ? seat0 <= 0.3 : null,
    });
    if (bots.length > 1) {
      const best = Math.max(...bots.map((b) => b.winRate));
      result.push({
        metric: 'Best bot/personality win rate',
        value: percent(best),
        target: '≤ 60%',
        ok: best <= 0.6,
      });
    }
  }
  return result;
}

export function formatReport(report: Report, title: string): string {
  const mark = (ok: boolean | null) => (ok === null ? '·' : ok ? '✅' : '❌');
  const lines = [
    `# ${title}`,
    '',
    `${String(report.games)} games × ${String(report.players)} players, ${report.msPerGame.toFixed(1)} ms/game`,
    '',
    '| | Metric | Value | Target |',
    '|---|---|---|---|',
    ...checks(report).map((c) => `| ${mark(c.ok)} | ${c.metric} | ${c.value} | ${c.target} |`),
    '',
    '## By bot',
    '',
    '| Bot | Seats | Avg LTH | Win rate | Avg death round |',
    '|---|---|---|---|---|',
    ...Object.entries(report.byBot).map(
      ([bot, b]) =>
        `| ${bot} | ${String(b.seats)} | ${fixed(b.avgLth)} | ${percent(b.winRate)} | ${fixed(b.avgDeathRound)} |`,
    ),
    '',
    '## By seat',
    '',
    '| Seat | Win rate | Avg LTH |',
    '|---|---|---|',
    ...report.bySeat.map(
      (s) => `| ${String(s.seat)} | ${percent(s.winRate)} | ${fixed(s.avgLth)} |`,
    ),
    '',
    '## Deaths',
    '',
    `Rounds: ${Object.entries(report.deathRounds)
      .sort()
      .map(([r, n]) => `${r}: ${String(n)}`)
      .join(', ')}`,
    `Causes: ${Object.entries(report.deathCauses)
      .map(([c, n]) => `${c}: ${String(n)}`)
      .join(', ')}`,
    '',
    '## LTH by source',
    '',
    ...Object.entries(report.lthBySource)
      .sort((a, b) => b[1] - a[1])
      .map(([source, share]) => `- ${source}: ${percent(share)}`),
  ];
  if (report.pickRateOutliers.length > 0) {
    lines.push(
      '',
      `## Pick rate outliers (outside ${percent(PICK_RATE_BAND[0])}–${percent(PICK_RATE_BAND[1])})`,
      '',
      ...report.pickRateOutliers.map(
        (c) => `- ${c.card}: ${percent(c.rate)} of ${String(c.seen)} showings`,
      ),
    );
  }
  return lines.join('\n');
}
