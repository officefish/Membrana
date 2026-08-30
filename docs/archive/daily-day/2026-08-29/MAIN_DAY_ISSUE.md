<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-29
  archived-at: 2026-08-29T15:32:57.521Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-29T08:45:50.130Z (yarn main-day-issue@77b53ff9) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"b22ead0cee68f3f7a78e102c16162ed590aaf69d","digest":"8abb26487dfe09fdc56daf14cd78e4cdbc86009fe779ac8a073485b648c71bb6"},"DAILY_STANDUP":{"version":"b22ead0cee68f3f7a78e102c16162ed590aaf69d","digest":"1eb76c9abe78d5edf66ed2f11aaf5b8e26ed19a45de09cc06cda4df59d4d9b0f"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-29

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `night-procedure-frames` |
| `primaryTitle` | Ночь как отдельная процедура со своим набором фреймов (зеркало утро/вечер) |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — (карточка/промпт по id `night-procedure-frames` в реестре; вне реестра не синтезировать) |
| `сгенерировано` | 2026-08-29 |

## Магистраль

**night-procedure-frames (L)** — по прямому слову владельца 29.08, выбор №1 из замороженного снимка топ-3 (`night-procedure-frames` · `buffer-delete-modal-2218` · `assets-container`). Ночь становится **отдельной процедурой** со своим набором фреймов, симметрично утру и вечеру: не «хвост вечера» и не россыпь cron-ов без читателя.

Обоснование владельца измерено 29.08: из шести ночных процессов реально работают два (полные тесты, пробы сети); ночная охота 14 ночей подряд врала (`curl 400` под `|| echo optional`); недельный стратегический план мёртв с 14.05 (17 прогонов, ноль зелёных); недельный анализ заморожен. **Корень общий: у ночи нет читателя** — единственный потребитель (утренний гейт) читает только отчёт о тестах. Рядом живой дефект: расписания GitHub опаздывают на 10–12 часов третьи сутки (27.08 13:55, 28.08 15:06 при cron 03:00) → гейт требует отчёт **сегодняшней** даты и ежедневно стопорит утро.

**Критерий успеха к вечеру:** зафиксирован контур ночной процедуры (состав фреймов / входы-выходы / кто читает утром); минимум один фрейм с проверяемым артефактом «для утреннего читателя» (не только test-report); дефект «охота optional-врёт» и/или «schedule drift → гейт ломает утро» либо закрыт предикатом, либо явно в gap-таблице процедуры; L-кандидаты generator top-3 и незакрытый хвост #2204 **не** подменили ствол.

## Подкрепление

- **buffer-delete-modal-2218** — второе задание владельца «по возможности»: модалка удаления со списком файлов и гипотезой ценности; срок дежурства сдвинут на три дня, спешки нет — не ствол, но единственный разрешённый M+ рядом с магистралью.
- **Контур «резак → датированный манифест» к вехе `secret-parser-built`** (горизонт #592): не primary coding-focus; усиление дня только если ночные фреймы касаются backup/session-scan — сверка, что cut до архива и что проход с манифестом ротации не подменяется детектором.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак + датированный манифест ротации) снимает амнистию на правку архива и открывает безопасный бэкап сессий на следующие дни.
- Доказанный стоп буфера по remaining (#2229 ↔ DoD п.3 / хвост #2204) открывает следующее дежурство без риска переполнения квоты record-сценарием — **после** ночного контура, не вместо.
- `assets-container` / хранение как продуктовое обещание — вектор после появления у ночи читателя и после явного owner-choice на L из прежнего top-3.

## Экспериментальные

- Один контролируемый прогон «ночного» фрейма с синтетическим отчётом **не-test** (сеть/охота/стратегия) → проверить, подхватывает ли утренний гейт что-то кроме test-report или молча отбрасывает.
- Сверка фактического `schedule` GitHub Actions vs cron 03:00 на одном workflow: измерить drift (часы), не чиня все сразу — вход в фрейм «время ночи».
- Прогон `night-triage-secret-scan` на синтетическом фикстуре с ложными ключами: режет ли контекст вокруг секрета или только паттерн (без прод-архива) — разведка к вехе, не ствол.

## Санитарные

- media-тесты **#2204**: residual RED с 27.08 — `turbo test` media-library-service + background-media → green **или** fail-log в issue (не подмена магистрали UI/GC/образом).
- сверка **#2229** / `buffer-stop.ts` с DoD п.3: remaining + порог + сигнал наружу; иначе gap-таблица (носитель стоп-предиката не размывать зонтиком #2204).
- живое состояние **#2199**: в таблице ещё OPEN при влитом #2217 — `gh pr view`, закрыть хвост учёта.
- oversized-ревью: #2221 (707), 531, 609 — очередь P1, не ствол дня.
- помеха прогонов: не закрывать зонтик #2204 гигиеной cabinet/CI в обход green media и предиката стопа.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = `night-procedure-frames` (ночь = отдельная процедура с фреймами) | сессия | owner-choice@chat/magistral-29-08 → `main-day-assertions.json` `sources[0].claim` | 2026-08-29 |
| Выбор №1 из замороженного топ-3: night-procedure-frames · buffer-delete-modal-2218 · assets-container | сессия | тот же owner-choice 29.08 (frozen snapshot) | 2026-08-29 |
| Вторым заданием — buffer-delete-modal-2218 «по возможности»; дежурство +3 дня, без спешки | сессия | sources[0].claim (вторая клауза владельца) | 2026-08-29 |
| У ночи нет читателя; охота врала 14 ночей; schedule drift 10–12 ч ломает утренний гейт | сессия | измерения/факты в sources[0].claim владельца 29.08 | 2026-08-29 |
| Стендап держит фокус «добить #2204 green media + стоп remaining» | план | `docs/DAILY_STANDUP.md` (фокус дня) — **вчерашний BLOCK / хвост 27–28.08**, не sources[0] сегодня | 2026-08-29 (генерация стендапа; содержание = продолжение 28.08) |
| DAY_PLAN top-3: angelina-hostess-impl / assets-container / batch-collection-run-contour; магистраль НЕ назначена планом | план | `docs/DAY_PLAN.md` + норма owner-choice (Q1) | 2026-08-29 |
| Горизонт вехи: `secret-parser-built` (approaching) — подкрепление/гигиена, не ствол | план | `docs/STRATEGY_DAY.md` ← `docs/strategy/day-horizon.json` | 2026-08-29 |
| Запрет синтезировать магистраль при непустом sources[]; L из generator не подменяют owner-choice | код | канон main-day-issue / probe (уроки 16.07 фантом, 18.07 #598/#599) | 2026-07-16… |
| FFT / Этап 1.A / benchmark harmonic+cepstral+flux — не магистраль (потолок эшелона 0) | код | `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6 + `detection-planning-priorities.mjs` | 2026-06-14… |
| Assertions[] пуст — посылка «работы нет» маркером kind file/test/symbol для фреймов ночи текущим probe невыразима (класс link/retired) | снимок-хардкод | `main-day-assertions.json` assertions + семантика //link | 2026-08-29 |

**Голоса по различным первоисточникам:**

1. **Owner-choice 29.08** (`sources[0]`) — единственный голос назначения магистрали → **night-procedure-frames**.
2. **Стендап/ревью-хвост #2204** — независимый голос про незакрытый BLOCK media/stop; **не** перехватывает ствол; уходит в санитарные + «сознательно не делаем как primary».
3. **DAY_PLAN generator top-3** — кандидаты без owner-choice; вес 0 на назначение (отражения реестрового ранга, не волеизъявление).
4. **STRATEGY_DAY `secret-parser-built`** — веха горизонта; 1 источник на подкрепление/санитарию, не на primary.

> **1 источник назначения, N отражений контекста:** назначение = только owner `sources[0]`. Стендап, DAY_PLAN и горизонт **раскрывают** риски и очередь, но **не** выбирают магистраль. Синтез «логичнее добить #2204» при живом sources[0] — запрещённая ошибка probe.

> **У1 / гейт:** в предоставленных входах нет `morning-gates-state.json` с `magistral.day = 2026-08-29`, расходящимся с sources[0]. Магистраль взята из `sources[0].claim` (29.08). Строка «магистраль взята с гейта, assertions не перечеканены» — **не применима** (нет более свежего gейта в контексте).

## Посылки

Развилки A/B «работы ещё нет» в смысле marker-probe **нет**: фокус — владельческий контур процедуры (фреймы/читатель/контракт ночи), а не отсутствующий symbol в `packages/**|apps/**`. `assertions[]` пуст сознательно.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| — | — | развилки нет, посылок не требуется |

(Контрольные факты дня — не posylka probe, а DoD: «есть читатель утренним гейтом не-test артефакта», «охота не маскирует fail optional-эхом», «schedule drift назван числом» — проверяются приёмкой процедуры, не kind:symbol.)

## Сегодня делаем

1. Зафиксировать **модель ночной процедуры**: список фреймов (минимум: тесты, пробы сети, охота, стратегия/анализ — status quo «жив/врёт/мёртв»), входы, артефакты, **кто читает утром**.
2. Ввести или восстановить **одного утреннего читателя** сверх test-report (контракт: путь артефакта + freshness/date predicate) — чтобы ночь перестала быть «письмом в никуда».
3. Закрыть или явно загейпить дефект **night-hunt optional-враньё** (`curl` fail → `|| echo optional` без сигнала) — предикат/тест или строка в gap-таблице процедуры.
4. Замерить и задокументировать **GitHub schedule drift** (факт 10–12 ч vs cron 03:00) как вход фрейма времени; решение — fix schedule **или** ослабить «только today» в гейте с обоснованием (одно из двух к вечеру).
5. По возможности (второе слово владельца): каркас/поведение **buffer-delete-modal-2218** (список файлов + гипотеза ценности) без срыва ствола.
6. Санитария без подмены ствола: fail-log или green по media в #2204; не закрывать issue гигиеной.

## Definition of Done (фокус)

- [ ] В репозитории/доке процедуры есть явный состав фреймов ночи (не «набор cron без имён»).
- [ ] Объявлен утренний потребитель ≥1 ночного артефакта **кроме** отчёта тестов (путь + ожидаемая свежесть).
- [ ] Дефект «охота 14 ночей optional-врёт» — fix **или** gap-строка с владельцем сигнала.
- [ ] Schedule drift GitHub назван числом (workflow, ожидаемое UTC, факт last run) и либо починен, либо учтён в предикате утреннего гейта.
- [ ] Магистраль дня в артефактах ритуала = `night-procedure-frames`, без подмены generator L (hostess/assets/batch) и без подмены ствола #2204.
- [ ] Вторичка buffer-delete-modal-2218 либо дала проверяемый инкремент, либо честно «не трогали — не осталось времени» в вечернем протоколе.
- [ ] Нет merge/close #2204 по cabinet/CI-гигиене без green media или fail-log.

## Сознательно не делаем сегодня

- L-магистраль из generator top-3: `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` — только после слова владельца; сегодня слово уже за `night-procedure-frames`.
- Primary coding-focus: `secret-parser-built` / резак / манифест ротации — горизонт и подкрепление, не ствол.
- FFT / «Этап 1.A» / benchmark harmonic+cepstral+flux / `detector-scoreboard` как витрина дня.
- Добивание #2204 green media + remaining-stop **как primary** (это вчерашний BLOCK и санитарный хвост; владелец 29.08 сменил ствол).
- Oversized-хвосты (#2221 / 531 / 609) и play-path — кроме удара по квоте/проду на дежурстве.
- Эшелон-2 «разведка yamnet» / повтор free-v1 DSP-бенчмарков без смены датасета/fusion.

## Вторично (если останется время)

1. buffer-delete-modal-2218 — UI-модалка удаления буфера со списком и гипотезой ценности (owner: «по возможности»).
2. #2199 учётный хвост (OPEN при влитом #2217) — `gh` закрытие/сверка, без расползания в buffer-control.

## Зависимости и риски

- **Риск подмены ствола:** давление стендапа/#2204 и дежурства легко снова сделает день «media green»; держать #2204 в санитарии, не в Магистрали.
- **Блокер утра:** schedule drift + гейт «отчёт today» — чинить dual-track (время ночи **и** предикат гейта), иначе процедура ночи снова не дочитает.
- **Риск scope L:** «все шесть ночных процессов» за день не поднять — DoD = читатель + честность охоты/времени, не полный rewrite night-sprint.
- **Зависимость от owner-артефактов процедуры:** без записи фреймов в канон (docs/prompts или registry-контур) утро 30.08 снова увидит только test-report.

## Ссылки

- `docs/DAILY_STANDUP.md` — стендап 2026-08-29 (контекст; фокус #2204 = хвост, не sources[0])
- `docs/tasks/main-day-assertions.json` — `sources[0].claim` owner-choice magistral-29-08
- `docs/DAY_PLAN.md` — top-3 кандидаты без назначения
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built`
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — запрет FFT-витрины как магистрали
- Task id: `night-procedure-frames` (реестр); вторичка: `buffer-delete-modal-2218` / issue #2218 при наличии