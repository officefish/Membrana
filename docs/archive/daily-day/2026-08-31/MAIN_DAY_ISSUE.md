<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-31
  archived-at: 2026-08-31T17:08:13.716Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-31T09:37:18.361Z (yarn main-day-issue@db214af7) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"bd2abed08308f36b4b76d9e656267261bcfedea7","digest":"620439563126aaa2b4a080b7dc0b95af743da112a5f308fbc3b71704c02f6a52"},"DAILY_STANDUP":{"version":"bd2abed08308f36b4b76d9e656267261bcfedea7","digest":"c5a4c2f56824aca8650d084579a40afa5006ba3099115d3f5b1a8f4029427b75"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-31

## Метаданные
| Поле | Значение |
|------|----------|
| `primaryFocusId` | `sample-move-between-collections` |
| `primaryTitle` | Перенос проб между пользовательскими наборами (оба дома) |
| `githubIssue` | — |
| `size` | M |
| `promptPath` | — (фокус вне реестра / живой дефект владельца) |
| `сгенерировано` | 2026-08-31 |

## Магистраль
**sample-move-between-collections** — починить перенос проб из одного пользовательского набора в другой в обоих домах (Studio и кабинет). Дефект найден владельцем на живой работе: UI показывает перенос только при `selectedId === BUFFER_COLLECTION_ID` (`SampleLibraryModule.tsx` ~689 и ~757, `canMutate` у панели чарт-листа), хотя сервер (`samples.service.ts`) блокирует лишь тарифный набор и перенос «в тот же самый», а `moveTargets` уже исключает текущий набор, буфер и системные. Исторически условие писали под разбор буфера; когда наборы стали архивом, ограничение потеряло смысл. К вечеру: в обоих домах перенос набор→набор работает; тексты статуса «переносится… / перенесено в X» как у буфер→набор; ценность «разобранной руками» не ломается при уходе записи из именованного набора; условие `BUFFER_COLLECTION_ID` снято или заменено на предикат, допускающий пользовательские наборы.

## Подкрепление
- `move-status-copy-parity` — те же слова статуса, что для буфер→набор («переносится…», «перенесено в X»), на пути набор→набор; без додумывания копирайта.
- `value-flag-survivability` — проверка: запись, уехавшая из именованного набора в другой, остаётся «разобранной руками»; регрессия ценности — блокер приёмки, не «потом».

## Перспективные
- После починки переноса наборы становятся полноценным архивом оператора, а не только витриной буфера — следующий шаг: явные сценарии «разбор → именованный набор → другой набор» без возврата в буфер.
- Гейт `secret-parser-built` (резак до backup + датированный манифест ротации) остаётся approaching-горизонтом #592; проводка уже существующего `secret-redact` в путь triage→backup — следующий owner-choice, не сегодняшний ствол.
- Ночная процедура (`night-procedure-frames`): n1+n2 одним PR по контракту корпуса; n4 сводка / n5 утро читает сводку — вектор после влития хвостов #2239/#2244.

## Экспериментальные
- На одном сэмпле из буфера глазом оператора: «детекция первична / запись вспомогательна» — держит ли обещание хранения сортировку без прослушивания всего объёма (`insight-storage-as-product-promise`).
- Сверить вчерне один засвеченный ключ с формой манифеста ротации (список, без перевыпуска) — хватает ли biweekly-контура как учёта амнистии архива.
- Прогон `night-triage-secret-scan` в режиме «только резак» на одном датированном архиве без write — есть ли хвосты в сыром виде (не магистраль, разведка).

## Санитарные
- Красный `@membrana/background-media#test` с 27.08 — диагноз: помеха прогона или pre-existing; `turbo test --filter` + issue.
- Вечерний автозабор: чистый tree после ritual-evening либо явный commit только своих артефактов дня.
- Сверка DAILY_STANDUP / MAIN_DAY_ISSUE с MERGED #2240–#2245; находка: стендап/горизонт не перечеканены под owner-choice 31.08 (`sample-move-between-collections`).
- Реестровый пробел: карточек `night-procedure-frames` и `secret-parser-built` нет (claims-probe); `sample-move-between-collections` тоже вне реестра — завести или явно держать «вне реестра».
- P2-хвосты: хрупкий парсинг `waitsFor` в зубе #2245; lint `CabinetSampleDuplicatesPanel.tsx` (`titleOf`).
- Перенесённые с 30.08: #2244 разметка (блокер починен, ждёт ревью); #2235 журнал выкаток — не ствол дня.

## Почему это магистраль (таблица обоснования)
| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец 31.08 назначил магистралью `sample-move-between-collections` | сессия | `main-day-assertions.json` → `sources[0]` (`owner-choice@chat/magistral-31-08`) | 2026-08-31 |
| Перенос UI только из буфера: `selectedId === BUFFER_COLLECTION_ID` в двух местах | код | `apps/client/src/modules/SampleLibraryModule.tsx` ~689, ~757 (`canMutate`) | 2026-08-31 (установлено ведущей до гейта) |
| Сервер не блокирует набор→набор (кроме тарифа и «в тот же») | код | `samples.service.ts` | 2026-08-31 |
| `moveTargets` уже корректен (исключает текущий, буфер, системные) | код | client move-targets | 2026-08-31 |
| Стендап/STRATEGY_DAY/DAY_PLAN толкают `secret-parser-built` / top-3 L — **не** owner-choice | план | генератор #592 + `DAY_PLAN` top-3 без choose | 2026-08-31 |
| Магистраль взята из assertions `sources[0]`; расхождение со стендапом/гейтом горизонта **не замалчивать** | сессия | owner-choice vs standup focus `secret-parser-built` | 2026-08-31 |
| Синтез магистрали из горизонта/стендапа запрещён, пока задан owner-source | сессия | канон MAIN_DAY_ISSUE / probe (прецеденты 16.07, 18.07) | 2026-07-16… |

**Голоса:** 1 источник owner-choice (sources[0]) — решающий. Код-диагноз ведущей — тот же эпизод выбора (не независимый «второй голос за другую тему»). Стендап + STRATEGY_DAY + DAY_PLAN highlights = **1 источник, 3 отражения** горизонта #592 `secret-parser-built` — коррелированы; **не** перебивают owner-choice. Итого primary: **sample-move-between-collections**.

## Посылки
| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| UI разрешает mutate/move только в буфере (`selectedId === BUFFER_COLLECTION_ID`) | `symbol:BUFFER_COLLECTION_ID` в `apps/client/src/modules/SampleLibraryModule.tsx` (ветки canMutate ~689/~757) | `holds` (по диагнозу до гейта; работа = снять/расширить предикат) |
| Сервер уже умеет перенос не только из буфера | `symbol` переноса/move в `samples.service.ts` (блок только тариф + same-collection) | `holds` как «сервер не мешает» — не назначать серверный rewrite |
| Копирайты «переносится/перенесено в X» есть для буфер→набор и должны переиспользоваться | UI-строки статуса move (client) | `unknown` до сверки обоих домов — проверить, не додумать |

Развилка A/B «строить vs принять» по fusion-классу нет: работа — UI-предикат в двух домах + паритет статуса + инвариант ценности. Выдуманных «работы ещё нет» по secret-redact **нет** (резак в `scripts/lib/secret-redact.mjs` с 26.07 — retired-03-08); secret-parser сегодня **не** primary.

## Сегодня делаем
1. Снять/заменить условие `selectedId === BUFFER_COLLECTION_ID` для move/canMutate в **Studio и кабинете** (оба дома, один смысл).
2. Прогнать ручной сценарий: набор A → набор B; убедиться, что `moveTargets` не предлагает A/буфер/системные.
3. Подтвердить тексты «переносится…» / «перенесено в X» на пути набор→набор.
4. Проверить флаг/смысл «разобрано руками» после ухода из именованного набора.
5. Регрессия: буфер→набор и запрет тарифа/same-collection на сервере не сломаны.
6. Короткий отчёт в PR/описании: до/после предиката + оба дома.

## Definition of Done (фокус)
- [ ] В пользовательском наборе (не буфер) доступен перенос в другой пользовательский набор (Studio).
- [ ] То же поведение в кабинете (близнец).
- [ ] Статус-копирайты паритетны буфер→набор.
- [ ] «Разобрано руками» сохраняется после набор→набор.
- [ ] Буфер→набор и серверные запреты (тариф, same) без регрессии.
- [ ] Нет нового условия, завязанного только на `BUFFER_COLLECTION_ID` для mutate move.
- [ ] PR/фиксация с проверяемым сценарием A→B.

## Сознательно не делаем сегодня
- Закрытие гейта `secret-parser-built` как primary (резак+манифест+amnesty) — горизонт, не слово владельца 31.08.
- Три L из DAY_PLAN параллельно: `angelina-hostess-impl` · `assets-container` · `batch-collection-run-contour`.
- `detector-scoreboard` / буфер CURRENT_TASK, FFT «Этап 1.A», повтор free-v1 DSP-бенчмарков.
- Недельная стратегия (`weekly-strategy-frozen`); feature-разворот oversized/worktree #2238.
- Добивка `night-procedure-frames` n1+n2 / n4 / n5 как ствол дня (вчерашний выбор; сегодня сменён).
- Состав ночной сводки (открытая развилка владельца) — не разворачивать без choose.
- Self-hosted Sentry / пятничное дежурство как primary.

## Вторично (если останется время)
1. Диагноз красного `@membrana/background-media#test` (с 27.08) — issue или явный pre-existing.
2. Ревью-дожим #2244 (разметка; блокер уже починен).

## Зависимости и риски
- Риск «починить один дом» — обязательны близнецы Studio + cabinet.
- Риск сломать ценность/«разобрано руками» при move — проверить до merge.
- Расхождение ритуальных документов (стендап = secret-parser, assertions = sample-move): не перечеканены assertions/standup под один фокус — путаница агентов; не замалчивать.
- Не уходить в «написать резак» — `secret-redact` уже есть; это другой контур.

## Ссылки
- `docs/DAILY_STANDUP.md` (2026-08-31)
- `docs/tasks/main-day-assertions.json` → `sources[0]` (owner-choice 31.08)
- `docs/STRATEGY_DAY.md` (веха `secret-parser-built`, контекст, не primary)
- `docs/DAY_PLAN.md` (top-3 без owner-choose)
- `apps/client/src/modules/SampleLibraryModule.tsx` (canMutate / BUFFER_COLLECTION_ID)
- `scripts/lib/secret-redact.mjs` (не primary; retired wrong-address 03.08)