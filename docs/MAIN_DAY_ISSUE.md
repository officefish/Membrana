<!-- Сгенерировано: 2026-11-21T07:11:33.483Z (yarn main-day-issue@d070c44f) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"0b9871866b5846cd49520395e61b3df07e37274f","digest":"21c3a9488ee53cf1d984b2e8f405db5b2f29d444031e6650c807258d0695db2e","versionAt":"2026-11-20T11:06:42+03:00"},"DAILY_STANDUP":{"version":"0b9871866b5846cd49520395e61b3df07e37274f","digest":"a6982f88693481e6704228af3c57949f3861b4bc354965d331a7b57709411b85","versionAt":"2026-11-20T11:06:42+03:00"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: node-duty-ready-predicate, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, plugin-results-payload-pocket, firebat-node-device, frame-holders-reassign-twenty, workflow-examples-marathon, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, assets-container, office-stability-emergency, swallow-format-frame-fix, morning-report-completion, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, dads-benchmark-bridge, morning-ritual-regulation, truth-graph-contour, mf8-sprint-kind, mf4-teeth-sm2, mf3-commands-vs-flag, membrana-device-build-profile, rt-7-priorities-from-registry, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, graphify-research-tree-panel-sections, detector-metrics-characterization, root-domain-scenarios-docs, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, pcb-d2-multinode, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-11-21

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `archive-gc-journal-2588` |
| `primaryTitle` | Понижение тарифа с заморозкой: блок 2 (#2588) — diff-pass oversized, замок D1, приёмка g7 cold-archive на september (без боевого purge) |
| `githubIssue` | #2588 |
| `size` | L |
| `promptPath` | — (фокус по owner-claim 07.10 + живой край #2588/#2632; отдельный task-prompt в срезе не подан) |
| `сгенерировано` | 2026-11-21 |

## Магистраль

Владельческая магистраль (sources[0], 07.10) — **понижение тарифа с заморозкой** (ручной выбор вне топ-3). Живой край на 21.11 — **блок 2 (#2588)**: код b1–b6 в стволе, контур cold-archive/#2632 после вчерашнего шва g5b+g6a (ADR-0032: media владеет журналом, office — метроном/чтение, panel — GET). Сегодняшний обязательный мандат — не новая продуктовая ось и не top-3 из плана, а **дожать готовность блока 2 к выкатке/приёмке**: человеческий/агентный **diff-pass** oversized `0b987186` (#2696, 407) и `242aef3d` (567); **замок D1** (`replica_count>1` → hard-fail или явное ограничение в ADR-0032); подготовка/протокол **g7 на september** без снятия `COLD_ARCHIVE_SWEEP_DRY_RUN` и без live-purge до слова владельца. Блок 1 (#2587: b5 экран подтверждения, b6 приёмка) и выкатка с `CABINET_OFFICE_TOKEN` / `CABINET_API_URL` — только после зелёного края #2588 и слова на кабинет.  
**Критерий успеха к вечеру:** diff-pass обоих oversized зафиксирован (вердикт pass/fail с ссылкой на коммиты); D1 либо в коде/ADR, либо явный письменный блокер; g7 — dry-run/протокол #2704 согласован с фактом, **боевой** `DRY_RUN=false` не включён без owner-ack; #2588 не закрыт фиктивно.

## Подкрепление

- **diff-pass oversized `0b987186` (407) и `242aef3d` (567)** — снять риск «зелёных по умолчанию» до любого merge-внимания и до слова на g7/live; зубы office/media/panel по cold-archive не подменяют развёртку диффа.
- **Замок D1 `replica_count>1` (hard-fail) или явное ограничение в ADR-0032** — убрать ложный abandoned и параллельные live-прогоны на второй реплике media; без D1 приёмка g7 на september недопустима как «готово к бою».

## Перспективные

- Приёмка g7 на september по протоколу #2704 → слово владельца на `COLD_ARCHIVE_SWEEP_DRY_RUN=false` и ночные боевые прогоны уборки.
- Дожим остатка вехи `return-hygiene`: busboy в media (#2623→#2661), Docker Desktop владельца, weekly-plan PR + `WEEKLY_PLAN_TOKEN` (#2649) — разморозка недельного контура только после этого.
- Блок 1 тарифа (#2587): b4b/b5/b6 (оркестратор freeze-first, экран подтверждения понижения, приёмка) и выкатка кабинета по слову владельца (`CABINET_OFFICE_TOKEN`, `CABINET_API_URL`).

## Экспериментальные

- Проба: один assert `pulseOf` при `lastSucceeded_at = now − 2h` ровно — граница «не stale» без дыры между «до» и «после» (сейчас unit кроет только стороны порога).
- Проба: diff-pass только чтения по `0b987186` / `242aef3d` на пути office→media/БД — нет ли дрейфа границы ADR-0032 в oversized-коммитах.
- Проба: dry-run cold-archive на september без `PURGE_LIVE` и без снятия `DRY_RUN` — совпадает ли живой отчёт с протоколом приёмки #2704 до слова на бой.

## Санитарные

- diff-pass по oversized `0b987186` (#2696, 407) и `242aef3d` (567) — **до** merge-внимания, не «зелёные по умолчанию» (P1 вчерашнего code-review).
- D1-долг: `replica_count>1` + live → ложный abandoned — явный замок или письменное ограничение в ADR-0032.
- Граничный кейс `pulseOf` ровно 2ч в `cold-archive-pulse.test.ts`.
- a11y-хвост g6: фокус/tabindex/контраст в `ColdArchiveRunsJournal` и `ColdArchiveScheduleTab` (не смена магистрали).
- Дрейф-аудит шва g6-панели: нет прямых путей office→media/БД в обход двери ADR-0032.
- Не включать боевой cold-archive (`COLD_ARCHIVE_SWEEP_DRY_RUN=false` / live purge) без owner-ack на september.
- Codex-триаж 4 CVE + #2590 — статус PR; не разворачивать в primary.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = «понижение тарифа с заморозкой»; блок 2 #2588 — код в стволе, ждёт выкатки и приёмки b7; блок 1 #2587 — b5/b6 впереди | сессия | `main-day-assertions.json` → `sources[0].claim` (owner-choice@chat/magistral-07-10-manual, author=human) | 2026-10-07 |
| Гейт несёт `magistral: archive-gc-journal-2588`, `magistralChosenAt: 2026-11-20`, author=human — но `day: 2026-10-07` ≠ сегодня → **U1 не срабатывает**; freshness: `no_gate`, расхождением не считается; **assertions не перечеканены** под 21.11 | снимок-хардкод | `docs/tasks/morning-gates-state.json` (`magistral`, `day`, `magistralManual`) | day=2026-10-07; chosenAt=2026-11-20; прогон 2026-11-21 |
| Стендап: owner-choice на 2026-11-21 отсутствует; стендап фокус не назначает; не top-3 (`assets-container` / `chart-list-plugin` / `detection-alarm-loop-refactor`) пока не добита `return-hygiene` | план | `docs/DAILY_STANDUP.md` (yarn standup@d070c44f) | 2026-11-21 |
| Веха горизонта — `return-hygiene` (busboy/media, Docker, weekly-plan+token, чистые деревья); не подмена владельческой тарифной оси | план | `docs/STRATEGY_DAY.md` / `docs/strategy/day-horizon.json` (генератор #592) | 2026-11-21 |
| Вчера: шов g5b+g6a #2632/ADR-0032 в main; #2588/#2632 OPEN; g7 и D1 не закрыты; **не** LGTM на `DRY_RUN=false`; oversized без развёртки | код | `docs/DAILY_CODE_REVIEW.md` (cec5096a…242aef3d; commits 0b987186, 242aef3d) | 2026-11-20 |
| План дня: подкрепление = diff-pass oversized + замок D1; санитарные совпадают; магистраль плана — top-3 **кандидаты**, выбор — слово владельца (не синтез) | план | `docs/DAY_PLAN.md` (canon M2-B) | 2026-11-21 |
| Не боевой cold-archive и не g7 «по умолчанию» без diff-pass, D1 и слова на september | сессия | DAILY_STANDUP «Что сознательно не делаем» + code-review Risks P1 | 2026-11-20/21 |

**Счёт независимых голосов:** (1) owner `sources[0]` 07.10 — тариф+заморозка/#2588; (2) вечерний code-review 20.11 — факт ствола и долги g7/D1/oversized; (3) горизонт #592 — `return-hygiene` как веха-обёртка. Стендап и DAY_PLAN по «не top-3 / hygiene» — **1 источник, 2 отражения** одного утреннего контура 21.11 (не усиливают друг друга). Гейт `archive-gc-journal-2588` согласован по смыслу с #2588, но **не** сегодняшняя перечеканка assertions (day≠2026-11-21).

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Контур cold-archive разделён по ADR-0032: journal/runner в media, office не пишет в БД media, panel read-only | `file:docs/adr` / пакеты `background-media`, `background-office`, `panel` (coldArchive*) — по ревью 20.11 | holds (по влитому срезу; oversized ещё не diff-pass) |
| Боевой sweep не принят: нельзя `COLD_ARCHIVE_SWEEP_DRY_RUN=false` до g7/owner | `symbol:COLD_ARCHIVE_SWEEP_DRY_RUN` + issue #2588/#2632 OPEN | holds |
| D1: вторая реплика media + live даёт ложный abandoned | маркер замка в коде/ADR-0032 на multi-replica | unknown → работа дня (закрыть или письменно ограничить) |
| Oversized 0b987186 / 242aef3d не развёрнуты вечерним ревью | `git show 0b987186 --stat`; `git show 242aef3d --stat` | holds (долг утра) |

Развилки A/B нет — посылок-развилок не требуется; при violated D1/diff-pass — **не** объявлять g7 closed.

## Сегодня делаем

1. **Diff-pass** `0b987186` (#2696) и `242aef3d`: развернуть stat/критические hunks; вердикт по границе ADR-0032 (нет office→media/БД в обход двери); зафиксировать в дневном следе.
2. **Прогнать** точечно: `yarn turbo run lint typecheck test --filter=@membrana/background-media --filter=@membrana/background-office --filter=@membrana/panel` (+ cold-archive/purge test-фильтры при наличии).
3. **D1:** ввести hard-fail при `replica_count>1` + live **или** явная запись ограничения в ADR-0032; без этого не формулировать «готово к live».
4. **g7-протокол:** dry-run cold-archive на september сверить с #2704; чеклист приёмки; **не** снимать `DRY_RUN` / не `PURGE_LIVE` без owner-ack.
5. **Пульс:** добавить/уточнить unit на `pulseOf` ровно 2ч (`lastSucceeded_at = now − 2h`), если зуб ещё только «до/после».
6. Краткий статус блока 2 (#2588) владельцу: что зелёное, что блокирует b7/выкатку (D1, g7, tokens кабинета — отдельно).

## Definition of Done (фокус)

- [ ] Diff-pass по `0b987186` и `242aef3d` выполнен и записан (pass/fail + нарушения границы, если есть)
- [ ] Lint/typecheck/test зелёные на `@membrana/background-media`, `@membrana/background-office`, `@membrana/panel` в затронутом контуре
- [ ] D1 закрыт кодом (hard-fail) **или** явным ограничением в ADR-0032; нет «тихого» multi-replica live
- [ ] g7: dry-run/протокол #2704 согласован; список критериев приёмки на september актуален
- [ ] `COLD_ARCHIVE_SWEEP_DRY_RUN=false` и live purge **не** включены без явного слова владельца
- [ ] #2588 не помечен CLOSED без b7/verify; открытые долги g6 UI / orphan_blob не маскируются под «панель готова»
- [ ] Граничный тест `pulseOf` @ 2ч ровно — есть или явный won't-fix с причиной
- [ ] Вечер: можно сдать статус блока 2 без подмены магистрали top-3 или детекцией

## Сознательно не делаем сегодня

- Боевой cold-archive / live purge / `COLD_ARCHIVE_SWEEP_DRY_RUN=false` без owner-ack на september
- Top-3 как смена магистрали: `assets-container`, `chart-list-plugin`, `detection-alarm-loop-refactor`
- Разморозка недельного контура до добивания `return-hygiene` (busboy/media, Docker Desktop, weekly-plan PR+token)
- Детекция как главная полоса: «Этап 1.A», benchmark harmonic+cepstral+flux на free-v1, «разведка» yamnet, phase-2 FREE/качества
- a11y cold-archive UI, orphan_blob, token-revision (#2662), trace-teardown (#2659), build-order tooth (#2653) — только санитарный follow-up, не primary
- Выкатка кабинета с секретами (`CABINET_OFFICE_TOKEN`, `CABINET_API_URL`) без слова владельца
- Синтез новой магистрали из top-3 плана вопреки `sources[0]`

## Вторично (если останется время)

1. a11y-проход g6: `ColdArchiveRunsJournal` / `ColdArchiveScheduleTab` (фокус/tabindex/контраст) — без расширения scope в write-API.
2. Статус-пинг busboy/#2661 в media и #2649 weekly-plan token — одна запись в след, без ухода в недельный эпик.

## Зависимости и риски

- **Блокер P1:** g7 не принят → запрет боевого sweep; срыв дисциплины = риск purge на september.
- **Блокер P1:** D1 не закрыт → ложный abandoned / параллельные live на multi-replica.
- **Блокер P1:** oversized без diff-pass → скрытый дрейф ADR-0032 в уже влитом.
- **Риск процесса:** `sources[0]` от 07.10 и gate `day=2026-10-07` при `magistralChosenAt=2026-11-20` — assertions **не перечеканены** на 21.11; нужен owner-mint свежей магистрали, иначе probe/ритуал снова едут на устаревшем claim.
- **Зависимость:** слова владельца на live, на кабинетные token/URL и на Docker Desktop — вне полномочий команды.

## Ссылки

- `docs/DAILY_STANDUP.md` (2026-11-21)
- `docs/DAILY_CODE_REVIEW.md` (2026-11-20, #2632 / ADR-0032 / g5b+g6a)
- `docs/STRATEGY_DAY.md` (веха `return-hygiene`, #592)
- `docs/DAY_PLAN.md` (2026-11-21)
- `docs/tasks/main-day-assertions.json` → `sources[0]` (owner 07.10)
- `docs/tasks/morning-gates-state.json` (`magistral: archive-gc-journal-2588`)
- GitHub #2588, #2632, #2696, #2704; ADR-0032
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6 (не поднимать DSP-бенч как магистраль)