# Architecture

Status: **draft v0.1**. Decisions behind this: `DECISIONS.md` (ADR-002…007).

## 1. Stack

- **pnpm** (only package manager; `packageManager` field pinned in `package.json`)
- **TypeScript 6.0** (strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) · **Vite 8** +
  `@preact/preset-vite` · **Preact** (UI only) + `@preact/signals` · **Vitest** (+ `fast-check` for property tests)
- **zod** — content pack schemas (added in M1)
- **i18n** — own typed module `src/ui/i18n/`: `ru` catalog is the source of message keys (`MessageKey`),
  other locales are `Partial`; lookup order: requested → `en` → `ru` → key; `{param}` interpolation;
  current locale is a signal. Content-pack texts will be merged into the same lookup (M4).
- **ESLint + Prettier** · **Playwright** (e2e smoke, later) · **tsx** for the headless simulator
- Output: static site (`dist/`), deployable to GitHub Pages / any static host. No backend.

## 2. Layers & dependency rules

```
src/
  engine/     Pure rules. No DOM/Preact/IO/Math.random/Date. Depends on: nothing (types from content/schema).
  content/    Pack schema (zod), loader, validators, budget linter. Packs as data.
    packs/
      core-test/   Tiny pack for engine tests (stable, never rebalanced casually).
      fantasy/     First real pack: cards/*.ts|json, rules.json, locales/{ru,en}.json, art/
  ai/         Bots. Depends on engine public API only.
  sim/        Headless CLI: runs N games bot-vs-bot, prints balance report. Depends on engine, ai, content.
  ui/         Preact app: components, hooks, i18n, animation. Depends on engine API, content, ai.
  shared/     Small utilities (no game logic).
```

Allowed imports: `ui → engine, ai, content` · `ai → engine` · `sim → engine, ai, content` ·
`engine → content/schema types only` · `shared → nothing`. Enforced in `eslint.config.js` via
`no-restricted-imports` per layer (UI framework imports only in `ui/`); `engine/` and `ai/` also ban
`Math.random`, `Date`, timers, DOM and I/O globals.

## 3. Engine model

### 3.1 State

Single plain-JSON `GameState`:

```ts
type GameState = {
  version: 1;
  config: RulesConfig;            // from pack rules + variant flags
  rng: RngState;                  // seeded PRNG state (e.g. mulberry32/sfc32), advanced only by engine
  round: number;                  // 1..maxRounds
  phase: 'setup' | 'upkeep' | 'action' | 'endOfRound' | 'gameOver';
  pending: PendingDecision | null; // e.g. choose child trait, choose upkeep order/payments
  turn: { current: PlayerId; firstPlayer: PlayerId };
  market: Record<RowId, { deck: CardId[]; discard: CardId[]; slots: (CardId | null)[] }>;
  spaces: Record<ActionSpaceId, { occupants: PlayerId[]; locked: boolean }>;
  players: PlayerState[];
  lifeGoals: CardId[];
  log: GameEvent[];               // append-only, drives UI log + biography
};
```

Content (card definitions) is **not** in state — state references card IDs; the engine receives a
read-only `ContentIndex`. This keeps saves small and lets content be patched between versions
(saves pin `packId@version`).

### 3.2 Public API

```ts
createGame(setup: GameSetup, content: ContentIndex, seed: string): GameState
getLegalActions(state, content, playerId): Action[]          // the ONLY way to know what's allowed
applyAction(state, content, action): { state: GameState; events: GameEvent[] }   // throws on illegal
explainIllegal(state, content, action): IllegalReason[]       // for "can't because…" UI hints
previewAction(state, content, action): Preview                // deltas for UI previews / bots
replay(setup, content, seed, actions: Action[]): GameState
```

- Phases that need no input (refill, overload, old-age stress) are auto-advanced inside `applyAction`.
- Player decisions inside phases (upkeep payments, child trait choice, group-project role) are modeled
  as `PendingDecision` + dedicated `Action` variants — so bots and UI handle them uniformly.
- Undo = replay the log without the last action(s). Saves = `{ seed, setup, packVersion, actions }`.

