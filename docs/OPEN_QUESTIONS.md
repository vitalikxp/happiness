# Open questions

Agents: when the GDD is ambiguous, add a question here (next free ID) instead of guessing, and ask
the owner. When resolved: record the answer, update GDD/DECISIONS, move the entry to "Resolved".

## Open

_(none)_

## Resolved (2026-11-07, see ADR-017, ADR-018)

- **Q-13 Achievement list & unlocks** → the list in `CONTENT.md §4.1` (11 achievements, 4 traits +
  3 goals unlocked), accepted with the M6b merge.
- **Q-14 Art style guide** → `art/STYLE.md` + generated `art/PROMPTS.md`; the owner generates and
  curates the pictures, credited in `art/CREDITS.md`. The game ships without them until then.

## Resolved (2026-11-06, see ADR-010)

- **Q-01 Title** → «Дорога к счастью» (EN: *Road to Happiness*).
- **Q-02 Visual style** → «книжная миниатюра» in CSS/SVG.
- **Q-03 Art source** → AI-generated, one style guide, credits per asset.
- **Q-04 Platform** → desktop only in v1.
- **Q-05 Replay hooks** → personal records & life history, achievements, unlockable content (GDD §15).
- **Q-06 Quick game** → 1 human + 2 `greedy` bots.
- **Q-07 Group Projects** → don't occupy slots (R-PRJ-G-04).
- **Q-08 Negative STH** → +1 resource per negative point on project advances (R-STH-02).
- **Q-09 Tie-break** → most resources + money at death, then shared victory (R-DTH-03).
- **Q-10 Biography** → templates only; LLM epilogue post-v1.
- **Q-11 Partners** → double-sided cards, player picks the version (R-REL-05).
- **Q-12 Player character** → name, gender, portrait; no mechanics (R-SET-08).
- Earlier: v1 mode → solo + bots (ADR-006); stack → TS+Vite+Preact, pnpm (ADR-002, ADR-008);
  language → docs EN, UI RU (ADR-005); originality → close mechanics, own modular content, fantasy
  first (ADR-001, ADR-004).
