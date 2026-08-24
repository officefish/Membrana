<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-24
  archived-at: 2026-08-24T18:08:54.309Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-24T06:50:55.777Z (yarn main-day-issue@e8bb5733) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"1b4f067e7384845025cae4ed9a489b8ad7065ef1","digest":"cad7aa3a06cc0a744a1161557960f23fec06acf831b8f0465a52d791155affdd"},"DAILY_STANDUP":{"version":"1b4f067e7384845025cae4ed9a489b8ad7065ef1","digest":"9142a68d66a54e69ccee5e84230686c86677bb43e9bef16066163add7beb5d04"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-24

<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"DAILY_STANDUP":{"digest":"standup-2026-08-24"},"STRATEGY_DAY":{"version":"1b4f067e7384845025cae4ed9a489b8ad7065ef1"},"DAY_PLAN":{"canon-digest":"e29394fc745205b84db9ec24eccfd2c303852bb59935c237c6ead59f5b7b8817"}}} -->
<!-- Сгенерировано: 2026-08-24 (yarn main-day-issue / Teamlead Tarasov) -->

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `none` (фокус вне реестра: боевая авария журнала) |
| `primaryTitle` | Снять квадратичность журнала: append → refresh без полного rescan ленты |
| `githubIssue` | #2113 |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-08-24 |

## Магистраль

