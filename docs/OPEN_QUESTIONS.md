# Open questions

Agents: when the GDD is ambiguous, add a question here (next free ID) instead of guessing, and ask
the owner. When resolved: record the answer, update GDD/DECISIONS, move the entry to "Resolved".

## Open

- **Q-01 Working title.** Repo name is `happiness`. RU title candidates: «Путь к счастью», «Летопись
  одной жизни», «Свеча и корона»… Needed before M5 (UI) — not blocking engine work.
- **Q-02 Visual style.** Flat vector/CSS+SVG icons (cheap, consistent) vs illustrated cards (AI-generated
  or commissioned) vs "storybook" style. Affects card component design (M5) and asset pipeline.
- **Q-03 Art source & licensing** if illustrations are used.
- **Q-04 Platform priority.** Desktop-first with mobile support, or mobile-first?
- **Q-05 Replay hooks.** Daily seeded life? Personal records/achievements? Unlockable traits?
- **Q-06 Bot count & difficulty UX.** Default opponents in "quick game": 2 greedy bots?
- **Q-07 Group Projects and slots.** Original text doesn't say they take a slot; confirm treatment.
- **Q-08 Negative STH.** Does negative STH increase project advance costs (reviews suggest yes; rulebook
  only describes the discount)? Default proposal: yes, +1 resource per negative point.
- **Q-09 Final tie-break** (multiplayer): proposal — most resources left, then shared victory.
- **Q-10 Biography generation.** Templates only (v1) vs optional LLM epilogue (needs network/API key — conflicts with no-backend).
- **Q-11 Partners & representation.** Original uses double-sided male/female partner cards. Proposal:
  each partner is a single character (diverse races/genders); player picks own character gender for grammar.
- **Q-12 Player character.** Does the player pick a name/race/portrait at start (pure flavor) or does race
  have mechanical effect (like Child Traits)?

## Resolved

- **v1 mode** → solo + bots (ADR-006). **Stack** → TS+Vite+Preact, pnpm (ADR-002, ADR-008). **Language** → docs EN, UI RU
  (ADR-005). **Originality** → close mechanics, own modular content, fantasy first (ADR-001, ADR-004).
