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
  ai/         Bots: random, greedy (+ personalities). Depend on the engine public API and content data.
  sim/        Node CLIs: `pnpm sim` (bot games in worker threads → report), `pnpm budget` and
              `pnpm art` (illustration prompts → art/PROMPTS.md).
              Depends on engine, ai, content; the only layer allowed to use Node APIs.
  ui/         Preact app: components, hooks, i18n, animation. Depends on engine API, content, ai.
  meta/       Achievements & unlock rules: pure functions over finished games (added in M6).
              Depends on engine, content. Persistence (localStorage) lives in ui/.
  shared/     Small utilities (no game logic).
```

Allowed imports: `ui → engine, ai, content` · `ai → engine, content` · `sim → engine, ai, content` ·
`engine → content/schema types only` · `shared → nothing`. Enforced in `eslint.config.js` via
`no-restricted-imports` per layer (UI framework imports only in `ui/`); `engine/` and `ai/` also ban
`Math.random`, `Date`, timers, DOM and I/O globals.

## 3. Engine model

### 3.1 State

Single plain-JSON `GameState` — **source of truth: `src/engine/types.ts`**. Key parts: `rng` (seeded
PRNG state), `round`, `phase` (`setup` → `action` → `gameOver`; Upkeep and End of Round run
automatically inside transitions), `pending` (decisions outside the turn order, e.g. Child Trait choice),
`firstPlayer` / `current`, `market` (deck/discard/slots per row), `placements` (Time on board spaces),
`players` (resources, time, stress position, sth, lth + `lthBySource`, death, tableau), `result`, `log`.

Content (card definitions) is **not** in state — state references card IDs; the engine receives a
read-only `ContentIndex` (`loadPack()` in `src/content/validate.ts`). Saves pin `packId@packVersion`.

### 3.2 Public API (`src/engine/index.ts`)

```ts
createGame(setup: GameSetup, content: ContentIndex, seed: string): GameState
getLegalActions(state, content, playerId): Action[]          // the ONLY way to know what's allowed
applyAction(state, content, action): { state: GameState; events: GameEvent[] }   // throws IllegalActionError
explainIllegal(state, content, action): IllegalReason[]       // for "can't because…" UI hints
replay(setup, content, seed, actions: Action[]): GameState
previewAction(state, content, action): Preview                // the action's own effect per player
```

- Internally `applyAction` validates, `structuredClone`s the state and mutates the **draft**; inputs
  are never mutated (property-tested).
- Phases that need no input (refill, old-age stress, overload, end of round) run inside `applyAction`.
- Undo = replay the log without the last action(s). Saves = `{ seed, setup, packVersion, actions }`.

### 3.3 Actions, events, effects DSL

`Action` and `GameEvent` are discriminated unions in `types.ts`; every action names its `player`.
Card-driven board spaces take a `SpaceChoice` (which market card, level, role, partner version…);
tableau card actions are separate (`advanceProject` with an STH allocation, `promote`). Upkeep is a
phase of decisions: `pending.type === 'upkeep'` and `payUpkeep` / `refuseUpkeep` per card.
`previewAction` folds the action's own events (until `roundEnding`) into per-player deltas and never
reveals drawn cards.
Card effects are a flat, declarative `Reward` object (`src/content/schema.ts`):

```ts
type Reward = { knowledge?, creativity?, influence?, money?, time?, sth?, lth?, goodHealth?: 1, relax?, stress? };
// applied in a fixed order: resources → time → sth → lth → goodHealth → relax → stress
```

Costs are resource bundles (+ `time` where Time markers are placed). Child Trait abilities are
`triggers: [{ on: BoardSpaceId, reward }]`. Prefer extending `Reward` over special cases; if a card ever
needs code, add a named effect to the schema and implement + test it in the engine.

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
  art.ts             // illustration subjects + style template (not pack data, see art/STYLE.md)
```

Pictures live outside `src/`, in `art/cards/<card id>.webp`; `src/ui/art.ts` bundles whatever is
there through `import.meta.glob`, and a card without a picture keeps its text-only look.

- `achievements` (optional): conditions over a finished game + Child Traits / Life Goals they
  unlock. Unlockable cards stay in the pack's decks but `ContentIndex.locked` keeps them out of a
  game unless `GameSetup.unlocked` lists them (R-META-03); the engine's `earnedAchievements` checks
  the conditions (R-META-02). Base decks alone must meet the deck minimums.
- Card text uses keys: `fantasy.project.forge_a_blade.name`, `.l1.name`, `.flavor`, `.bio.l4`.
- **Validation (CI)**: zod schema; unique IDs; every i18n key present in default locale; deck
  composition matches targets in `CONTENT.md`; **budget linter** checks each level against the value
  model (`BALANCE.md`) and flags outliers.
