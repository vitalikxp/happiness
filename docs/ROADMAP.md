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

## M2 — All card mechanics ✅
- [x] Card board actions: Take Project, Spend, Get Job, Develop Relationship (R-A-PROJECT/SPEND/JOB/REL, R-A-01)
- [x] Upkeep payments & failures (R-UPK-06, R-UPK-07); End of Round for cards (R-END-01, R-END-02)
- [x] Basic / Single-Round / Group Projects (R-PRJ-*)
- [x] Items & Activities incl. upkeep (R-ITM-*)
- [x] Jobs & promotion (R-JOB-*); Partners (R-REL-*)
- [x] Child Traits with triggers (R-CHT-*); Life Goals & solo win (R-LG-*, R-SOLO-02, R-SOLO-03)
- [x] Effects DSL complete; `previewAction`

**DoD:** all GDD rule IDs implemented & tested; random-bot games always terminate (property test).

## M3 — Bots & simulator ✅
- [x] `random` and `greedy` bots (value model from BALANCE.md), personalities
- [x] `pnpm sim` with report (metrics table from BALANCE.md §4), JSON output for diffs
- [x] Budget linter for content (`pnpm budget`; enforced in tests for packs with `budgetLint`)

**DoD:** 1000-game sim runs < 1 min, report produced, linter in CI.

## M4 — Fantasy pack v1 ✅
- [x] Terms, rules, Russian texts (assembled from the cards; `src/content/packs/fantasy/`)
- [x] Cards per `CONTENT.md §4` (base sets; unlockable traits/goals → M6)
- [x] Biography templates (generator → M5)
- [x] Balance pass: sim targets from BALANCE.md met (BALANCE §6)

**DoD:** linter clean (or justified), sim within targets.

## M5 — Playable UI ✅
- [x] New game screen: character creation (name, gender, portrait), quick game = 2 greedy bots
- [x] Board layout (desktop): market rows, action spaces, tracks, own tableau, opponents panel
- [x] «Книжная миниатюра» theme (CSS/SVG), card component (data-driven), icons, tooltips, previews,
  "can't because…" hints
- [x] Turn flow with bot animation; pending decisions (upkeep, roles, trait choice)
- [x] Log + end-of-life screen (score breakdown + biography generated from the pack's `bio.*` templates)
- [x] Playwright smoke: full solo game and a game vs 3 bots

**DoD:** a person can play a full solo game and a game vs 3 bots without dev tools.

## M6 — Polish & release
- [x] Save/resume, undo within the round, settings (theme, bot speed; bot count/difficulty in the
  new-game form). Rule variants (GDD §13) stay off until their flags exist in the engine.
- [x] Personal records & life history (R-META-01)
- [x] Achievements & unlockable Child Traits (4) / Life Goals (3) (R-META-02, R-META-03)
- [x] First-game hints (margin notes, each once); accessibility pass (axe-core WCAG 2.2 AA in e2e)
- [ ] Art pass: style guide + AI-generated illustrations with CREDITS; sound (optional)
- [ ] Deploy to static hosting

## Later (not v1)
Planner bot (MCTS), hot-seat, online multiplayer, mobile layout, more packs (sci-fi, modern),
events/trends modules, daily seeded challenge, LLM-written epilogue.
