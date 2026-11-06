# Decision log (ADR-lite)

Append new entries at the bottom. Format: context → decision → consequences. Supersede, don't delete.

## ADR-001 — Close to the original mechanically, original content (2026-11-06)
**Context:** Inspired by *The Pursuit of Happiness*. Mechanics aren't protected; names, texts, art and card
designs are. **Decision:** Keep the core loop and rules structure close to the original; all content is
written fresh; first setting is classic fantasy. Deviations are opt-in rule variants (GDD §13).
**Consequences:** Research doc is reference-only; content checklist forbids card-by-card reskins.

## ADR-002 — Stack: TypeScript + Vite + React (2026-11-06) — *UI library & package manager superseded by ADR-008*
**Decision:** Strict TS everywhere, React only in `src/ui/`, Vitest for tests, static build, no backend.
**Consequences:** Engine reusable by UI, bots, simulator and future server.

## ADR-003 — Pure deterministic engine with action log (2026-11-06)
**Decision:** Engine = pure functions over JSON state; seeded RNG in state; saves/undo/replays via
`seed + actions`. **Consequences:** Easy testing, simulation, bug repro by seed; no `Math.random` in engine.

## ADR-004 — Data-driven content packs with declarative effects DSL (2026-11-06)
**Decision:** Cards, numbers, terms, texts live in packs validated by zod; effects are data;
custom code effects are a registered escape hatch. **Consequences:** New settings = new pack; budget linter possible.

## ADR-005 — Docs/code in English, UI in Russian via i18n (2026-11-06)
**Decision:** All docs, identifiers and comments in English; all player-facing strings via i18n keys;
ru is default locale, en fallback.

## ADR-006 — v1 mode: solo + AI bots, no network (2026-11-06)
**Decision:** 1 human + 0–3 bots in browser. Bots use only the public engine API.
**Consequences:** Bots double as balance-simulation agents. Multiplayer deferred; engine stays server-ready.

## ADR-007 — Canonical engine terms, display names from packs (2026-11-06)
**Decision:** Engine uses fixed mechanic terms (`knowledge`, `creativity`, `influence`, `money`, `time`,
`stress`, `sth`, `lth`); packs map them to display names/icons. **Consequences:** Readable code; settings
cannot add new basic resources without an engine change (acceptable for v1).

## ADR-008 — Preact instead of React; pnpm as package manager (2026-11-06)
**Context:** Owner's choice. **Decision:** UI uses Preact (`preact`, `preact/hooks`, `@preact/signals`,
`@preact/preset-vite`); no `preact/compat` / React-only libraries without a new ADR. pnpm is the only
package manager: `pnpm-lock.yaml` committed, `packageManager` pinned, CI uses `pnpm install --frozen-lockfile`.
**Consequences:** Smaller bundle; ecosystem limited to Preact-native or framework-agnostic libraries.

## ADR-009 — Toolchain versions and own i18n module (2026-11-06)
**Context:** M0 scaffold. `typescript-eslint` 8.x supports TypeScript `<6.1`; `@preact/preset-vite` needs Babel 7.
**Decision:** Pin TypeScript `~6.0`, `@babel/core` `^7`; Vite 8, Vitest 5, ESLint 10 (flat config).
i18n is a small typed module on `@preact/signals` instead of an i18n library (no `preact/compat` needed,
keys type-checked). **Consequences:** Upgrade TS to 7 once typescript-eslint supports it.

## ADR-010 — Product decisions from the open-questions round (2026-11-06)
**Decision:** Title «Дорога к счастью»; desktop-only v1; «книжная миниатюра» CSS/SVG style, AI-generated
illustrations later under a style guide; quick game = 2 greedy bots; template biographies; player character
is flavor only; double-sided Partner cards; meta-progression (records, life history, achievements,
unlockable traits/goals). Rule answers: Q-07, Q-08, Q-09 (see GDD rule IDs in OPEN_QUESTIONS).
**Consequences:** New `meta/` layer (M6); unlockables must not add power and must keep the engine
deterministic (unlocked set is part of `GameSetup`); mobile layout moved to "Later".