- Packs can be combined later (base + expansion) — loader merges card lists by ID namespace.

## 5. UI

```
src/ui/
  session.ts    Signals store: engine state + action log, profiles (name, gender, heraldry) and the
                bots' turn loop (setTimeout pauses; fast mode; skip-ahead after the human dies).
                Autosaves every move, restores by replay, undoes within the round.
  history.ts    Finished lives (R-META-01): game record + summary + biography text; records.
  achievements.ts  Earned achievements; unlocked cards go into every new game's setup.
  hints.ts      First-game margin notes: situation predicates, each shown once.
  settings.ts   Theme (`data-theme` on <html>), bot speed, opponents' difficulty.
  storage.ts    Guarded localStorage JSON (`happiness.*` keys); the game works without storage.
  nav.ts        Pages outside a game: title, archive, one archived life.
  options.ts    Everything the human could do now, grouped by UI place (board space, market card,
                tableau card, upkeep, omen) — legal ones with `previewAction` deltas, illegal ones
                with `explainIllegal` reasons.
  story.ts      Event log → chronicle lines and the end-of-life biography (pack `bio.*` templates).
  content.ts    The played pack (`fantasy`) and `pt()` lookups of its texts.
  art.ts        Card pictures found in art/cards/ by card id (optional, see art/STYLE.md).
  components/   NewGame (+ continue), Decisions (omen, upkeep), Board (rounds, spaces, market, hero,
                opponents, goals, chronicle), CardView (any card from data), Icons, Shield,
                EndScreen, History (records, archive, past life), SettingsPanel.
  styles/       One stylesheet of tokens + components («книжная миниатюра»; dark = candlelight).
```

- Components render from state + content + i18n; **no rule logic in components** — the engine
  decides (`getLegalActions`, `getCandidateActions`, `explainIllegal`, `previewAction`).
- Character profiles are UI-only flavor (R-SET-08); the engine never sees them.
- Persistence stores **records, not states**: seed + setup + action log (+ profiles, bot names).
  The state is rebuilt with `replay`, which is only valid for the same content, so every save and
  archived life carries a fingerprint of the pack's rules and cards (texts excluded). A save with
  another fingerprint is not offered; an archived life keeps its summary and biography text.
- Fonts are self-hosted via `@fontsource` (Ruslan Display initials, Cormorant Garamond headings,
  Alegreya text) — no CDN at runtime.
- Desktop first (≥ 1280×720); narrower windows stack the margins under the page instead of breaking.
- Accessibility: native buttons/radios, one `h1` per screen, icon chips with screen-reader text,
  shapes not only colors (icons, heraldic charges), visible focus, decision panels take focus and
  make the board `inert`, `prefers-reduced-motion` honored.

## 6. Testing strategy

| Level | What | Where |
|---|---|---|
| Unit | Each rule ID, using `core-test` pack | `src/engine/**/*.test.ts` |
| Property | Invariants: no negative resources, determinism, JSON round-trip, legal actions never throw, game always terminates | `src/engine/invariants.test.ts` |
| Content | Schema, i18n completeness, budget lint | `src/content/**/*.test.ts` |
| Bots & sim | Bots pick legal moves, are deterministic, greedy ≫ random, personalities differ; sim metrics | `src/ai/*.test.ts`, `src/sim/*.test.ts`, `pnpm sim` |
| Budget | Packs with `budgetLint` stay inside BALANCE §3 bands | `src/content/budget.test.ts`, `pnpm budget` |
| Component | Key UI components | `@testing-library/preact` |
| E2E | Whole lives through the UI (solo and vs 3 bots) on the production build | `e2e/`, `pnpm e2e` (system Chrome) |

## 7. Bots & simulation

- `Bot.choose(state, content, player)` returns one of `getLegalActions`. Bots are stateless; their
  randomness is `seedRng(seed:bot:player:logLength)`, so whole games replay from the seed.
- `greedy` previews every legal action and scores: value-model deltas (`src/content/valueModel.ts`,
  resources worth less late in life), Stress per point + zone Time loss, plus the future a card opens
  (remaining levels, ongoing upkeep income, group bonus tiers, slot overload Stress). Personalities
  multiply positive scores of matching actions. Bots skip row refreshes and discards (no turn end).
- Greedy also values progress towards the revealed Life Goals (more in solo, where they decide the
  win), treats Good Health as an extra round of life, and foresees the next Old Age Stress.
- `applyAction`/`previewAction` don't clone the append-only log, which keeps previews cheap.

## 8. Performance targets

- `getLegalActions` + `applyAction` < 1 ms typical; simulator ≥ 1000 full bot games/min on a laptop
  (needed for balance work and planner bots). Measured (M3, 12 cores): 1000 games × 3 greedy bots ≈ 27 s.
