# Game Design Document

Title: **«Дорога к счастью»** (EN: *Road to Happiness*) · Status: **draft v0.2** · Owner: project author · Engine terms are canonical; Russian fantasy display
names come from the content pack (see `CONTENT.md`).

Rule IDs (`R-<AREA>-<NN>`) are referenced from tests and code comments. Never renumber an existing ID;
deprecate it instead. All numbers marked *(tunable)* live in the pack's `rules` config, not in code.

---

## 1. Vision

You live one life. Every round is a decade. You have only so much **Time**; every choice is a life
event — study, craft, adventure, love, career, comfort. Ambition brings **Stress**, stress costs
time and eventually your life. Score is **Happiness** accumulated over the whole lifetime.

### Pillars

1. **Life as a story.** Every action reads as a biography line; the end screen tells your life story.
2. **Time is the master resource.** Everything costs Time; more Time is the rarest reward.
3. **Ambition vs. health.** Pushing harder is always possible — at the cost of Stress and lifespan.
4. **Transparent economy.** The original's main criticism is opaque conversion to score. Our UI
   always previews costs, rewards and upkeep consequences.
5. **Short sessions.** Solo vs bots: 20–30 min per life.

### Non-goals (v1)

Online multiplayer, accounts, monetization, real-time elements, expansions-style modules (events,
trends, pets, community) — keep the architecture open for them (`OPEN_QUESTIONS.md`).

---

## 2. Glossary (engine terms)

| Engine term | Meaning | Fantasy display (RU) |
|---|---|---|
| `knowledge` | Basic resource | Мудрость |
| `creativity` | Basic resource | Мастерство |
| `influence` | Basic resource | Слава |
| `money` | Currency | Золото |
| `time` (hourglass) | Worker; spent to take actions | Время (свеча) |
| `stress` | Position on the Stress track; past the end = death | Бремя |
| `sth` (Short-Term Happiness) | Per-round mood track, resets each round | Радость |
| `lth` (Long-Term Happiness) | **Score** | Счастье |
| `relax` | Effect: −1 Stress within the zone | Передышка |
| `goodHealth` | Effect: move one zone left | Благословение |
| Project | Long-term undertaking card | Начинание |
| Single-Round Project | One-off challenge card | Испытание |
| Group Project | Multi-role shared card | Поход |
| Item / Activity | Possession / one-off leisure | Имущество / Досуг |
| Job | Career card (3 tracks × 3 levels) | Служба в гильдии |
| Partner | Relationship card | Спутник жизни |
| Child Trait | Starting card with passive ability | Знамение рождения |
| Life Goal | End-game objective | Предназначение |
| Slot | Capacity for ongoing Projects/Job/Partners | — |

---

## 3. Components (engine-level)

- **Board rows** (market): Projects, Items & Activities, Jobs, Partners. Each row has a deck + discard.
- **Board action spaces**: Study, Play, Interact, Temp Job, Take Project, Spend, Get Job,
  Develop Relationship, Overtime, Rest. Spaces are **not exclusive** (anyone can use any space).
- **Per player**: Time markers, Stress track position, STH position, LTH score, resources, tableau
  (cards in front of the player), chosen Child Trait.
- **Shared**: Round track (life stages), revealed Life Goals, First Player marker.

---

## 4. Setup

- **R-SET-01** Players: 1 human + 0–3 bots (total 1–4). Solo mode = 1 human, no bots.
  "Quick game" default: 1 human + 2 `greedy` bots.
- **R-SET-02** Shuffle each deck with the game seed.
- **R-SET-03** Each player: Time = `startTime` *(tunable, default 6)*, Stress at the first space of
  the starting zone, STH at center, LTH = 0.
- **R-SET-04** Reveal Life Goals: one per player (solo: 3; see §11).
- **R-SET-05** Round marker on round 1 (Youth). Get Job, Develop Relationship and Overtime are
  unavailable in Youth.
- **R-SET-06** Deal 2 Child Traits per player; each keeps 1 (bots choose via policy), gains its
  starting resources and its passive ability for the whole game.
- **R-SET-07** First player: the human in solo/vs-bots.
- **R-SET-08** The human creates a character: name, grammatical gender, portrait. Pure flavor — no
  mechanical effect (mechanical variety comes from Child Traits). Bots get generated names/portraits.

---

## 5. Life stages & rounds

- **R-RND-01** Max 8 rounds *(tunable)*: Youth = round 1; Adulthood = rounds 2–5; Old Age = rounds 6–8.
- **R-RND-02** Each round has 3 phases: **Upkeep → Action → End of Round**.
- **R-RND-03** The game ends when all players have died (see §10).

