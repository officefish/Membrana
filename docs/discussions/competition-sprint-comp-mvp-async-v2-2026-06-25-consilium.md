# Consilium: Competition Sprint — MVP UserCase async v2

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-async-v2-2026-06-25` |
| **brief** | [`COMPETITION_SPRINT_BRIEF.md`](../competition-sprint/comp-mvp-async-v2-2026-06-25/COMPETITION_SPRINT_BRIEF.md) |
| **phase** | 3 — consilium **closed** 2026-06-25 |
| **commits** | Phase 2β `316660a`, gate `914d3f0` |
| **synthesis v1** | [`COMPETITION_V1_DESIGN_SYNTHESIS.md`](../competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_V1_DESIGN_SYNTHESIS.md) |

---

## Demo recap

| Team | UserCase | Pack | verify-async-v2 | Async packaging | F7 live Run |
|------|----------|------|-----------------|-----------------|-------------|
| **Alpha** | `usercase-mvp-microphone-alpha-async-v2` | 4 fn | ✅ | StartAsyncJob **on main** + detached fn | *deferred* |
| **Beta** | `usercase-mvp-microphone-beta-async-v2` | 3 fn | ✅ | `fn-beta-async-upload-pipeline` (3-node) | *deferred* |
| **Gamma** | `usercase-mvp-microphone-gamma-async-v2` | 3 fn | ✅ | poster ①–⑥, `fn-gamma-async-live-bundle` | *deferred* |
| **MVP ref** | `usercase-mvp-microphone` | bundled | — | v2.0-async engineering | ✅ baseline |

**Решение consilium:** голосование Phase 4 по **упаковке async narrative (C7)** + наследие C1–C6 v1. F7 live Run deferred — общий runtime `v2.0-async`, не дифференциатор команд.

---

## Team Alpha — summary

**Thesis:** Live Observation Pipeline + **Act IIb** — async как продолжение operator journey.

### Strengths

- Единственная команда с **видимым** `start-async-job` на main — лучший live C7 для инструктора
- Act IIb groups (`ucg-alpha-async-iib-upload`, `ucg-alpha-async-iib-detached`) — RU copy «не блокирует tick»
- Detached report в отдельной function — F5 не спрятан в mega-collapse
- 4 functions — баланс bootstrap + gate + trends + detached

### Weaknesses

- 4 functions — pin surface выше beta/gamma
- Main плотнее: async nodes не свернуты в один pipeline block
- Poster scan слабее gamma на 30-sec explain

### Rebuttal (Team Alpha)

«C7 = clarity non-blocking upload. Оператор должен **увидеть** Promise node на main, не только прочитать в group title.»

---

## Team Beta — summary

**Thesis:** Measured modular UserCase — async edition; upload pipeline = измеримый контракт.

### Strengths

- `fn-beta-async-upload-pipeline` — единственный **явный** 3-node async chain collapse (start → resolved → report)
- Engineering map: orchestrator + gate + trends + upload frames — клонируемые blocks
- verify-layout + verify-prerun + pack test — объективный C3
- Наследует v1 beta победу по C2/C5

### Weaknesses

- `start-async-job` скрыт в collapse — C7 live visibility ниже alpha
- Operator UX «инженерная карта» — слабее gamma poster
- 6 comment groups — overlap upload/detached на одну function

### Rebuttal (Team Beta)

«Async = контракт pins. Один pipeline function — эталон для следующих UserCase с Promise nodes.»

---

## Team Gamma — summary

**Thesis:** Poster ①–⑥ — шаги ⑤ upload и ⑥ detached report без tech jargon.

### Strengths

- Лучший **C4/C7 poster**: numbered RU steps, DESIGN palette
- `fn-gamma-async-live-bundle` — минимум ink на main при полной async story
- 6 semantic frames — полный lifecycle включая async
- Лучший screenshot / onboarding candidate

### Weaknesses

- Engineering detail спрятан (как v1 gamma)
- Upload bundle = тот же 3-node collapse что beta — меньше дифференциации pack logic
- 3 functions — policies не вынесены в отдельный fn (optional в CONCEPT)

### Rebuttal (Team Gamma)

«Оператор не обязан знать Promise topology — плакат ⑤⑥ достаточен для async clarity.»

---

## Cross-cutting themes

| Theme | Alpha | Beta | Gamma |
|-------|-------|------|-------|
| Functions | 4 | 3 | 3 |
| Comment groups (main+) | 6+ Act IIb | 6 engineering | 6 poster |
| StartAsyncJob on main | **Yes** | No (collapsed) | No (collapsed) |
| Detached path | separate fn | in pipeline fn | in bundle fn |
| C7 strategy | Live visibility | Measurable block | Numbered steps |
| v1 heritage | Journey + narrative | Modularity | Poster |

---

## Журнал реплик (полный протокол)

[Teamlead — Vesnin]: Sprint async v2 закрываем Phase 2β по document gate. Три fork — packaging-only; `competitionBase: v2.0-async`. F7 browser Run откладываем: bundled smoke уже PASS, prerun green. Phase 4 голосуем по C7 + C1–C6.

[Структурщик — Ozhegov]: Beta `fn-beta-async-upload-pipeline` — правильная граница: async subgraph = один reusable block. Alpha detached fn — cherry-pick в winner. Gamma poster groups — presentation layer.

[Математик — Dynin]: Pack test фиксирует function counts (4/3/3) и pre-run validity — воспроизводимый acceptance. verify-competition-async-v2 в CI — сильнее v1. C3 без live Run.

[Музыкант]: Alpha выигрывает **causality**: gate Then-2 trends sync, upload async, detached drone — три темпа на canvas. Gamma poster хорош для «что», Alpha — для «как течёт звук во времени».

[Верстальщик — Rodchenko]: Gamma ①–⑥ — лучший first screen с async. Alpha Act IIb warning frames — хороший compromise. Beta orchestrator spine — для автора, не для оператора поста.

[Teamlead — Vesnin]: C7 — новый вес в scorecard. Кто лучше объясняет non-blocking upload **без** чтения chain-log?

[Музыкант]: Alpha — видимый StartAsyncJob. Оператор видит «узел ушёл в фон» на main path.

[Верстальщик — Rodchenko]: Gamma ⑤ «Отправка в фоне» — zero jargon, 2 строки RU. Для onboarding gamma ≥ alpha.

[Структурщик — Ozhegov]: Clarity ≠ visibility raw nodes. Beta function title «Upload pipeline» + description pins — документируемый контракт.

[Математик — Dynin]: Измеримость: beta/gamma collapse 3 nodes — эквивалентны по topology. Alpha — deliberate asymmetry: upload visible, detached collapsed.

[Teamlead — Vesnin]: Риск alpha — operator путает detached handler если только group, не fn. Alpha вынес detached в fn — mitigation OK.

[Музыкант]: F5 detached drone — success frame у alpha и gamma. Beta success frame на pipeline — смешивает upload и report в одном block.

[Структурщик — Ozhegov]: Для catalog authors beta pipeline — template. Для production bundled — не меняем; winner = community tier.

[Верстальщик — Rodchenko]: Рекомендация polish: gamma ⑤⑥ titles + beta pipeline fn + alpha Act IIb copy.

[Математик — Dynin]: Weighted vote v1 дал beta +17. Async v2 — ожидаю beta C2/C3/C5, split C7 alpha vs gamma.

[Teamlead — Vesnin]: Phase 5 merge — только packaging ideas, не runtime. Cherry-pick, не replace bundled MVP.

[Музыкант]: Если C7 вес 1.5 — alpha может обойти beta на narrative. Если C7 = 1.0 — beta снова лидер.

[Структурщик — Ozhegov]: Согласен: зафиксировать C7 weight 1.5 в SCORECARD — async sprint merit.

[Верстальщик — Rodchenko]: Gamma C4 и C7 correlated — не double-count; C7 только async-specific.

[Математик — Dynin]: Pre-run valid ×3 — нет dangling exec edges (beta fix 3-node). Regression guard для Phase 5.

[Teamlead — Vesnin]: Консенсус: Phase 4 открыт. F7 smoke — один run на победителе до merge polish.

[Музыкант]: Голосую alpha #1 на C7; beta #1 на maintainability.

[Структурщик — Ozhegov]: Beta #1 overall; alpha detached fn — must cherry-pick.

[Верстальщик — Rodchenko]: Gamma #1 на 30-sec demo с async; beta #2; alpha #2 на live teach.

[Математик — Dynin]: Beta metrics + test coverage; gamma poster для docs screenshot.

---

## Pre-vote consensus (binding for Phase 4)

1. **Scorecard** — C1–C6 v1 + **C7 Async clarity** (weight **1.5**).
2. **F7** — не в weighted score; follow-up smoke на winner fork.
3. **Merge Phase 5** — cherry-pick: beta pipeline template + gamma ⑤⑥ + alpha Act IIb/detached fn.
4. Сохранить `yarn usercase:verify-competition-async-v2` в CI.

---

## Known issues (post-2β)

| ID | Issue | Owner |
|----|-------|-------|
| F7-AV2 | Live browser Run ≥60s per fork not recorded | Operator |
| CAT-AV2 | Async-v2 forks not in catalog picker (optional) | device-board |

*Не участвуют в weighted score Phase 4.*
