<!-- Сгенерировано: 2026-09-06T09:05:44.372Z (yarn main-day-issue@22c2a3e5) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"22c2a3e57141e000d1c9278233d3e26c790f0997","digest":"663e5b30597f2ab8f232cd9d0c774080133ead193ec54871b83212f92b6dcd73"},"DAILY_STANDUP":{"version":"22c2a3e57141e000d1c9278233d3e26c790f0997","digest":"049248207a2f6f04fdafee458bacbad910f25501d298b6514c9ebd84dad0f557"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-06

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `buffer-stop-behavior-2296` |
| `primaryTitle` | Поведение буфера при переполнении: умолчание stop, реакция на 413, плашка оператору |
| `githubIssue` | #2296 |
| `size` | L |
| `promptPath` | — (карточка/issue; task-промпт по снимку выбора) |
| `сгенерировано` | 2026-09-06 |

## Магистраль

**buffer-stop-behavior-2296** — единственный обязательный мандат дня: закрыть ночной провал прибора, когда буфер упёрся в квоту (~1 073 433 604 / 1 073 741 824), сервер с 21:40:23Z отвечал `413 Device storage quota exceeded` (~600/час, 6500+ отказов), а **прибор не остановился**. Корень в коде: умолчание плагина `bufferPolicy=auto-cleanup` (`micBufferRecorderPluginState.ts:58`, `types.ts:60`), stop — только выбором в панели; серверная очистка — две ручные ручки plan/execute без расписания, за ночь 0 вызовов. Вердикт владельца: **умолчание — stop**; `auto-cleanup` только после явной настройки параметров. До кода — формат дня: утренние гейты → **ШТОРМ** (вводные тезисы владельца) → **ЗАСЕДАНИЕ** (вердикты по развилкам) → правка по слову «выполняй». Развилки заседания: умолчание; реакция на 413 после N отказов; плашка оператору (причина, объём, время, что дальше); телеметрия после остановки; авто-вывоз в набор. Пролёты: 21:52 МСК — веер Доплера → набор #2302; 00:05 — слабый кандидат; 00:47 и 01:20 — не записаны (буфер полон).

**Критерий успеха к вечеру:** вердикты заседания зафиксированы письменно; умолчание буфера = stop (или явный follow-up-issue с владельческим ok); при 413 прибор не крутит пустые пробы; оператор видит плашку с причиной/объёмом/временем/«что дальше»; телеметрия узла в кабинет не обрывается «в никуда» без объяснения; мини-след по #2302 (вывоз Доплера) не подменяет primary.

## Подкрепление

- **tariffs-in-db-2297** — в базе прода 1 тариф из 3 сетки, переходить некуда: довести согласованность сетки/БД (или явный зазор + follow-up), чтобы self-select и двери кабинета не упирались в пустой выбор.
- **sanitation-2294-2300** — смоук #2294 и гонка телеметрии #2300: санитарно закрыть хвосты, которые маскируют или усугубляют обрыв телеметрии/ложные red после stop-поведения буфера.

## Перспективные

- Живой удар по дверям кабинета (`GET /v1/tariffs` → 200+список; pair/без body → 401/404, не 400) после стабилизации буфера — слово на выкатку, ключ узла (#2284) и полевое дежурство.
- Прохождение гейта `secret-parser-built` (резак + датированный манифест ротации) снимет амнистию правки архива и разблокирует бэкап сессий без сырых секретов.
- Санитария хвоста `cabinet-hotfix-2287` / #2286 (fanout/квота self-select) — письменный ok по oversized-швам, без подмены сегодняшней магистрали buffer-stop.

## Экспериментальные

- На стенде воспроизвести цепочку «квота полна → 413 N раз» и замерить, через сколько отказов UX/агент должен принудительно stop (порог N как гипотеза заседания, не прод).
- Сверить одну ночную серию проб (стационарные гулы 88 Гц / 100 Гц) с правилом «что пишем в набор vs что отбрасываем» до авто-вывоза.
- Черновик копирайта плашки оператора: четыре поля (причина, объём, время, что дальше) на одном экране — проверка читаемости без настройки auto-cleanup.

## Санитарные

- Oversized `aafd9ce0` (#2287) и `29e71db0` — швы «tariff-grid в образе» / `mediaFetch` без `Content-Type` на безтелых вызовах: письменный ok или follow-up (вчерашний BLOCK ревью), **не** primary.
- #2286 fanout/квота self-select — mini-verdict, закрыть санитарный BLOCK письменно.
- Claims-probe 05.09: 3× «не подтверждено» (#2293/#2295/aafd9ce0) + сомнения по карточкам hotfix/verify-image — сверить со стволом.
- Помеха автозабора `29e71db0` (+622) — отделить от топлива дня, не тащить в primary.
- Хвост coverage `mediaFetch`: все шесть безтелых (POST/DELETE client-key, ensure-reserved, GET-латентные), не только pair-POST.
- Вывоз пролёта 21:52 (Доплер) в набор #2302 — учёт артефакта, без расширения скоупа в детекционную магистраль.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `buffer-stop-behavior-2296`, выбор №1 из замороженного снимка (buffer-stop-behavior-2296 · tariffs-in-db-2297 · sanitation-2294-2300) | сессия | owner-choice@chat/magistral-06-09 → `docs/tasks/main-day-assertions.json` `sources[0]` | 2026-09-06 |
| Ночь 05→06.09: буфер у квоты, 413 на каждую пробу, прибор не остановился; телеметрия оборвалась 21:40:18Z | сессия / код | вещдоки ночи (прибор 1c04f0bc) + умолчание `bufferPolicy=auto-cleanup` в micBufferRecorder | 2026-09-05→06 |
| Вердикт владельца: умолчание stop; auto-cleanup только после настройки параметров; код — после шторма и заседания по слову «выполняй» | сессия | то же owner-choice 06.09 (шторм → заседание → «выполняй») | 2026-09-06 |
| Подкрепления: tariffs-in-db-2297; sanitation #2294/#2300 | сессия | sources[0] claim (блок подкреплений) | 2026-09-06 |
| Стендап 06.09 держал фокус «приёмка cabinet-hotfix-2287» | план | `docs/DAILY_STANDUP.md` (генератор standup) — **отражение вчерашнего** sources[1] 05.09, не сегодняшний owner-choice | 2026-09-06 (вход); claim 05.09 |
| DAY_PLAN top-3 (angelina-hostess / assets-container / batch-collection) — кандидаты без owner-choice | план | `docs/DAY_PLAN.md` + норма Q1 | 2026-09-06 |
| Горизонт #592 `secret-parser-built` — веха, не primary | план | `docs/STRATEGY_DAY.md` / day-horizon | 2026-09-06 |
| **Расхождение:** стендап/план ещё тянут hotfix-2287 или L-кандидатов; assertions[0] уже buffer-stop-2296 — **магистраль взята с owner sources[0] / свежего выбора 06.09; assertions согласованы с датой дня; генератор стендапа не перечеканен под новый выбор** | сессия | сравнение `main-day-assertions.json` sources[0] vs DAILY_STANDUP «Фокус дня» | 2026-09-06 |

**Голоса по различным первоисточникам:** 1 источник owner-choice 06.09 (магистраль + вещдоки ночи в одной чеканке). Стендап 06.09 и sources[1] 05.09 — **1 источник, 2 отражения** вчерашнего hotfix-контура; вес не спорит с сегодняшним выбором. DAY_PLAN top-3 и горизонт #592 — отдельные происхождения, но **без** owner-choice на primary → в подкрепление / сознательно не делаем / вторичку.

## Посылки

Развилки A/B по факту существования кода нет в смысле «написать с нуля»: работа — **смена умолчания и контура реакции** (stop / 413 / плашка / телеметрия). Проверяемые якоря уже названы владельцем.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Умолчание буфера сейчас `auto-cleanup`, не `stop` | `symbol:auto-cleanup` / `file:micBufferRecorderPluginState.ts` (около :58) + `types.ts` (:60) | `unknown` (держать зубом на стволе до диффа; claim владельца 06.09 — рабочая гипотеза дня) |
| Серверная очистка квоты не уходит в cron/расписание, только ручные plan/execute | symbol/file серверных ручек plan·execute storage cleanup (кабинет/media) | `unknown` → подтвердить чтением до реализации «реакции на 413» |
| Продуктовый primary — не «приёмка 2287» и не hostess L | — | развилки нет для смены id: primary задан owner-choice, не отсутствием символа |

Если маркер `auto-cleanup` как default **violated** (уже stop в main) — **ПОСЫЛКА НАРУШЕНА**: не назначать «сменить default» повторно; сузить день до 413-реакции, плашки и телеметрии. Иначе — полный скоуп заседания.

## Сегодня делаем

1. Зафиксировать письменный протокол **ШТОРМ → ЗАСЕДАНИЕ** по пяти развилкам (default; N×413; плашка; телеметрия; авто-вывоз) до любой правки кода.
2. После слова «выполняй» — смена умолчания buffer policy на **stop** (+ тест/контракт, что auto-cleanup не включён молча).
3. Поведение клиента/узла при серии 413: stop записи/проб, без бесконечного mill 600/час.
4. Плашка оператору: причина (quota/413), объём, время упора, «что дальше» (освободить / сменить тариф / вывезти набор).
5. Телеметрия после stop: кабинет не «немой» без статуса; статус остановки доезжает.
6. Учёт #2302: пролёт 21:52 (Доплер) помечен к вывозу в отдельный набор — чеклист, не детекционный эпик.
7. Подкрепление: замер/след tariffs-in-db-2297 (1 из 3 в проде) — короткий статус в дневном следе.

## Definition of Done (фокус)

- [ ] Протокол заседания с вердиктами по всем названным развилкам лежит в docs/ (или seanses/) и ссылается на #2296
- [ ] Умолчание buffer policy = **stop** в коде плагина; `auto-cleanup` только после явной настройки параметров
- [ ] Автотест или контрактный зуб: default ≠ auto-cleanup без opt-in
- [ ] При ответе storage 413 повторные пробы не крутятся бесконечно (stop после вердиктного N или сразу — как решит заседание)
- [ ] UI/плашка оператора показывает причину, объём, время, следующий шаг
- [ ] Телеметрия/статус узла после остановки доходит до кабинета или даёт явный offline-reason
- [ ] #2302 зафиксирован как вывоз артефакта ночи, без расширения primary
- [ ] Нет merge «по дороге» hostess/assets-container/batch-collection/#592 primary

## Сознательно не делаем сегодня

- Не стартуем L из top-3 DAY_PLAN: `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового owner-choice.
- Не делаем `secret-parser-built` (#592) primary — максимум фикстура резака / черновик манифеста во вторичке.
- Не открываем детекционную магистраль (scoreboard / «Этап 1.A» / benchmark harmonic+cepstral+flux / повтор free-v1).
- Не подменяем день review-only merge #2286 и не делаем primary из приёмки `cabinet-hotfix-2287` (это вчерашний контур; сегодня — buffer-stop).
- Не трогаем живой прибор/дежурство «на удачу» до вердиктов stop/413 и зелёных дверей по согласованию.
- Не включаем auto-cleanup «чтобы спасти ночь» без параметров и слова владельца.

## Вторично (если останется время)

1. `secret-scan-cutter-fixture` / черновик `rotation-manifest-dated-pass` — усиление гейта #592 без подъёма в primary.
2. Письменный mini-ok по шву `mediaFetch` без Content-Type (хвост #2287) — одна страница статуса, без выкатки.

## Зависимости и риски

- **Блокер:** кодить default/413/плашку до вердиктов заседания — запрет формата владельца («не код до вердиктов»).
- **Риск:** стендап и привычный hotfix-контур утянут внимание в #2287 — держать primary id = buffer-stop-2296.
- **Риск:** stop без плашки/телеметрии = «тихая смерть» узла для оператора (повтор ночного обрыва статуса).
- **Зависимость:** tariffs-in-db-2297 — если сетка/БД разъедутся, оператор «что дальше» не сможет предложить старший тариф честно.

## Ссылки

- `docs/DAILY_STANDUP.md` — стендап 2026-09-06 (контекст; фокус стендапа расходится с owner magistral)
- `docs/tasks/main-day-assertions.json` — `sources[0].claim` (buffer-stop-behavior-2296)
- `docs/DAY_PLAN.md` — план слотов 2026-09-06
- `docs/STRATEGY_DAY.md` — горизонт вехи #592
- GitHub #2296 (buffer-stop), #2297 (tariffs-in-db), #2294/#2300 (sanitation), #2302 (набор Доплера), хвосты #2287/#2286