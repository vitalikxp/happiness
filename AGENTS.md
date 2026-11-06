# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, etc.) and humans working in this repo.
Keep this file short; details live in `docs/`. Read the relevant doc **before** changing that area.

## What this project is

A browser game (HTML/TS) — a single-life "worker placement + resource conversion" game where you
live one life from youth to old age and try to accumulate the most **Happiness**. Mechanically
inspired by the board game *The Pursuit of Happiness* (Artipia Games, 2015). Content (cards, names,
texts, numbers, art) is **our own**; the first content pack is set in a **classic fantasy** world.

- v1 scope: **solo vs 0–3 AI bots**, in-browser, no server.
- Stack: **TypeScript + Vite + Preact**, package manager **pnpm** (see `docs/ARCHITECTURE.md`).
- Docs and code: **English**. Game UI and content texts: **Russian** (via i18n; English as fallback).

## Document map (source of truth)

| Doc | Owns |
|---|---|
| `docs/GDD.md` | Game rules. Every rule has an ID (`R-xxx`). Code must match the GDD. |
| `docs/ARCHITECTURE.md` | Layers, engine API, state model, effects DSL, content pack format, testing. |
| `docs/CONTENT.md` | Content system & the fantasy setting bible (terminology, tone, card lists). |
| `docs/BALANCE.md` | Economy value model, card budget formula, simulation & balance targets. |
| `docs/ROADMAP.md` | Milestones with Definition of Done. Pick work from here. |
| `docs/DECISIONS.md` | Architecture/design decision log (ADR-lite). Append, don't rewrite. |
| `docs/OPEN_QUESTIONS.md` | Unresolved questions. Ask the owner instead of guessing. |
| `docs/research/original-game.md` | Summary of the original's rules & reviews. **Reference only.** |

## Hard rules

1. **No copying of the original game's protected expression.** Do not reuse its title, card names,
   card texts, illustrations, iconography, or per-card numbers. Mechanics are fine; content is ours.
   The research doc is for understanding mechanics, not for transcribing cards.
2. **Engine is pure and deterministic.** `src/engine/` has no DOM, Preact, `Math.random`, `Date`,
   timers, or I/O. Randomness only through the seeded RNG stored in state. Same seed + same action
   log ⇒ identical state.
3. **Rules live in the GDD, numbers live in content.** No magic numbers in engine code: tunables go to
   the pack's `rules` config or card data. Card effects are declarative data (effects DSL), not code.
4. **GDD first.** If a task changes game rules, update `docs/GDD.md` (with rule IDs) in the same change.
   If the GDD is silent or ambiguous — don't invent; add an entry to `docs/OPEN_QUESTIONS.md` and ask.
5. **One game engine for everyone.** UI, bots and the simulator all go through the same public engine
   API (`getLegalActions` / `applyAction`). Bots never read hidden info or mutate state.
6. **All player-facing strings via i18n keys.** No hard-coded Russian/English text in components or engine.
7. **Preact, not React; pnpm, not npm/yarn.** Import from `preact` / `preact/hooks` / `@preact/signals`.
   Don't add React-only libraries or `preact/compat` without an ADR. Only `pnpm-lock.yaml` is committed.
8. Significant decisions → append to `docs/DECISIONS.md`.

## Workflow for agents

1. Read `AGENTS.md`, then the docs relevant to the task (usually GDD + ARCHITECTURE).
2. For non-trivial work, state a short plan first; reference rule IDs and roadmap milestone.
3. Implement in small, reviewable steps. Engine change ⇒ unit tests named after rule IDs
   (e.g. `it('R-STR-03: entering a worse stress zone reduces time next upkeep')`).
4. Run checks (below) before declaring done. Report failures honestly.
5. Update docs touched by the change (GDD, CONTENT, BALANCE, ROADMAP checkboxes).

## Commands

> The project is not scaffolded yet (Roadmap M0). Planned commands — keep this list in sync once real:

```bash
pnpm install
pnpm dev              # Vite dev server
pnpm build            # typecheck + production build (static files in dist/)
pnpm test             # Vitest (engine, content, ai)
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # tsc --noEmit
pnpm sim --games 1000 --bots greedy,greedy --seed 1   # headless balance simulation
```

## Code conventions

- TypeScript `strict`, no `any` (use `unknown` + narrowing). Prefer plain types + pure functions over classes.
- Engine state is plain serializable JSON; treat it as immutable (return new state).
- IDs are stable strings: `<pack>.<kind>.<slug>`, e.g. `fantasy.project.forge_a_blade`.
- Discriminated unions for actions/effects/events; exhaustive `switch` with `never` check.
- Tests colocated as `*.test.ts`. Content packs are validated by schema tests.
- Commits: Conventional Commits (`feat(engine): …`, `content(fantasy): …`, `docs: …`).

## Definition of Done (any task)

- Typecheck, lint, tests pass; new behavior covered by tests.
- Docs updated (GDD for rules, CONTENT for cards, BALANCE for tuning, ROADMAP checkbox).
- No new hard-coded UI strings; no engine impurity; no content copied from the original.
