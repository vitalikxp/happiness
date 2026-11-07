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
| Projects | 48 | 30 basic (9 grant Good Health: паломничество, травничество, обучение у монахов…), 10 single-round (турниры, ярмарки, состязания бардов), 8 group (походы: роли Воин / Маг / Лекарь / Следопыт и т.п.) |
| Items & Activities | 40 | ~24 items (конь, дом, библиотека, мастерская, доспех, корабль), ~16 activities (пир, ярмарка, охота, театр) |
| Jobs | 18 | 3 tracks × 3 levels × 2 variants |
| Partners | 12 | Double-sided: two versions (different gender, name, portrait) with identical mechanics. Diverse races/temperaments; each with level requirements and a distinct "taste" (wants Мудрость / Славу / Золото…) |
| Child Traits | 8 base + 4 unlockable | «Под звездой мудреца», «Дитя кузницы», «Гроза в ночь рождения»… |
| Life Goals | 9 base + 3 unlockable | «Хранитель знаний», «Большая семья», «Богатое наследство», «Долгожитель»… |

### 4.1 Achievements and unlocks (R-META-02, R-META-03)

`src/content/packs/fantasy/achievements.ts`. Unlockable cards have the same budget as base ones:
they add variety, not power.

| Achievement | Condition (the human, at the end of a life) | Unlocks |
|---|---|---|
| Первая летопись | finish a life | — |
| Долгая дорога | live to the last round (8) | Знамение «Железная воля» (Overtime → +1 Мудрость) |
| Мастер гильдии | Job of level 3 | Знамение «Кровь странника» (Get Job → +1 Слава, +1 Радость) |
| Семейный очаг | Partner at «Семья» (L4) | Знамение «Хранитель очага» (Develop Relationship → relax) |
| Своя дорога | win a solo life | Знамение «Под счастливой луной» (Take Project → +1 Радость) |
| Первый среди равных | win against 3 opponents | Предназначение «Кладезь талантов» (Knowledge + Creativity + Influence; solo ≥ 15) |
| Дважды до конца | complete 2 Basic Projects | Предназначение «Мастер-строитель» (Basic Projects completed; solo ≥ 2) |
| Жизнелюб | 4 Activities in a life | Предназначение «Жизнь в удовольствие» (Activities done; solo ≥ 6) |
| Счастливая жизнь | 60 LTH | — |
| Полный дом | own 4 Items | — |
| Сундук золота | 15 Золота at death | — |

Each card should cover a **category tag** (thematic: arcane, craft, martial, court, trade, nature, faith)
so bot personalities and the biography can use it.

## 5. Card authoring checklist

1. Stable ID, i18n keys for name/levels/flavor/biography line (ru required, en optional in v1).
2. Numbers pass the budget linter (`BALANCE.md §3`) or have a justification comment.
3. Level progression makes narrative sense (L1 «Подмастерье» → L4 «Мастер-оружейник»).
4. Biography line per level/outcome, e.g. «В 30 лет выковала клинок, о котором пели барды».
5. No resemblance to an original card's name/structure beyond the generic mechanic.

## 6. Texts and biography

**Authoring.** Each card is written together with its Russian texts (`src/content/packs/fantasy/*.ts`,
helpers in `define.ts`); the pack's `locales.ru` is assembled from them plus `texts.ts` (terms, board,
stages, biography). Numbers come from small per-kind templates tuned to the budget bands, so balance
changes happen in one place.

**Keys** (checked by `validatePack`, list in `src/content/text.ts`):
- per card: `<id>.name`, `<id>.flavor`; levels `<id>.l1…l4`; group roles `<id>.role1…4`; partners
  `<id>.v0.name` / `<id>.v1.name` (female / male version);
- pack-wide: `term.*`, `stage.*`, `space.*`, `partnerLevel.1…4`, `track.*`, `bio.age.1…8`, and the
  `bio.*` event templates in `.f` / `.m` variants.

**Biography.** Deterministic, built from the event log with `bio.*` templates (generator in M5).
Placeholders: `{age} {name} {card} {level} {partner} {lth}`. Names are inserted in the nominative
case, so templates must never need another case for `{name}` / `{partner}` (write «{name} и {partner}
заключили союз», not «…с {partner}»). An LLM-written epilogue is a post-v1 idea only.
