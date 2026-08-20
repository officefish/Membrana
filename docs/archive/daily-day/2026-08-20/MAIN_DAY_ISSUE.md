<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-20
  archived-at: 2026-08-20T17:44:40.091Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-20T06:16:38.376Z (yarn main-day-issue@c0d7ca31) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"c0d7ca31f38873c5b4e11d1b1070e6bbace0a423","digest":"9b841e70883aaaa517696fb2fc07e5691d8ac060276e0d28a1bf909f67f0883e"},"DAILY_STANDUP":{"version":"c0d7ca31f38873c5b4e11d1b1070e6bbace0a423","digest":"9226aad56060f583952b631d375b8652bc447b67ada22e96b2ef26b8978c17da"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: capture-sidecar-protocol, plugin-results-payload-pocket, plugin-results-bridge, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-20

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `firebat-node-device` |
| `primaryTitle` | Узел Firebat как устройство — исходящий канал к серверу, права через установку приложения |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | docs/prompts/FIREBAT_NODE_DEVICE_PROMPT.md |
| `сгенерировано` | 2026-08-20 |

## Магистраль

**Магистраль дня — `studio-firebat-user-pairing` (L).** Источник: owner-choice утреннего гейта 20.08 из замороженного топ-3 (слово владельца 19.08 вечером: «взаимодействуем не через скрипты, а через электрон-приложение с авторизацией из-под конкретного пользователя; датасет — как набор конкретного пользователя; ключи выдаёт кабинет — уже умеет»).

Вчера закрыт `firebat-node-device` 7/7 (первая запись узла по заданию с сервера — `89e428ba`). Сегодня — пользовательский путь: **Studio на Firebat** (установщик собран 19.08), вход пользователем, **парринг устройства ключом из личного кабинета**, первые записи — в набор пользователя. По дороге: сверить словари «ключ узла (NodeKey)» и «ключ парринга кабинета» — решением, не молчанием.

**Критерий успеха к вечеру:** датированный вещдок (docs/ или PR): Studio стоит на Firebat, устройство связано ключом из кабинета, хотя бы одна запись лежит в наборе конкретного пользователя.

**Подкрепление №1 (отдельной сессии):** `results-bridge-tails-mfcc-probe` — добить b6–b7 моста результатов + первая проба mfcc на записи 89e428ba (разблокировка mfcc-compare).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `firebat-node-device`: узел как устройство с исходящим каналом и правами через установку | `sources[0].claim` в `docs/tasks/main-day-assertions.json` | Слово владельца, сессия `chat/magistral-19-08` | 2026-08-19 |
| Ступень 1 (узел пишет и отправляет) закрыта 18.08; сегодня — исходящий канал | `docs/DAILY_STANDUP.md` (роутинг Структурщика, задача `firebat-node-device`) | Стендап 2026-08-20, входы из реестра | 2026-08-20 |
| Узел за вторым роутером — вход снаружи закрыт, канал обязан быть исходящим | Слово владельца 18.08 («SSH — для отладки лабораторных») | `sources[0].claim`, verbatim | 2026-08-19 |
| `sources[0]` и `morning-gates-state.json` не расходятся по дате — расхождение У1 не применяется | `docs/tasks/main-day-assertions.json`, `sources[0].date = 2026-08-19` | `main-day-assertions.json` | 2026-08-19 |
| Стендап называет `firebat-node-device` в роутинге Структурщика как ведущую задачу | `docs/DAILY_STANDUP.md` | 1 источник, отражение реестра | 2026-08-20 |
| `DAY_PLAN.md` называет `firebat-node-device` кандидатом, но не назначает магистраль | `docs/DAY_PLAN.md` | 1 источник, отражение топ-3 генератора | 2026-08-20 |

> **Итог подсчёта голосов:** два различных первоисточника (слово владельца 19.08 + реестр/стендап как его отражение). Стендап и план — одно отражение реестра, их суммарный вес равен весу одного. Владельческое слово — единственный независимый первоисточник и берётся без синтеза.

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Исходящий WebSocket/HTTP-клиент узла Firebat к серверу не реализован | `symbol:FirebatOutboundChannel` в `packages/**` и `apps/**` | unknown — проверить `yarn main-day-probe` перед стартом кода |
| Задача планировщика Windows для автозапуска приложения узла не существует | `file:scripts/firebat-service-install.ps1` — файл есть (b5), но extraResources в NSIS не вшиты | holds по части extraResources; канал — отдельная посылка |

> Посылка об исходящем канале имеет статус `unknown` — маркер `symbol:FirebatOutboundChannel` требует живой проверки (`yarn main-day-probe` или `git grep`). Если символ найден — посылка `violated`, день переходит в режим «доработать/принять», а не «написать с нуля». Это обязательная проверка **до** старта кода.

## Сегодня делаем

1. Прогнать `yarn main-day-probe` (или `git grep FirebatOutboundChannel`) и зафиксировать вердикт посылки — «пишем с нуля» или «дорабатываем существующее».
2. Реализовать (или довести до рабочего состояния) исходящий клиент узла: WebSocket или HTTP long-poll от Firebat к `background-office`, с exponential backoff при разрыве.
3. Убедиться, что сервер принимает поток и пишет в лог хотя бы один span с `sourceNodeId` Firebat, датированный сегодня.
4. Добавить вызов `redactSecrets()` из `scripts/lib/secret-redact.mjs` в точку сохранения бэкапа в `night-triage-secret-scan.mjs` и провести датированный проход — закрыть веху `secret-parser-built`.
5. Вынести вердикт (LGTM или BLOCK) по PR `#1981` (`plugin-results-bridge b1+b2`); по оставшимся пяти PR — хотя бы краткий статус «просмотрен / заблокирован чем».
6. Назвать словом решение по `mfcc-compare-sprint` — проба на `89e428ba` сегодня или явный перенос с датой.

## Definition of Done (фокус)

- [ ] `yarn main-day-probe` (или `git grep`) дал явный вердикт по посылке `FirebatOutboundChannel` — holds или violated, зафиксировано текстом.
- [ ] Исходящий канал узла Firebat к серверу работает: соединение устанавливается без SSH-туннеля.
- [ ] После намеренного разрыва соединение восстанавливается автоматически (exponential backoff подтверждён в логе).
- [ ] В логе сервера или в `docs/archive/daily-day/` зафиксирован минимум один span с `sourceNodeId` Firebat, датированный 2026-08-20.
- [ ] Веха `secret-parser-built`: `redactSecrets()` вызывается из `night-triage-secret-scan.mjs`, датированный проход завершён, manifest ротации записан.
- [ ] По PR `#1981` зафиксирован явный вердикт (LGTM или BLOCK с именованным блокером).
- [ ] Решение по `mfcc-compare-sprint` названо словом (проба сегодня или дата переноса).

## Сознательно не делаем сегодня

- **`server-plugin-foundation` (шторм + код)** — не открываем до LGTM по 6 oversized-PR; шторм поверх неревьюированного контура создаёт архитектурный конфликт.
- **`mfcc-compare-sprint` (исполнение)** — не входим в код: PR #1951 и #1953 без принятого ревью, корпус считается недостоверным; сегодня только называем решение словом.
- **DSP-бенчмарк harmonic/cepstral/spectral-flux на free-v1** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); без смены датасета или fusion повтор не добавляет информации.
- **`angelina-hostess-impl` и `assets-container`** — кандидаты топ-3 19.08, не выбранные владельцем; в работу не берём.
- **`batch-collection-run-contour`** — старт только после консилиум-гейта по модели исполнения, который не проведён.