### 5.1 Upkeep phase (in order)

- **R-UPK-01** Advance the Round marker (not in round 1). Apply stage transitions:
  entering Adulthood unlocks Get Job / Develop Relationship / Overtime; entering Old Age locks Overtime.
- **R-UPK-02** Old Age: every living player gains `oldAgeStress[round]` Stress *(tunable)*.
  This can kill (R-STR-05).
- **R-UPK-03** Refill market: discard all market cards, draw Projects and Items&Activities =
  `marketSize[players]` *(default 3 for 1–3 players, 4 for 4)*, Jobs and Partners = number of
  players (solo counts as 2). No Jobs/Partners in Youth. Empty deck ⇒ reshuffle its discard.
  (The original draws Partners from the bottom to hide the other side; irrelevant digitally.)
- **R-UPK-04** Time adjustment: player gets `startTime + zone.timeModifier` Time this round (see §8).
- **R-UPK-05** Overload: +1 Stress for each occupied slot beyond `slotLimit` *(default 3)*
  (Basic Projects, Job and Partners occupy slots). +1 Stress for each Partner beyond the first.
- **R-UPK-06** Pay upkeep for Items, Job, Partners in any order the player chooses; rewards from
  one may pay for another. Upkeep may include Time (markers are spent before the Action phase).
  Digitally: players resolve upkeep one after another, clockwise from the first player, and each picks
  one card at a time to pay or refuse. Cards bought this round first ask for upkeep next round.
- **R-UPK-07** If an upkeep is unpaid (cannot or chooses not to): discard the card, +1 Stress, −1 STH.

### 5.2 Action phase

- **R-ACT-01** Starting with the first player, clockwise, each player places 1 Time on a board
  action space or a card action in their tableau, and resolves it. Repeat until everyone is out of Time.
- **R-ACT-02** Placing on a **board** space where you already have Time this round: +1 Stress.
  Using several actions of the same card in a round does **not** add Stress.
- **R-ACT-03** A player with no Time is skipped.
- **R-ACT-04** Before their action (not after), a player may refresh one market row for −1 STH, repeatable.
- **R-ACT-05** During their turn a player may discard a card from their tableau: +1 Stress, −1 STH.

### 5.3 End of Round

- **R-END-01** Resolve Group Project bonus rewards (R-PRJ-G-03).
- **R-END-02** Set aside Single-Round Projects, Group Projects and Activities.
- **R-END-03** Return Time markers (except those in "Spent Time" — they are consumed).
- **R-END-04** Next first player = highest STH; tie ⇒ the tied player furthest clockwise from the
  current first player.
- **R-END-05** Reset all STH to center. Stress does **not** reset.

---

## 6. Board actions

| ID | Action | Effect | Available |
|---|---|---|---|
| R-A-STUDY | Study | +3 knowledge *(tunable)* | always |
| R-A-PLAY | Play | +3 creativity | always |
| R-A-INTERACT | Interact | +3 influence | always |
| R-A-TEMP | Temp Job | +3 money | always |
| R-A-PROJECT | Take Project | Take a market Project, pay its entry cost (§7.1) | always |
| R-A-SPEND | Spend | Take a market Item/Activity, choose level, pay, gain (§7.2) | always |
| R-A-JOB | Get Job | Take a market Job, pay hiring cost, gain reward (§7.3) | Adulthood+ |
| R-A-REL | Develop Relationship | Start or advance a Partner (§7.4) | Adulthood+ |
| R-A-OVERTIME | Overtime | +2 Time this round, +2 Stress; illegal if it would kill | Adulthood only |
| R-A-REST | Rest | −2 Stress, never leaving the current zone | always |

- **R-A-01** Taking a card from the market refills that market slot immediately, **except Jobs**
  (not refilled until next Upkeep).

---

## 7. Cards

All card numbers are content data. Each card has a stable ID, i18n keys, a category tag (thematic only)
and levels/roles with `cost`, `reward`, optional `upkeep` and `requirement`.

### 7.1 Projects

- **R-PRJ-01** Taking a slot-occupying card (Basic Project, Job, Partner) when all slots are already
  used: +1 Stress immediately. A new Job replacing the old one doesn't need an extra slot.
