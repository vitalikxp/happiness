# Content: system & fantasy setting bible

Content is modular (packs, see `ARCHITECTURE.md §4`). The engine is setting-agnostic; a pack provides
display names, icons, cards, texts and tunable numbers. First pack: **`fantasy`** (classic fantasy).

## 1. Originality rules

- All card names, texts, flavor and numbers are written fresh for this project.
- Don't mirror the original's card list one-to-one (no "fantasy reskin" of each original card).
  Design cards from the setting outward, then fit them to the value model.
- Art: AI-generated in one consistent style (style guide in `art/STYLE.md`: palette, line, framing,
  prompt template), curated by hand. Record per asset in `art/CREDITS.md`: tool/model, prompt, date,
  license terms. Never prompt with the original game's name, artist or card titles.
- v1 UI works without illustrations («книжная миниатюра» in CSS/SVG); cards reference art by id and the
  renderer falls back to an ornament/initial.

## 2. Setting: «classic fantasy», tone

A peaceful-ish kingdom with guilds, towers, taverns, old roads and dragons far away. Not a hero's saga
about saving the world — **an ordinary life in a fantasy world**: an apprentice who becomes an archmage,
a blacksmith who forges a legendary blade, a bard who marries a noble, a merchant who builds a caravan
empire. Tone: warm, slightly ironic, cozy (think of a pleasant fairy-tale chronicle). Russian texts:
short, lively, no archaic overload.

## 3. Terminology (RU display)

| Engine | RU | Icon idea |
|---|---|---|
| knowledge | Мудрость | scroll / book |
| creativity | Мастерство | hammer & brush |
| influence | Слава | laurel / banner |
| money | Золото | coin |
| time | Время | candle |
| stress | Бремя | stone / dark cloud |
| sth | Радость | sun |
| lth | Счастье | heart-star |
| relax | Передышка | leaf |
| goodHealth | Благословение | glowing heart |
| Youth / Adulthood / Old Age | Юность / Зрелость / Старость | |
| Study / Play / Interact | Учёба в библиотеке / Упражнения в мастерской / Вечер в таверне | |
| Temp Job | Подработка | |
| Take Project / Spend | Взяться за начинание / Потратить золото | |
| Get Job / Develop Relationship | Поступить на службу / Сердечные дела | |
| Overtime / Rest | Бессонные ночи / Отдых | |
| Projects (basic / single-round / group) | Начинания / Испытания / Походы | |
| Items / Activities | Имущество / Досуг | |
| Jobs (science / arts / social) | Гильдия магов / Гильдия мастеров / Торговая гильдия и двор | |
| Partners | Спутники жизни | |
| Child Traits | Знамения рождения | |
| Life Goals | Предназначения | |

Partner levels: Знакомство → Ухаживание → Союз → Семья.

## 4. Deck targets (fantasy v1)

| Deck | Count | Composition notes |
|---|---|---|
| Projects | 48 | ~30 basic, ~10 single-round (турниры, ярмарки, состязания бардов), ~8 group (походы: роли Воин / Маг / Лекарь / Следопыт и т.п.). **≥8 grant Good Health** (паломничество, травничество, обучение у монахов…) |
| Items & Activities | 40 | ~24 items (конь, дом, библиотека, мастерская, доспех, корабль), ~16 activities (пир, ярмарка, охота, театр) |
| Jobs | 18 | 3 tracks × 3 levels × 2 variants |
| Partners | 12 | Double-sided: two versions (different gender, name, portrait) with identical mechanics. Diverse races/temperaments; each with level requirements and a distinct "taste" (wants Мудрость / Славу / Золото…) |
| Child Traits | 8 base + ~4 unlockable | e.g. «Рождён в грозу», «Под звездой мудреца», «Дитя кузницы» |
| Life Goals | 9 base + ~3 unlockable | e.g. «Архимаг» (most knowledge projects done), «Легенда таверн», «Большая семья», «Богатое наследство» |

Each card should cover a **category tag** (thematic: arcane, craft, martial, court, trade, nature, faith)
so bot personalities and the biography can use it.

## 5. Card authoring checklist

1. Stable ID, i18n keys for name/levels/flavor/biography line (ru required, en optional in v1).
2. Numbers pass the budget linter (`BALANCE.md §3`) or have a justification comment.
3. Level progression makes narrative sense (L1 «Подмастерье» → L4 «Мастер-оружейник»).
4. Biography line per level/outcome, e.g. «В 30 лет выковала клинок, о котором пели барды».
5. No resemblance to an original card's name/structure beyond the generic mechanic.

## 6. Biography generation

Events in the log carry `{ actor, cardId, level, round }`; the pack provides templates per card/level
and per life stage. Template-based and deterministic; grammatical gender from the character
(player's own and the chosen Partner version). An LLM-written epilogue is a post-v1 idea only.
