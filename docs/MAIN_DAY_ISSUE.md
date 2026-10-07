<!-- Сгенерировано: 2026-10-07T11:42:03.851Z (yarn main-day-issue@e725baff) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"76351be0372cd4420233df7db652835a70a92781","digest":"fdd1689d0ec9ea4aa8c07e1ef1de03806439bc579a535bdf4f34ef4af2c6ca4f","versionAt":"2026-10-06T12:57:44+03:00"},"DAILY_STANDUP":{"version":"a1cd48712a88885d09a91f7f82c2843b4dde6dfe","digest":"59829bca1c96e120bb59b124e3fcab300e40034a89e58539465d84ae92845882","versionAt":"2026-10-06T13:18:42+03:00"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-07

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа с заморозкой: b3a/b3b + b4/b6 в ствол, путь к выкатке |
| `githubIssue` | #2599 / #2603 / #2604 / #2605 (конвейер блока) |
| `size` | L |
| `promptPath` | — (эпик в конвейере sprint-cut; owner-choice вне топ-3 реестра) |
| `сгенерировано` | 2026-10-07 |

## Магистраль

Владелец 06.10 зафиксировал: магистраль прежняя — **понижение тарифа с заморозкой** (`tariff-downgrade-freeze`), ручной выбор вне топ-3 кандидатов реестра; «продолжаем вчерашние задачи, часть — Codex». На утро 07.10 в стволе уже b0+b1+b2 блока 1 (#2593, #2594) и b1+b2+b3 блока 2 (#2592, #2595, #2596); перерезка b3→b3a/b3b ратифицирована 06.10 с двумя named findings зуба плана (прецедент, долг инструмента #2601).

**Шаг дня:** довести **b3a/b3b** и **b4/b6** до ствола; **b5** — только после b3a. В конвейере: #2604 (b3a store/preview/freeze), #2605 (перерезка), #2599 (панель «Пользователи» b4), #2603 (крон уборки b6). К выкатке обязательны: живой прогон миграций, `CABINET_OFFICE_TOKEN`, сверка `LIVE_SERVICES`.

**Критерий успеха к вечеру:** b3a и b4/b6 либо в стволе с раскрытым diff и typecheck/lint по затронутым пакетам, либо с явным блокером и именованной находкой; ADR-0031 лежит файлом в стволе (иначе merge по freeze-контуру остаётся без письменной санкции); post-condition b3a (`sum(active buffer bytes) ≤ bufferLimitBytes`) проверен по `git show` #2604.

## Подкрепление

- **Закрыть документальный долг ADR-0031:** положить `docs/adr/ADR-0031-downgrade-archive.md` в ствол с вердиктами 1–6 консилиума 05.10 и LGTM Vesnin — три дня расхождения канон/ствол блокируют честный старт b3–b5 и любой merge, касающийся freeze-контура.
- **Письменный триаж 4 CVE + верификация ребра office→cabinet:** Codex/Dynin — вердикт runtime/dev по `@fastify/busboy` ×2, `braces`, `http-cache-semantics`; Vesnin+Ozhegov — `git show 6f87dc45 -- packages/background-office` (C1/C9 по #2596 MERGED). Runtime-находка CVE блокирует следующий merge в ствол.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак в `night-triage-secret-scan.mjs` + один датированный проход с манифестом ротации) снимет амнистию на правку архива и откроет работу с историческими сессиями.
- Закрытие b5 после b3a и живой вызов office→cabinet (вещдок «до b7» в LIVE_SERVICES) завершат контур выкатки freeze-тарифа.
- Дисциплина oversized PR (8/16 вчера) — правило split в CONTRIBUTING.md до следующего цикла merge, чтобы b-серия не копила нераскрытые диффы.

## Экспериментальные

- Проба: запустить `night-triage-secret-scan.mjs` на одном реальном session-архиве в режиме «только резак» — узнать, режет ли агрессивно или пропускает граничные паттерны.
- Проба: один датированный проход с манифестом ротации засвеченных ключей на mock-данных — проверить однозначность сопоставления ключ↔дата ротации.
- Проба: прогнать бэкап сессии через парсер и сверить, попадает ли `chat_id` сторожа (ловушка 24.08) в список вырезаемых паттернов.

## Санитарные

- `ADR-0031-downgrade-archive.md` не в стволе третий день — положить файлом с LGTM Vesnin
- Письменный триаж 4 CVE (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — runtime/dev вердикт в `docs/security/` или issue-комментарий
- Верификация C1/C9 по #2596: `git show 6f87dc45 -- packages/background-office`
- Раскрыть diff #2604 (b3a) и #2603 (sweep): post-condition буфера; C7-тесты рядом
- Дисциплина oversized PR: 8 из 16 вчера — зафиксировать правило split в процессе
- `root:null` в `procedure-runs` при `fail` — сделать поле обязательным, убрать слепой ретрай без диагноза
- `.env.example`: предупреждение о порядке `COLD_ARCHIVE_SWEEP_ENABLED` / `DRY_RUN`

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = понижение тарифа с заморозкой; шаг — b3a/b3b + b4/b6 до ствола, b5 после b3a | сессия | `main-day-assertions.json` → `sources[0].claim` (owner-choice@chat/magistral-06-10-manual) | 2026-10-06 |
| Тот же выбор зафиксирован гейтом утра как `tariff-downgrade-freeze` | снимок-хардкод | `morning-gates-state.json` → `magistral` / `magistralManual.chosen` | 2026-10-06 |
| Свежесть гейта: day гейта ≠ day прогона → выбор не сегодняшний; расхождением У1 не считается; assertions не перечеканены на 07.10 | код | предикат `magistralFreshness` (проекция assertions: `no_gate`) | 2026-10-07 |
| Топ-3 реестра (angelina-hostess-impl / assets-container / chart-list-plugin) — кандидаты при отсутствии owner-choice; **не** перекрывают sources[0] | план | `DAY_PLAN.md` / `DAILY_STANDUP.md` (детерминированный ранг) | 2026-10-07 |
| P1: ADR-0031 отсутствует в стволе третий день — блокер честных merge freeze-контура | сессия | `DAILY_CODE_REVIEW.md` 2026-10-06 (Vesnin) | 2026-10-06 |
| P1: C1/C9 #2596 и 4 CVE без письменного триажа — блокеры следующего merge | сессия | `DAILY_CODE_REVIEW.md` 2026-10-06 | 2026-10-06 |
| Веха горизонта `secret-parser-built` (approaching) — поддерживающий контур, не смена магистрали | план | `STRATEGY_DAY.md` / `day-horizon.json` #592 | 2026-10-07 |
| Owner-кристаллы: парсер режет агрессивно; секреты до бэкапа; biweekly rotation | сессия | `truth/registry.json` → `secret-parser-cuts-aggressively`, `session-backup-requires-secret-redaction`, `credential-rotation-biweekly` | 2026-07-17 |

**Счёт голосов по различным первоисточникам:** owner-choice 06.10 (assertions + gate = **1 источник, 2 отражения**) задаёт магистраль. Ревью 06.10 и горизонт #592 — независимые источники **контекста раскрытия** (санитария / веха), не альтернативы выбору владельца. Топ-3 плана/стендапа коррелированы между собой как снимок ранга реестра (**1 источник, N отражений**) и уступают owner-source, пока `sources[0]` задан.

## Посылки

Развилки A/B нет — работа продолжается по owner-choice «прежняя магистраль»; посылок о «работы ещё нет» не требуется.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Эпик freeze жив в конвейере (b3a/b4/b6 не финализированы в стволе как закрытый контур выкатки) | issue:#2604, issue:#2599, issue:#2603 + file:docs/adr/ADR-0031-downgrade-archive.md (ожидается в стволе) | unknown (ADR-файл — проверить наличием в tree; PR в конвейере — по merge-status) |
| Ребро office→cabinet объявлено, живой вызов до b7 не подтверждён | file:docs/LIVE_SERVICES.md (`CABINET_OFFICE_TOKEN`) | holds (декларация есть; live-call — отдельный шаг выкатки) |

## Сегодня делаем

1. **b3a (#2604):** раскрыть diff (`git show c5c01a65 -- packages/background-media`), подтвердить post-condition `sum(active buffer bytes) ≤ bufferLimitBytes`, typecheck/lint, довести merge в ствол (или именованный блокер).
2. **b4 (#2599) / b6 (#2603):** раскрыть oversized-диффы, C7-тесты у sweep-scheduler, флаги cold-archive в `.env.example` с порядком включения; merge либо явный split.
3. **ADR-0031** файлом в ствол с LGTM Vesnin — снять расхождение канон/ствол третьего дня.
4. **C1/C9 #2596:** `git show 6f87dc45 -- packages/background-office` — результат в комментарий/doc.
5. **Триаж 4 CVE** письменно (runtime vs dev); runtime → стоп merge.
6. **b5** не стартовать до merge b3a; к выкатке — чеклист: миграции live, `CABINET_OFFICE_TOKEN`, сверка `LIVE_SERVICES`.
7. **Перечеканка `main-day-assertions.json`** на 07.10 — в первое окно после P1 (стендап отложил до слова/окна; assertions date=06.10 при day=07.10).

## Definition of Done (фокус)

- [ ] b3a (#2604) в стволе **или** именованный блокер с named finding; post-condition буфера проверен по diff
- [ ] b4 (#2599) и/или b6 (#2603) в стволе **или** осознанный split с правилом oversized
- [ ] `docs/adr/ADR-0031-downgrade-archive.md` существует в стволе, LGTM Vesnin
- [ ] C1/C9 по #2596 верифицированы записью (комментарий/doc)
- [ ] 4 CVE — письменный вердикт runtime/dev; runtime-находка = merge заблокирован
- [ ] `yarn turbo run typecheck lint --filter=@membrana/background-office` (и media/cabinet по факту диффа) — зелёные
- [ ] b5 не начат при открытом b3a; чеклист выкатки (миграции, `CABINET_OFFICE_TOKEN`, LIVE_SERVICES) составлен или частично пройден
- [ ] Вечер: факт прогресса freeze-контура в протоколе, без «механического зелёного» (B3)

## Сознательно не делаем сегодня

- DSP-бенчмарк harmonic/cepstral/flux на free-v1 / «Этап 1.A» — потолок зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6)
- Недельная стратегия — кристалл `weekly-strategy-frozen`
- `mfcc-compare-sprint` как магистраль — поддерживающая полоса
- Смена магистрали на топ-3 (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) без нового owner-choice
- Старт b5 до закрытия b3a
- Полноценный пилот бэкапа сессий до гейта `secret-parser-built` (резак + манифест)

## Вторично (если останется время)

- Проба резака `night-triage-secret-scan.mjs` на одном архиве / mock-манифест ротации (вклад в `secret-parser-built`)
- Правило oversized PR → черновик абзаца в CONTRIBUTING.md

## Зависимости и риски

- **Блокер:** ADR-0031 не в стволе → любой merge freeze-контура без письменной санкции (P1, третий день)
- **Блокер:** runtime-CVE без триажа → следующий merge в ствол
- **Риск:** 8 oversized PR — merge без раскрытого diff повторяет вчерашний антипаттерн; C1/C9/C7 остаются «на честном слове»
- **Риск:** assertions/gate day=06.10 при календарном 07.10 — без перечеканки probe/ритуал могут спорить о свежести; содержание выбора владельца при этом однозначно (`tariff-downgrade-freeze`)

## Ссылки

- `docs/DAILY_STANDUP.md` — 2026-10-07
- `docs/DAY_PLAN.md` — 2026-10-07
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built`
- `docs/DAILY_CODE_REVIEW.md` — 2026-10-06
- `docs/tasks/main-day-assertions.json` — sources[0] owner 06.10
- `docs/tasks/morning-gates-state.json` — `magistral: tariff-downgrade-freeze`
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — §6 (не-магистраль DSP)