- **Basic Project** (4 levels):
  - **R-PRJ-B-01** On take: pay L1 cost, gain L1 reward, mark L1.
  - **R-PRJ-B-02** Card action "advance": place the Time listed on the next level (≥1) on the card,
    pay its cost (minus STH discount, R-STH-02), gain its reward. Only the next level; no skipping, no repeating.
  - **R-PRJ-B-03** Completing L4: card leaves the tableau (frees the slot), its Time goes to Spent Time.
- **Single-Round Project** (4 levels):
  - **R-PRJ-S-01** On take: choose any one level, pay its cost, gain its reward. Set aside at End of Round.
- **Group Project** (4 roles):
  - **R-PRJ-G-01** On take: choose a role, move your Time from the action space onto it, pay role
    cost, gain role reward. (If you already had Time on Take Project, +1 Stress applies first.)
  - **R-PRJ-G-02** Any player may join an open Group Project via Take Project, taking a free role.
    Max `groupRolesPerPlayer` *(default 2)* roles per player per project. Joining also moves the
    marker onto the card, so it doesn't occupy the Take Project space.
  - **R-PRJ-G-03** End of Round: for each role a player holds, they gain the bonus rewards listed
    for tiers 1..N where N = number of covered roles.
  - **R-PRJ-G-04** Group Projects do not occupy slots (like Single-Round Projects, they last one round).

### 7.2 Items & Activities

- **R-ITM-01** Spend: choose one level, pay its cost, gain its reward. No limit on how many you own.
- **R-ITM-02** Item levels may have upkeep (cost + reward) paid every Upkeep (R-UPK-06).
- **R-ITM-03** Activities are one-off; set aside at End of Round.

### 7.3 Jobs

- **R-JOB-01** Three tracks (engine: `science`, `arts`, `social`) × levels L1–L3.
- **R-JOB-02** Get Job: pay hiring cost, gain hiring reward. Max 1 Job: a new Job discards the old one (no penalty).
- **R-JOB-03** Upkeep: Time + resources ⇒ money income. Unpaid ⇒ fired (R-UPK-07).
- **R-JOB-04** Promotion (card action): only if the next-level Job of the same track is in the market.
  Spend `promotionTime` *(default 1)* Time, pay promotion cost, gain promotion reward (includes LTH),
  take the new Job (its market slot stays empty), discard the old. The new Job's hiring reward is
  **not** gained. Card actions never add the repeat-space Stress.

### 7.4 Partners

- **R-REL-01** Partner levels: Date → Relationship → Commitment → Family *(4 levels; names in pack)*.
- **R-REL-02** Start: take a market Partner at Date, gain Date reward. 2nd+ concurrent Partner: +1 Stress immediately.
- **R-REL-03** Advance (via Develop Relationship): only to the next level; must meet that level's
  **requirement** (resource thresholds held, not paid). Gain its reward.
- **R-REL-04** Upkeep grows with level (typically includes Time). Unpaid ⇒ breakup (R-UPK-07).
- **R-REL-05** Partner cards are double-sided: two versions (different gender, name, portrait) with
  identical mechanics. When taking a Partner the player chooses the version; bots choose by seeded policy.

### 7.5 Child Traits

- **R-CHT-01** Starting resources + one passive triggered ability (e.g. "+1 creativity whenever you Play"),
  usable unlimited times.

### 7.6 Life Goals

- **R-LG-01** Evaluated at game end. Multiplayer: each goal awards its LTH to the single best player;
  ties or a best value of 0 ⇒ nobody. Solo: a goal is achieved when its threshold is met, and an
  achieved goal also pays its LTH (R-SOLO-02).
- Metrics: resources/money held at death; completed Projects (Basic L4, Single-Round, Group Projects
  you started — everything set aside); Items owned; highest Partner level; Job level; rounds lived.

---

## 8. Stress track

Zones left→right *(tunable, initial proposal — BALANCE.md)*:

| Zone | Spaces | Time modifier |
|---|---|---|
| `blessed` | 3 | +1 |
| `healthy` (start, first space) | 4 | 0 |
| `strained` | 3 | −1 |
| `ill` | 3 | −2 |
| `failing` | 2 | −3 |

