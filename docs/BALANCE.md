# Balance

Status: **draft v0.1** — all numbers here are *initial hypotheses* to be verified by simulation
(`pnpm sim`). When simulation contradicts this doc, update the doc and log it in `DECISIONS.md`.

## 1. Lessons from the original (reviews & rules analysis)

| Observation | Source | Our response |
|---|---|---|
| Conversion of resources → LTH is opaque; takes several plays to understand | Meeple Mountain, Strange Assembly | Value previews in UI (`previewValues`), budget linter keeps cards on a consistent curve |
| Good-Health cards are rare (≈6/60 in the original) and can be taken by others or never appear | Meeple Mountain | ≥8/48 in our deck + optional `guaranteedHealthOffer` variant; sim tracks "health seen" rate |
| Without health improvement, the 2nd Old Age round is usually fatal → strong lifespan cliff | Rulebook | Intentional tension; tune `oldAgeStress` so ~50–70% of lives end in round 7 |
| Items/Activities are an efficient path to happiness for money-rich players; projects for others | Reviews | Keep both paths viable; check LTH-by-source in sim |
| Several viable strategies (job rush, no-job, balanced) | Opinionated Gamers | Sim metric: no archetype > 60% win rate in mirror matches |
| High information density (16 cards, 200+ icons in 4p) | Meeple Mountain | Clean card layout, progressive disclosure, left→right cost→reward |
| Random market availability restricts strategy | Opinionated Gamers | Refresh-for-STH rule + `previewValues`; watch "dead turn" metric |
| Downtime in 4p | Opinionated Gamers | N/A for bots; animate bot turns fast/skippable |

## 2. Value model (unit **R** = 1 basic resource)

| Thing | Value | Rationale |
|---|---|---|
| knowledge / creativity / influence | 1 R | Base unit; one board action yields 3 |
| money | 1 R | Temp Job yields 3 |
| time (1 action) | 3 R | Opportunity cost of a basic board action |
| LTH | 2 R (efficient), 5 R (inheritance floor) | Target lifetime ≈ 50 LTH from ≈ 130–160 R of throughput |
| STH | 0.75 R | Discounts + turn order + overflow |
| stress | 1.5 R | Rest = 1 action (3 R) for −2 stress; nonlinear near zone borders/death |
| relax | 1.5 R | Inverse of stress (capped by zone) |
| goodHealth | ≈ 3 R × remaining rounds + survival bonus | Extra Time each round + longer life; worth ~12–20 R mid-game |
| occupied slot | −1 R / round | Pressure on the 3-slot limit |
| upkeep (per round) | value × expected remaining rounds × 0.8 | Discount for risk/flexibility |

Lifetime throughput estimate: 8 rounds × 6 Time ≈ 48 actions minus upkeep Time, plus job income.
Solo target 50 LTH ⇒ average ≈ 2.5–3 R per LTH all-in. Revisit after first sim runs.

## 3. Card budget formula (used by the content linter)

For each card level: `net = value(reward) − value(cost) − 3R × timeSpent`.

| Card kind | Target `net` (initial) |
|---|---|
| Basic Project L1 (entry, takes slot) | −1 … +1 R |
| Basic Project L2 / L3 | +1 … +3 R |
| Basic Project L4 (completion) | +4 … +7 R |
| Single-Round Project, any level | +1 … +4 R, higher levels slightly better ratio |
| Group Project role (solo bonus tier 1) | 0 … +2 R; full group should beat solo play |
| Item level (instant) | −1 … +2 R; upkeep-levels judged over 3 rounds |
| Activity level | +0 … +2 R, mostly STH/LTH |
| Job (per round, net of upkeep incl. Time) | +2 … +5 R by level; promotion ≈ +3 … +6 R |
| Partner level advance | +1 … +4 R; Family level carries most LTH |

Linter flags levels outside the band; designer either fixes the numbers or adds a justification
(`balanceNote`) on the card.

## 4. Simulation metrics & targets (v1)

| Metric | Target |
|---|---|
| Games terminate, no engine errors | 100% |
| Avg final LTH, `greedy` bot, solo | 45–60 |
| Solo win rate (`greedy`) | 25–45% (human should feel it's achievable but not trivial) |
| Death round distribution | most deaths in round 7; reaching end of round 8: 5–15% |
| First-player win rate (4p mirror) | ≤ 30% |
| Any personality archetype win rate (mirror) | ≤ 60% |
| LTH by source (projects / items+activities / jobs / partners / goals+inheritance) | no single source > 50% on average |
| Card pick rate outliers | no card picked < 2% or > 40% when visible |
| Good Health seen by a player by round 4 | ≥ 70% |

## 5. Tunables (initial `rules.json` for fantasy pack)

```json
{
  "maxRounds": 8,
  "stages": { "youth": [1], "adulthood": [2, 5], "oldAge": [6, 8] },
  "startTime": 6,
  "basicActionYield": 3,
  "slotLimit": 3,
  "sthRange": 5,
  "marketSize": { "1": 3, "2": 3, "3": 3, "4": 4 },
  "stressZones": [
    { "id": "blessed",  "spaces": 3, "timeModifier": 1 },
    { "id": "healthy",  "spaces": 4, "timeModifier": 0, "start": true },
    { "id": "strained", "spaces": 3, "timeModifier": -1 },
    { "id": "ill",      "spaces": 3, "timeModifier": -2 },
    { "id": "failing",  "spaces": 2, "timeModifier": -3 }
  ],
  "oldAgeStress": { "6": 3, "7": 6, "8": 10 },
  "inheritanceRate": 5,
  "soloWinLth": 50
}
```
