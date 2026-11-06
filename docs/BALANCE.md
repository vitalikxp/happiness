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

Implemented in `src/content/valueModel.ts` (used by the budget linter and the greedy bot).

| Thing | Value | Rationale |
|---|---|---|
| knowledge / creativity / influence | 1 R | Base unit; one board action yields 3 |
| money | 1 R | Temp Job yields 3 |
| time (1 action) | 3 R | Opportunity cost of a basic board action |
| LTH | **2.75 R** (efficient), 5 R (inheritance floor) | Was 2 R; simulation showed ~80 LTH per greedy solo life, so LTH was priced up (M4) |
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

## 4a. How to run

```bash
pnpm sim --games 1000 --bots greedy,greedy,greedy --seed 1 --json report.json   # quick-game shape
pnpm sim --games 1000 --bots greedy                                             # solo targets
pnpm sim --games 1000 --bots greedy:scholar,greedy:artisan,greedy:courtier,greedy:family  # archetypes
pnpm budget --pack fantasy --all
```

Compare JSON reports between changes. The `core-test` pack is deliberately *not* balanced (it's
for engine tests); its reports only show that bots and metrics work. First real numbers come with
the fantasy pack (M4).

## 5. Tunables (fantasy pack 0.1.0)

The source of truth is `src/content/packs/fantasy/index.ts` (`rules`). Values that came out of the M4
balance pass:

| Tunable | Value | Why |
|---|---|---|
| `oldAgeStress` | round 6: **6**, 7: **8**, 8: **5** | Without Good Health a life ends at the start of round 7, with one it lasts into round 8, two can reach the end. Rest can't leave a zone, so round 7 decides most lives. |
| Life Goal solo thresholds | resources 8 (money 12), projects 5, items 5, partner level 3, job level 3, rounds lived 8 | Solo win ≈ 30%: all three goals are the bottleneck (goal set ≈ 30%, ≥ 50 LTH ≈ 85%). |
| Life Goal award | 5 LTH each | ~17% of all LTH. |
| Basic project LTH | L1 0 · L2 3 · L3 3 · L4 6 (long 7, health: Good Health only) | Projects stay the biggest source but ≤ 50%. |
| Group projects | role pays 3, gives resources + Joy; bonus tiers LTH 1 · money 1 · Joy 1 · Joy 1 | Full groups were picked > 55% and pushed projects over 50% of LTH in multiplayer. |
| Partner requirements | skills 4 / 6 / 9, money 5 / 8 / 12 | Partners were too hard to reach (≈ 8% of LTH). |

Everything else is as in `core-test` (start Time 6, 3 slots, STH ±5, stress zones 3/4/3/3/2).

## 6. Results (fantasy 0.1.0, 1000 games each, `pnpm sim --pack fantasy`)

| Metric | Solo `greedy` | 3 × `greedy` | 4 archetypes | Target |
|---|---|---|---|---|
| Avg final LTH | 57.1 | 54.1 | 53.4 | 45–60 (solo) |
| Solo win rate | 29.9% | — | — | 25–45% |
| Most common death round | 7 | 7 | 7 | 7 |
| Lives reaching the end | 6.1% | 6.7% | 6.8% | 5–15% |
| Biggest LTH source | projects 39% | projects 49% | projects 49% | ≤ 50% |
| Pick-rate outliers | 0 | (solo only) | (solo only) | 0 |
| Good Health offered by round 4 | 92% | 92% | 98% | ≥ 70% |
| First seat win rate | — | 35% (≈ 33% fair) | 26% | ≤ 30% (4p) |
| Best archetype win rate | — | — | 26% | ≤ 60% |

Notes:
- Pick rates are judged on solo runs only: with 3–4 players almost every visible card gets taken.
- Results depend on the bot. Greedy knows the revealed Life Goals, values Good Health as an extra
  round of life and foresees Old Age Stress — without that, solo wins were ~2% and nobody reached
  the end of life. Re-run the sim after changing the bot as well as after changing content.
- Jobs show a small LTH share (~6%) because their income is money, which turns into LTH through
  Items & Activities.