Снять квадратичность журнала (#2113): путь **append → refresh** не перечитывает всю ленту на каждую пробу. Ночное дежурство 23.08 упёрлось в боевую аварию — каждая запись тянет полный обход страниц при серверном `take` до 5000 и склейке в памяти; разбор зафиксирован в `docs/field/2026-08-23-night-duty-journal-congestion.md`. #2086 честно развёл витрину и порт проверки задания, но живой контур дежурства от этого не стал линейным.

**Owner-assertions протухли** (`sources[0]` = firebat-node-device, 19.08); свежего `morning:gate` / `--choose` на 24.08 во входах нет. Синтез L из top-3 плана (hostess / assets / batch) запрещён стендапом. Магистраль дня — **оперативный мандат стендапа** по аварии, не «додуманный» L-эпик и не повтор stale firebat без нового choose.

**Критерий к вечеру:** один проверяемый инкремент (контракт списка / курсор **или** потолок без полного rescan) + воспроизводимый before/after по меркам из field-дока.

## Подкрепление

- Зафиксировать и не размывать контракт «витрина ≠ порт проверки» (#2086): любой патч refresh/append опирается на уже разведённые порты, не склеивает их обратно ради удобства UI.
- P1-ревью OPEN oversized #2096 через `yarn code-review:pr` — рядом с магистралью, **не вместо** неё; ловит перегруз PR-поверхности, пока режется горячий путь журнала.

## Перспективные

- Проход вехи `secret-parser-built` (резак + датированный манифест ротации) — снятие амнистии на правку архива и безопасный бэкап сессий.
- Owner-choice по форме журнала (буфер · наборы · архив) — разблок настоящего `journal-home-real` вместо монтирования в `background-media/collections`.
- Живой smoke Firebat «первый трек → 48 kHz или fail-closed» и исходящий канал узла — после свежего choose, не как тихая подмена фокуса.

## Экспериментальные

- Фикстурный прогон `night-triage-secret-scan` + redact на одном транскрипте-заглушке с ключом-маркером — режет цепочка или только детектит.
- Прогон имеющегося анализатора (кепстр/автокорреляция) на паре «шлифмашинка vs моторный фрагмент» из сеанса 21.08 — есть ли разделимый признак без нового DSP.
- Dated dry-run манифеста ротации на ключе-заглушке (без реального revoke) — хватает ли формы манифеста под гейт `secret-parser-built`.

## Санитарные

- перечеканка `main-day-assertions.json` (протух 19.08 → не перечеканен к 23–24.08) — санитарный долг; риск устаревшего owner-choice
- P1-ревью OPEN oversized #2096 (`yarn code-review:pr`)
- выборочный bug-pass merged oversized: #2091 / #2093 / #2088
- протокол живого smoke Firebat: первый трек → 48 kHz или fail-closed (дыра DoD, хвост #2046)
- фикстурный прогон secret-scan/redact на транскрипте-заглушке — диагностика резака к вехе `secret-parser-built`

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Фокус дня: снять квадратичность журнала #2113 (append→refresh без полного rescan) | сессия | `docs/DAILY_STANDUP.md` ← field `docs/field/2026-08-23-night-duty-journal-congestion.md` + GH #2113 | 2026-08-23/24 |
| Ночная авария: каждая запись → полный обход страниц, `take` до 5000, склейка в памяти | код / issue | field-док ночного дежурства 23.08 + #2113 | 2026-08-23 |
| #2086 развёл витрину и порт проверки, но контур дежурства не линеен | issue | GH #2086 (контекст стендапа) | 2026-08 |
| Stale owner-source: `sources[0]` = firebat-node-device | снимок-хардкод | `docs/tasks/main-day-assertions.json` → owner-choice@chat/magistral-19-08 | 2026-08-19 |
| **Расхождение: assertions не перечеканены; свежего gate-magistral на 24.08 нет** | план / сессия | DAY_PLAN «магистраль НЕ назначена» + sanitary «протух 19.08»; У1 без сегодняшнего `morning-gates-state.magistral` | 2026-08-24 |
| Не синтезировать L из top-3 (hostess / assets / batch) без слова владельца | план | `docs/DAY_PLAN.md` + стендап «сознательно не делаем» | 2026-08-24 |
| Не делать день L-осью firebat без нового choose | сессия | стендап «сознательно не делаем» (не отменяет stale sources, блокирует тихий синтез) | 2026-08-24 |
| Веха горизонта `secret-parser-built` — approaching, не primary | план | `docs/STRATEGY_DAY.md` / `day-horizon.json` | 2026-08-24 |
| Не магистраль: Этап 1.A / benchmark harmonic+cepstral+flux | код | `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; `detection-planning-priorities.mjs` | 2026-06-14 / канон |

**Голоса по различным первоисточникам:**

1. **Ночная авария журнала** (field 23.08 + #2113 + стендап 24.08) — **1 источник, 3 отражения** → оперативный мандат дня.
2. **Owner assertions 19.08 firebat** — 1 источник, протух; не перечеканен; без today-gate по У1 не перекрывает аварию и не назначается заново «из инерции».
3. **План top-3 без choose** — 1 источник: «магистраль не назначена планом»; усиливает запрет синтеза L.
4. **FFT §6 / anti-1.A** — 1 источник: только вето на ложную детекционную магистраль.

Итог: единственный свежий независимый мандат — линеаризация журнала #2113. Stale firebat и top-3 без owner-choice в таблицу как находка и границы, не как primary.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Путь refresh журнала после append перечитывает/склеивает ленту целиком (квадратичный рост под дежурством) | `file:docs/field/2026-08-23-night-duty-journal-congestion.md` + issue #2113 | `holds` (по field-разбору; символ-потолок/курсор — цель дня) |
| Работа «ввести курсор/потолок без full rescan» ещё не закрыта как проверяемый инкремент дня | issue #2113 open + отсутствие вечернего before/after в field-доке | `holds` до появления инкремента |
| Owner-магистраль firebat актуальна как выбор «сегодня» | `sources[0].date == 2026-08-19` при today 2026-08-24 | **violated по свежести** — ПОСЫЛКА НАРУШЕНА как основание primary; только sanitary recut |

Развилка A/B эпиков (hostess vs assets vs batch vs firebat) **не открыта** словом владельца сегодня → в primary не берём. Посылок «работы нет» по L-эпикам не требуется.

## Сегодня делаем

1. Воспроизвести замер before из `docs/field/2026-08-23-night-duty-journal-congestion.md` (страницы / `take` / время refresh на N append).
2. Ввести один инкремент на горячем пути: **курсор/continuation** или **жёсткий потолок без full rescan** (контракт списка), без UI «дома журнала».
3. Прогнать after-замер тем же сценарием; записать цифры next to before (field-док или приложение к #2113).
4. Не смешивать витрину и порт проверки задания (#2086) в одном API-ответе «на всякий случай».
5. P1-ревью #2096 — заметка/вердикт, не блокер мержа инкремента журнала.
6. Санитарно: очередь на перечеканку `main-day-assertions.json` (факт протухания зафиксирован в этом MAIN_DAY_ISSUE).

## Definition of Done (фокус)

- [ ] Горячий путь append → refresh не делает полный обход всей ленты на каждую пробу
- [ ] Есть явный контракт: курсор/continuation **или** потолок размера выборки без server `take`→склейка «до 5000» как единственной модели
- [ ] Before/after по метрикам из field-дока 23.08 воспроизводимы одним сценарием
- [ ] Витрина и порт проверки задания остаются разведены (#2086 не откатан)
- [ ] Нет нового UI «journal-home» / нарезки «буфер · наборы · архив» без письменного «да» владельца
- [ ] #2113 обновлён фактом инкремента (комментарий или PR-ссылка)
- [ ] Регрессия: дежурный сценарий (серия append) не деградирует до квадратичного wall-time на проверяемом N

## Сознательно не делаем сегодня

- Не назначаем магистралью `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без owner-choice
- Не продолжаем L-ось `firebat-node-device` как primary без нового choose (stale sources[0] — перечеканить, не «додумать»)
- Не верстаем и не нарезаем `journal-home-real` / форму «буфер · наборы · архив»
- Не закрываем веху `secret-parser-built` правкой архива и не снимаем амнистию «с плеча»
- Не поднимаем «Этап 1.A» / benchmark harmonic+cepstral+flux на free-v1
- Не делаем день повторной калибровкой FFT-порогов или OR-live DSP

## Вторично (если останется время)

1. Фикстурный прогон secret-scan/redact на транскрипте-заглушке (диагностика к `secret-parser-built`).
2. Черновик манифеста ротации (даты, контуры, biweekly) без revoke и без правки архива.

## Зависимости и риски

- **Риск расползания:** «раз уж журнал» → UI дома журнала / hostess / assets — блокер фокуса; держать только горячий путь append/refresh.
- **Stale owner-source:** assertions 19.08 vs оперативный фокус 24.08 — перечеканка обязана, иначе probe/ритуал снова кормят firebat-инерцией.
- **#2096 oversized** может отвлечь ревью-ресурс; лимит — P1-заметка, не день ревью.
- **Блокер данных:** без before/after по field-меркам инкремент нельзя честно принять.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md)
- [docs/DAY_PLAN.md](./DAY_PLAN.md)
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md)
- [docs/field/2026-08-23-night-duty-journal-congestion.md](./field/2026-08-23-night-duty-journal-congestion.md)
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json)
- GitHub #2113 · #2086 · #2096
- [docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) §6 (вето на Этап 1.A)