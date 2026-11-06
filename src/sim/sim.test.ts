import { describe, expect, it } from 'vitest';
import { aggregate } from './metrics.ts';
import { checks, formatReport } from './report.ts';
import { runJob } from './job.ts';

describe('simulator', () => {
  const records = runJob({
    pack: 'core-test',
    bots: ['greedy', 'random'],
    seed: 's',
    indices: [0, 1, 2, 3],
  });
  const report = aggregate(records, 100);

  it('plays seeded bot games and records every player', () => {
    expect(records).toHaveLength(4);
    expect(records.map((r) => r.seed)).toEqual(['s-0', 's-1', 's-2', 's-3']);
    for (const r of records) {
      expect(r.players.map((p) => p.bot)).toEqual(['greedy', 'random']);
      expect(r.players.reduce((s, p) => s + p.winShare, 0)).toBeCloseTo(1);
      expect(r.actions).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same seeds', () => {
    expect(
      runJob({ pack: 'core-test', bots: ['greedy', 'random'], seed: 's', indices: [2] }),
    ).toEqual([records[2]]);
  });

  it('aggregates the BALANCE.md §4 metrics', () => {
    expect(report).toMatchObject({ games: 4, players: 2, msPerGame: 25 });
    expect(Object.keys(report.byBot).sort()).toEqual(['greedy', 'random']);
    const shares = Object.values(report.lthBySource).reduce((a, b) => a + b, 0);
    expect(shares).toBeCloseTo(1);
    expect(Object.values(report.deathCauses).reduce((a, b) => a + b, 0)).toBe(8);
    expect(checks(report).map((c) => c.metric)).toContain('Best bot/personality win rate');
  });

  it('formats a readable report', () => {
    const text = formatReport(report, 'Test');
    expect(text).toContain('# Test');
    expect(text).toContain('| Bot | Seats | Avg LTH | Win rate | Avg death round |');
    expect(text).toContain('## LTH by source');
  });
});