## Вторично (если останется время)

- Проверить статус `@membrana/background-media#test` после вчерашних merge'ей и закрыть или эскалировать с диагнозом.
- Подтвердить, что CI-метрика `RAG_ACCEPTANCE_TIMING_MS` записана в ряд (`rag-service#test` зелёный вчера).

## Зависимости и риски

- **Блокер 1:** Посылка `FirebatOutboundChannel` имеет статус `unknown` — если символ уже существует, день переходит в режим «принять», а не «написать»; проверка обязательна до старта.
- **Блокер 2:** Ревью `#1981` может обнаружить нарушение контракта M3 (`адрес = pluginId + mountTarget`, не module-сегмент) — тогда часть дня уйдёт на исправление формы; это лучше, чем мёрджить дефект.
- **Риск:** Веха `secret-parser-built` третий день не закрыта — если сегодня снова не пройдёт, требуется эскалация: фиксировать конкретный диагноз (что именно мешает вызову `redactSecrets()`), не просто перенос.
- **Риск:** `@membrana/background-media#test` без явного статуса — красный тест блокирует merge `angelina-hostess-impl` и `assets-container`; проверить хотя бы статус, даже если сами карточки не в магистрали.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-08-20
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня, топ-3 кандидатов
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — `sources[0]`, волеизъявление владельца 19.08
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, ограничения DSP
- [STRATEGY_DAY.md](docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`