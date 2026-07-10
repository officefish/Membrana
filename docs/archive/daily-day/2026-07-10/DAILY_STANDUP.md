<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-10
  archived-at: 2026-07-10T18:20:22.664Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-10T04:57:06.849Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 Ежедневный стендап виртуальной команды Membrana — 2026-07-10

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (10.07 → план на 11.07), DAILY_CODE_REVIEW (09.07 вечер), MAIN_DAY_ISSUE (09.07), CURRENT_TASK (буфер), FFT_METRICS §6 (#84), открытые GitHub Issues (17), packages/temp (0), RAG operative

---

## Резюме дня

Главный фокус сегодня — **подтверждение S2 вживую**: увидеть `combinedScore > 0` в реальном браузере на дрон-звуке и собрать первый пользовательский UserCase «combined + alarm» в device-board. Вчера (09.07) S2 замкнут в коде (эпик #317 combined-продюсер + #323 basn-1…5, все archived + smoke), но живого подтверждения `combinedScore>0` нет — это остаток DoD #317 и гейт для S3 (упаковка UserCases к ~17.07). Главный риск — неопределённость по model-provider (нейро в combined-наборе) и месту хранения шаблонов в живом runtime; при DSP-only это надо честно зафиксировать в UserCase, а не выдавать за нейро-fusion. **Критерий успеха к вечеру:** скриншот/лог `combinedScore>0` + видимая реакция alarm-loop на score (не громкость) + сохранённый и запускаемый combined+alarm UserCase.

## Входные артефакты

| Источник | Актуальность | Что берём сегодня |
|----------|--------------|-------------------|
| STRATEGIC_PLAN_DAY.md | ✅ свежий (10.07, план на 11.07) | Магистраль = S2 end-to-end (Задачи A/B), side-слот C/D, разведка §5 |
| DAILY_CODE_REVIEW.md | ✅ вечер 09.07 | T0, CI зелёный; **разложить untracked** `docs/reviews/*` + daily-snapshot; nit useMemo |
| MAIN_DAY_ISSUE.md | ⚠️ вчерашний (09.07) | Контекст combined-продюсера; перевыпустить на 10.07 |
| CURRENT_TASK.md | 🔸 буфер (не канон) | `hermes-brief` — только отдельная сессия, не трогать магистраль |
| FFT_METRICS §6 (#84) | ✅ канон | Эшелон 0 исчерпан → **не** запускать «Этап 1.A / benchmark 3 DSP» |
| GitHub Issues (17 открытых) | ✅ актуально | Приоритизация ниже; в скоупе — попутно #10/#34 к Задаче C |
| packages/temp (0 файлов) | — | Набросков нет — ничего не подмешиваем |
| Состояние репо | ✅ main, чистый (кроме `STRATEGIC_PLAN_DAY.md`) | Начать с фиксации untracked-артефактов ревью |

## Порядок работы

Эвристика №1 (фича с UI+звук, но сегодня — подтверждение уже написанного):

**Фаза 0** (Ozhegov + Rodchenko: гигиена дерева) → **Задача A** (Dynin ведёт живой smoke, Kuryokhin — реакция alarm) → **Задача B** (Rodchenko ведёт UserCase, Dynin — контракт графа) → **Teamlead LGTM** по обеим. Side-слот C/D — Dynin/Ozhegov при остатке ёмкости.

## [Teamlead]

**Стратегический фокус.** S2 не закрыт по существу, пока `combinedScore>0` не увиден в браузере. Сегодня — **не новый код**, а живое подтверждение: Задача A (smoke) → Задача B (UserCase). Это прямой остаток #317 и гейт для S3.

**LGTM-границы.**
- combined-продюсер зависит **только** от core + audio-engine; детекторы — через контракт.
- device-board (Задача B) зависит **только** от core; шаблоны — через выясненный источник (см. разведка §5.2).
- alarm-loop реагирует на fusion-score, **не** на громкость.

**Что сознательно не делаем сегодня:**
- ❌ Новых фич/разворотов — только подтверждение S2.
- ❌ **Детекция:** «Этап 1.A / unified benchmark harmonic+cepstral+flux / stage-gate через 3 DSP» — эшелон 0 исчерпан (FFT_METRICS §6, #84); повторный DSP-тюнинг на free-v1 без новых данных запрещён.
- ❌ TDOA/мультиузел/локализацию (заморожено до hard-gate).
- ❌ `hermes-brief` в магистральной сессии — только отдельная выделенная сессия.

**Приоритизация GitHub Issues:**
- **В скоуп дня (попутно, P2):** #10 (unit-тесты fft-analyzer math) и #34 (FFT edge cases docs) — только если тронется мат-ядро в рамках Задачи A и появится ёмкость.
- **Отложить:** #236 (Studio tray-stop — risk-задача, отдельный спринт), #197/#196/#195 (intern-вертикаль — вне магистрали), #187 (headroom proxy-perf), #95/#92/#59/#58/#57/#49 (эпики device-board / realtime / background-media — вне S2-фокуса), #33/#27 (UI a11y — не блокеры), #8/#7 (smoke/store-тесты — imperfection-триаж).

## [Структурщик]

- **Фаза 0 (блокирующая):** разложить/закоммитить untracked-артефакты вчерашнего ревью — `git add docs/reviews/ docs/archive/daily-day/2026-07-09/`; убедиться, что в корне нет `.txt`-логов (deploy-preflight «чистое дерево»). В рабочем дереве также висит `M docs/STRATEGIC_PLAN_DAY.md` — закоммитить.
- **Границы Задачи A:** проверить, что `detection-ensemble-service` не импортирует другие analyzer-сервисы напрямую; `check:boundaries` + `verify:wire-sync` зелёные.
- **Границы Задачи B:** device-board → только core; не тащить бизнес-логику шаблонов в JSX.
- **Разведка §5.2:** зафиксировать, откуда `make-ensemble-analysis`/`trends` берут шаблоны в живом runtime (`template-match` vs `background-media` vs client) — это открытый архитектурный вопрос, не решать наспех.
- **Санитарный прогон:** `yarn turbo run lint typecheck test --filter=@membrana/client --filter=@membrana/device-board`.

## [Математик]

- **Ведёт Задачу A (P0):** прогнать `mic-combined-detection` в реальном браузере на дрон-звуке (free-v1 сэмпл или живой микрофон); зафиксировать `combinedScore>0` в `combinedDetectionState`. Продюсер лишь **питает** готовое ядро `fuseDetectorConfidences` — не переизобретать слияние (ND3: сырой confidence, не бинарный OR).
- **Разведка §5.1 (критично перед стартом):** подключён ли model-provider в текущей сборке client? Если нет — combined на сегодня **DSP-only**, зафиксировать это в UserCase честно (не выдавать за нейро-fusion).
- **Контракт графа для Задачи B:** предоставить Rodchenko схему `collect → trends+ensemble → fusion → branch → proximity → combined-report`.
- **Side-слот (P2):** Задача C — свести `trends DRONE_TIGHT` (95%/30%) vs `yamnet` (F1 0.803) одной таблицей P/R/FPR/F1 на одном `val` в `DETECTOR_BENCHMARK.md` — **без** нового DSP-прогона.
- **Чистые функции:** любые правки мат-ядра fft-analyzer — под тесты (попутно #10 при возможности).

## [Музыкант]

- **Интеграция в Задаче A:** подтвердить, что `mic-proximity-alarm` реагирует на fusion-`combinedScore` (hardcoded 0 убран в #317), а **не** на сырую громкость; alarm-loop живёт до `lost`. 24 bit / 48 kHz — помнить, что live-mic по факту 44.1/48 kHz зависит от ОС (FFT_METRICS §mic pipeline): centroid/flux могут сдвигаться, это ожидаемое ограничение эшелона 0, не баг.
- Существенного нового аудио-кода нет → отдельного одобрения формы у Teamlead не требуется (интеграция уже согласованного контракта).

## [Верстальщик]

- **Ведёт Задачу B (P0):** собрать в редакторе `device-board` полную цепочку узлов #323 как **живой пользовательский UserCase** (не мок-host): `collect → trends+ensemble → fusion → branch(detected) → proximity → combined-report`. Зависит от Задачи A (нужен живой `combinedScore`).
  - **DoD:** сценарий сохраняется, запускается на живом mic-host, `combinedScore>0` протекает через fusion, alarm-loop до `lost`; карточка в пикере с tariff-бейджем.
- **Nit-follow-up (P2, не блокер):** обернуть `samples` в `useMemo` — `apps/client/src/modules/SampleLibraryModule.tsx:94` (lint warning `react-hooks/exhaustive-deps`); завести отдельную мелкую S-задачу.
- Границы props / DESIGN.md — без бизнес-логики в JSX.

---

## Итоговый артефакт
- Живой smoke-лог/скриншот `combinedScore>0` + реакция alarm-loop (Задача A) → closure-артефакт.
- Сохранённый и запускаемый combined+alarm UserCase в device-board (Задача B).
- Перевыпущенный `docs/MAIN_DAY_ISSUE.md` на 10.07; закоммиченные артефакты ревью 09.07.
- (Опц.) таблица `trends DRONE_TIGHT` vs `yamnet` в `DETECTOR_BENCHMARK.md` (Задача C).

## Definition of Done
- ✅ **Фаза 0:** `docs/reviews/*` + daily-snapshot 09.07 закоммичены, дерево чистое (нет `.txt` в корне), `M STRATEGIC_PLAN_DAY.md` разложен.
- ✅ `@membrana/client` + `@membrana/device-board` — lint/typecheck/test зелёные; `yarn docs:lint` + `yarn catalog:verify-client` зелёные.
- ✅ **Задача A:** `combinedScore > 0` виден в браузере на дрон-звуке; alarm реагирует на score, не на громкость; статус model-provider (нейро vs DSP-only) зафиксирован.
- ✅ **Задача B:** combined+alarm UserCase сохраняется и запускается на живом mic-host; границы device-board→core чисты.
- ✅ `check:boundaries` + `verify:wire-sync` зелёные.
- ✅ Отсутствие клиппинга/прямых импортов между плагинами; соответствие DESIGN.md для UserCase-карточки.
- ✅ **Teamlead LGTM** по A и B — без него S2 не считается закрытым.

> **Оговорка:** план опирается только на предоставленный контекст. Реальный статус model-provider и живого runtime device-board требует проверки (разведка §5) — без неё часть Задачи B может свестись к честному DSP-only варианту.