# Roadmap

Each milestone ends in a working, tested state. Agents: pick the first unchecked item of the current
milestone unless told otherwise; keep tasks small (≤ ~1 day of human work).

## M0 — Scaffold ✅
- [x] pnpm + Vite + Preact + TS (strict) app; folder layout from `ARCHITECTURE.md §2`
- [x] Vitest, fast-check, ESLint (+ import boundaries), Prettier, `pnpm typecheck`
- [x] CI (GitHub Actions): typecheck, lint, test, build
- [x] i18n setup (ru default, en fallback) + one translated string end-to-end
- [x] Update `AGENTS.md` Commands section with the real commands

**DoD:** `pnpm build` and `pnpm test` green in CI; empty page renders a localized title.

## M1 — Engine core (with `core-test` pack) ✅
- [x] Content schema (zod) for rules config and all card kinds; `core-test` pack (~10 cards per deck)
- [x] State, seeded RNG, `createGame`, setup (R-SET-01…07)
- [x] Round flow & phases (R-RND-*, R-UPK-01…05, R-END-03…05), board actions without cards
  (R-A-STUDY/PLAY/INTERACT/TEMP/OVERTIME/REST)
- [x] Stress track & death (R-STR-*), STH (R-STH-*, incl. the R-STH-02 cost helper)
- [x] Inheritance & end of game (R-DTH-01…03, without Life Goals)
- [x] `getLegalActions`, `applyAction`, `explainIllegal`, `replay`; invariant property tests

**DoD:** a scripted game plays from setup to `gameOver`; every rule ID above has a test.

## M2 — All card mechanics
- [ ] Card board actions: Take Project, Spend, Get Job, Develop Relationship (R-A-PROJECT/SPEND/JOB/REL, R-A-01)
- [ ] Upkeep payments & failures (R-UPK-06, R-UPK-07); End of Round for cards (R-END-01, R-END-02)
- [ ] Basic / Single-Round / Group Projects (R-PRJ-*)
- [ ] Items & Activities incl. upkeep (R-ITM-*)
- [ ] Jobs & promotion (R-JOB-*); Partners (R-REL-*)
- [ ] Child Traits with triggers (R-CHT-*); Life Goals & solo win (R-LG-*, R-SOLO-02, R-SOLO-03)
- [ ] Effects DSL complete; `previewAction`

**DoD:** all GDD rule IDs implemented & tested; random-bot games always terminate (property test).

## M3 — Bots & simulator
- [ ] `random` and `greedy` bots (value model from BALANCE.md), personalities
- [ ] `pnpm sim` with report (metrics table from BALANCE.md §4), JSON output for diffs
- [ ] Budget linter for content

**DoD:** 1000-game sim runs < 1 min, report produced, linter in CI.

## M4 — Fantasy pack v1
- [ ] Terms, rules.json, locales/ru.json
- [ ] Cards per `CONTENT.md §4` (can land in batches: jobs+partners → projects → items → traits+goals)
- [ ] Biography templates
- [ ] Balance pass: sim targets from BALANCE.md met or deviations documented

**DoD:** linter clean (or justified), sim within targets.

## M5 — Playable UI
- [ ] New game screen: character creation (name, gender, portrait), quick game = 2 greedy bots
- [ ] Board layout (desktop): market rows, action spaces, tracks, own tableau, opponents panel
- [ ] «Книжная миниатюра» theme (CSS/SVG), card component (data-driven), icons, tooltips, previews,
  "can't because…" hints
- [ ] Turn flow with bot animation; pending decisions (upkeep, roles, trait choice)
- [ ] Log + end-of-life screen (score breakdown + biography)
- [ ] Playwright smoke: full solo game

**DoD:** a person can play a full solo game and a game vs 3 bots without dev tools.

## M6 — Polish & release
- [ ] Save/resume, undo within turn, settings (bot count/difficulty, variants)
- [ ] Personal records & life history (R-META-01)
- [ ] Achievements & unlockable Child Traits / Life Goals (R-META-02, R-META-03)
- [ ] Tutorial / first-game hints; accessibility pass
- [ ] Art pass: style guide + AI-generated illustrations with CREDITS; sound (optional)
- [ ] Deploy to static hosting

## Later (not v1)
Planner bot (MCTS), hot-seat, online multiplayer, mobile layout, more packs (sci-fi, modern),
events/trends modules, daily seeded challenge, LLM-written epilogue.