- **R-STR-01** +1 Stress = move one space right.
- **R-STR-02** Time per round = `startTime + timeModifier(zone)` (R-UPK-04).
- **R-STR-03** Rest and Relax never move you into a zone to the left; they stop at the first space of the current zone.
- **R-STR-04** Good Health: move one zone left keeping the relative position within the zone
  (clamped to the zone's size). The better zone gives +1 Time from the next Upkeep (R-STR-02).
  No effect in the leftmost zone.
- **R-STR-05** Moving past the last space ⇒ the player **dies** immediately; they take no further
  actions this game. Their LTH is final except end-game scoring (inheritance, Life Goals).
- **R-STR-06** Effects that would cause death through a *voluntary optional* action (Overtime) are illegal.
  Other sources (old age, upkeep failure, overload) can kill.

---

## 9. Short-Term Happiness (STH)

- **R-STH-01** Track from `−sthRange` to `+sthRange` *(default ±5)*; starts at 0 every round.
- **R-STH-02** When advancing a Basic Project level (L2–L4; not when taking it), pay 1 fewer resource of your choice per positive
  STH point (doesn't consume STH; applies to every advance this round). Negative STH ⇒ pay 1 extra
  resource of your choice per point. Total cost per resource type cannot go below 0.
- **R-STH-03** Overflow beyond the track ends converts to ±LTH.
- **R-STH-04** Used for first-player order (R-END-04) and market refresh (R-ACT-04).

---

## 10. Death & end of game

- **R-DTH-01** A player dies by R-STR-05, or at the end of the last round (round 8) if still alive.
- **R-DTH-02** Inheritance at death (paid immediately when the player dies): +1 LTH per 5 of each
  basic resource and per 5 money (computed per type, floor).
- **R-DTH-03** When all players are dead: score Life Goals (R-LG-01). Highest LTH wins. Tie-break: most
  resources + money held at death (sum of all types); still tied ⇒ shared victory.
- **R-DTH-04** The end screen shows LTH breakdown by source and a **biography** built from the event
  log with pack-provided templates (deterministic, offline).

---

## 11. Solo mode

- **R-SOLO-01** Setup as a 2-player market, no opponents, 3 Life Goals.
- **R-SOLO-02** Win = achieve all 3 solo Life Goal conditions **and** LTH ≥ `soloWinLth` *(default 50)*.
- **R-SOLO-03** Also report a score so players can chase personal bests (§15).

---

## 12. AI bots

- **R-BOT-01** Bots use only the public engine API and only information visible to a human player.
- **R-BOT-02** Difficulty levels v1: `random` (testing only), `greedy` (1-ply value model from
  BALANCE.md), `planner` (multi-step lookahead / MCTS-lite, later).
- **R-BOT-03** Bots choose deterministically given the game seed (own RNG stream).
- **R-BOT-04** Bots have "personality" weights (scholar / artisan / courtier / family / hedonist)
  for variety and flavor in the biography.
- Bots don't refresh market rows or discard cards in v1 (those don't end the turn).

---

## 13. Intentional deviations from the original (rule variants)

Mechanics stay close to the original by default. Deviations are **config flags**, default OFF unless noted.

| Flag | Problem in original | Variant |
|---|---|---|
| `guaranteedHealthOffer` | Few Good-Health cards; may never appear (esp. 2p) | Ensure ≥1 Good-Health Project in the market each Adulthood round |
| `previewValues` (ON) | Opaque conversion to LTH | UI shows rough value of each option (UI-only, no rules change) |
| `fixedFirstPlayerSolo` (ON) | — | Human always first in solo |

---

## 14. UX requirements (v1)

- Board view: market rows, action spaces with occupants, own tableau, opponents' summaries, stress/STH/LTH tracks.
- Every action/card shows: cost, reward, upkeep, slot/stress impact, and "can't because…" reasons.
- Hover/tap previews; undo within own turn until the action is confirmed (engine supports by replay).
- Event log in natural language; end-of-life biography and score breakdown.
- **Desktop only** in v1 (target ≥ 1280×720; mouse + keyboard). Mobile is not supported.
- Visual style: «книжная миниатюра» — parchment, initials, ornaments, vector icons in CSS/SVG.
- Save/resume (seed + action log in localStorage).

---

## 15. Meta-progression (outside a single game)

Lives a player has lived persist in the browser (localStorage, per device).

- **R-META-01** Personal records & life history: best score (solo and vs bots), archive of past lives
  (seed, character, final LTH breakdown, biography). Any archived life can be replayed from seed + log.
- **R-META-02** Achievements: pure predicates over a finished game (final state + event log),
  e.g. «Дожить до конца Старости», «Стать архимагом». Evaluated after the game, never during it.
- **R-META-03** Unlockable content: some Child Traits and Life Goals are locked until an achievement
  unlocks them. The **base set is always available and sufficient**; unlocks add variety, not power —
  unlockable cards pass the same budget linter. The unlocked set is part of `GameSetup`, so the engine
  stays deterministic.