### 3.3 Actions, effects, events — discriminated unions

```ts
type Action =
  | { type: 'placeTime'; space: BoardSpaceId; choice?: SpaceChoice }      // board action
  | { type: 'cardAction'; cardInstance: string; kind: 'advance' | 'promote' }
  | { type: 'refreshRow'; row: RowId }
  | { type: 'discardCard'; cardInstance: string }
  | { type: 'resolvePending'; decision: DecisionPayload };

type Effect =                              // used by card data (DSL)
  | { gain: Bundle }                       // knowledge/creativity/influence/money/time/sth/lth
  | { stress: number }                     // +/- (minus respects zone rule)
  | { relax: number } | { goodHealth: 1 }
  | { custom: CustomEffectId; params?: Record<string, number | string> }; // escape hatch, registered in engine

type Bundle = Partial<Record<'knowledge'|'creativity'|'influence'|'money'|'time'|'sth'|'lth', number>>;
type Trigger = { on: 'action:study' | 'action:play' | /* … */ 'upkeep' ; effects: Effect[] }; // child traits etc.
```

Rules for the DSL: declarative; every `custom` effect must be implemented + tested in `engine/effects/custom/`
and listed in the schema enum. Prefer extending the DSL over adding `custom` ids.

### 3.4 Determinism & RNG

- One seeded PRNG in state; separate derived streams for bots (`seed + ':bot:' + id`) so bot thinking
  never perturbs game RNG.
- Property test: `replay(seed, actions)` equals step-by-step result; JSON round-trip equals original.

## 4. Content packs

```
content/packs/fantasy/
  manifest.ts        // { id: 'fantasy', version: '0.1.0', locales: ['ru','en'], defaultLocale: 'ru' }
  rules.json         // RulesConfig overrides: stress zones, oldAgeStress, marketSize, soloWinLth…
  terms.json         // display names/icons for engine terms (Мудрость, Золото, Бремя…)
  cards/projects.ts  // Card[] — data only (TS for type inference + comments; or JSON)
  cards/items.ts, jobs.ts, partners.ts, childTraits.ts, lifeGoals.ts
  locales/ru.json    // all texts by key: card names, level names, flavor, biography templates
  locales/en.json
  art/               // optional; cards reference art ids, UI has a fallback renderer
```

- Card text uses keys: `fantasy.project.forge_a_blade.name`, `.l1.name`, `.flavor`, `.bio.l4`.
- **Validation (CI)**: zod schema; unique IDs; every i18n key present in default locale; deck
  composition matches targets in `CONTENT.md`; **budget linter** checks each level against the value
  model (`BALANCE.md`) and flags outliers.
- Packs can be combined later (base + expansion) — loader merges card lists by ID namespace.

## 5. UI

- Preact reads `GameState` via a small store built on `@preact/signals` that wraps engine calls.
- Components render from state + content + i18n; **no rule logic in components** — ask the engine
  (`getLegalActions`, `explainIllegal`, `previewAction`).
- Bots run in a Web Worker (later) with an artificial delay + animation for readability.
- Card rendering: data-driven component (icons for resources, cost → reward layout reading left→right).
- Accessibility: keyboard play, text alternatives for icons, color-blind-safe tracks.

## 6. Testing strategy

| Level | What | Where |
|---|---|---|
| Unit | Each rule ID, using `core-test` pack | `src/engine/**/*.test.ts` |
| Property | Invariants: no negative resources, determinism, JSON round-trip, legal actions never throw, game always terminates | `src/engine/invariants.test.ts` |
| Content | Schema, i18n completeness, budget lint | `src/content/**/*.test.ts` |
| Simulation | N seeded bot games: no crashes, termination, stats within BALANCE targets | `pnpm sim`, CI smoke with small N |
| Component | Key UI components | `@testing-library/preact` |
| E2E | Start game, take actions, finish life | Playwright (M5+) |

## 7. Performance targets

- `getLegalActions` + `applyAction` < 1 ms typical; simulator ≥ 1000 full bot games/min on a laptop
  (needed for balance work and planner bots).
