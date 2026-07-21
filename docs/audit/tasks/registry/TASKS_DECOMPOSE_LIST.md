# TASKS_DECOMPOSE_LIST — реестр декомпозиции задач

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Head SHA | ad474e688417722792a92cee05a1b1f22b7cd4ad |
| Source | yarn tasks:decompose --report |
| Config | scripts/tasks-decompose.config.json |
| Active | 176 |

## Summary

| № | Категория | Карточек | Доля | Примеры |
|---|-----------|----------|------|---------|
| 1 | Детекция и качество распознавания | 29 | 16% | `detector-scoreboard`, `scoreboard-spectral-ladder`, `scoreboard-dataset-ladder`, … |
| 2 | Device Board — сценарный редактор и runtime | 59 | 34% | `device-board-hackathon-1`, `db-h1b-board-shell`, `db-h1c-graph-serialize`, … |
| 3 | Платформа, кабинет, продуктовая витрина | 15 | 9% | `membrana-device-build-profile`, `grp4-graphify-gated`, `grp3-research-tree-gated`, … |
| 4 | Ритуалы и контур достоверности команды | 34 | 19% | `angelina-hostess-impl`, `linear-hygiene-dreams-providers-night`, `ritual-r-report`, … |
| 5 | Агентский тулинг, CI и техдолг | 27 | 15% | `scripts-boundary-container`, `agent-tooling-friction-3`, `opencode-proxy-sprint-2026-06-25`, … |
| 6 | Партнёры и внешние коммуникации | 7 | 4% | `swallow-delivery-idempotency`, `ally-swallow-editorial-gate`, `partner-tutorials`, … |
| 7 | Ресёрчи — входы для решений | 5 | 3% | `linear-agent-identity-facts`, `team-accountability-metrics`, `generated-docs-quality-criteria`, … |
| | **Итого** | **176** | 100% | распределено 176 |

## Детекция и качество распознавания (29)

- `detector-scoreboard` [L] — Витрина качества детекции: плагин модуля микрофона + панель
- `scoreboard-spectral-ladder` [M] — Ф2: лестница спектрального детектора из наших 253 звуков
- `scoreboard-dataset-ladder` [M] — Ф3: четыре набора из внешнего массива с дедупом обеих сторон
- `scoreboard-neural-ladder` [M] — Ф4: лестница нейросети на четырёх наборах
- `scoreboard-panel-publish` [S] — Ф5: публикация таблицы на панель mmbrn.tech
- `dads-benchmark-bridge` [M] — Мост DADS в бенчмарк: пресет в прогоне, дедуп обеих сторон, метрики без приора
- `detector-metrics-characterization` [L] #565 — detector-metrics-characterization: паспорт детектора (ROC/AUC/CI/EER) в Контроле качества — ответ на спарринг Alex
- `real-dataset-live-calibration` [L] #47 — Real dataset v0.2: библиотеки → анализ → live matching → journal parity (неделя)
- `trends-fft-template-editor` [L] #57 — Редактор пользовательских шаблонов trends-fft
- `live-parallel-detection-sprint` [L] — Параллельный live-анализ: stream modes drone + FFT → журнал (LP1–LP4)
- `lp1-mic-drone-stream-modes` [L] — LP1: stream modes + краткий brief report (client)
- `lp1b-drone-detailed-report-server` [M] — LP1b: подробный DDR по запросу на сервер (brief → detail API)
- `lp2-fft-plugins-journal-sink` [M] — LP2: fft-threshold + trends-fft → LiveJournalService
- `lp3-track-import-backpressure` [M] — LP3: track-import режим, очередь и regression DDR
- `lp4-parallel-detection-smoke` [S] — LP4: SLO-тесты, docs, paired smoke
- `lp5-journal-report-renderers` [M] — LP5: журнальные рендеры FFT-порог/тенденции (client+cabinet) + фикс live-дрона
- `neural-tier-1b-contract` [L] #47 — Neural tier 1.B: NeuralDetector контракт + YAMNet/CLAP skeleton
- `neural-free-tier-dataset-report` [L] — Free-tier: датасет + трек → детектор → отчёт (1 ГБ library)
- `vdr-hard-gate` [L] #47 — Epic: VDR-Hard-Gate — пилот валидации (30–35), плагин микрофона «VDR-валидация», trends benchmark 85/90 (HG1–HG4)
- `vdr-hg3-trends-benchmark` [M] #47 — HG3: benchmark trends на пилоте (канон метрик) + сравнение с template-match v0.1; плагин зеркалит числа
- `vdr-hg4-hard-gate-report` [S] #47 — HG4: отчёт hard-gate (DATASET_CURATION) + WHITE_PAPER §8 + ARCHITECTURE §1e + решение по критерию приёма
- `vdr-label-roundtrip-night-build` [M] — Night Build: VDR label round-trip — разметка пилота через клиентскую библиотеку (NB0–NB4)
- `nb-vlr-0-gate` [XS] — NB0: gate — baseline scoped CI + фиксация модели хранения библиотеки
- `nb-vlr-1-labels-export-ui` [S] — NB1: кнопка «Экспорт меток (JSON)» коллекции в SampleLibraryModule
- `nb-vlr-2-labels-merge-script` [S] — NB2: yarn vdr:labels-merge — merge меток в манифест пилота + --labels-only для intra-rater
- `nb-vlr-3-library-label-filter` [S] — NB3: фильтр по метке + счётчик прогресса в клиентской библиотеке (порт HG1-UX)
- `nb-vlr-4-docs` [XS] — NB4: DATASET_CURATION §Пилот — операторский путь разметки через библиотеку + round-trip
- `detection-alarm-loop-refactor` [L] — Detection-Alarm рефакторинг переключения лупов: fusion→lastDetection+front+loop-transition-policy (тема1), effectiveLoop-sync/захват-гейтинг (ADR Р1/Р2), pure-геттеры, Alpha L36
- `batch-collection-run-contour` [L] #494 — batch-collection-run-contour: прогон детекторов по коллекции — новая execution-модель live↔batch (пост-FREE, следующий цикл)

## Device Board — сценарный редактор и runtime (59)

- `device-board-hackathon-1` [L] — Device-board хакатон 1: visual scripting, alarm loop, journal
- `db-h1b-board-shell` [M] — DB-H1b: device-board XYFlow shell + board mode UI
- `db-h1c-graph-serialize` [M] — DB-H1c: isValidConnection, export JSON, pre-run validation
- `db-h2a-json-import` [S] — DB-H2a: JSON import + round-trip (stretch)
- `db-h2b-scenario-runtime` [L] — DB-H2b: scenario runtime v1 — initial + main loop
- `db-h2c-mic-journal` [L] — DB-H2c: mic stream → chunks → trends FFT → LiveJournal
- `db-h2d-cabinet-sync` [L] — DB-H2d: cabinet board edit + bidirectional scenario sync
- `db-h3a-trigger-stop` [S] — DB-H3a: trigger onStop — UI button + system event
- `db-h3b-trigger-disconnect` [S] — DB-H3b: trigger onDisconnect — stop; reconnect via initial
- `db-h3c-subgraph` [M] — DB-H3c: subgraph/functions v1 (depth ≤ 1)
- `db-h4-alarm-close` [L] — DB-H4: alarm loop (mandatory) + hackathon close + smoke
- `membrane-node-runtime-remote` [L] — MP7b: Device Board Realtime Runtime — WS run/stop, режим, live-мониторинг (RT0–RT7)
- `mp7b-rt0-contract` [S] — RT0: runtime.* wire-контракт в @membrana/core
- `mp7b-rt1-gateway` [M] — RT1: канал runtime в NodeRealtimeGateway (fan-out по nodeId)
- `mp7b-rt2-client-runtime` [M] — RT2: nodeRealtimeClient runtime → ScenarioRuntime + реальный audio-host
- `mp7b-rt3-mode` [S] — RT3: режим normal/alarm (override) в ScenarioRuntime
- `mp7b-rt4-multinode-schema` [M] — RT4: Prisma multi-node (снять @unique с Node.membraneId, лимит тарифа) + API
- `mp7b-rt5-cabinet-nodes` [M] — RT5: кабинет — разделить Узлы/Ключи, список узлов с run/stop, режимом, ссылками
- `mp7b-rt6-board-ux` [M] — RT6: device-board UX — сайдбар-вкладки, инспектор/палитра, clear+rebuild, Signal за флагом
- `mp7b-rt7-prod-hardening` [M] — RT7: reconnect, персист режима, prod-smoke MP7b, runbook
- `db-doc-v04-mvp` [L] — Device Board MVP v0.4 — Mintlify docs, MCP tier4, node reference
- `db-post-usercase-roadmap` [L] — Device-board post-UserCase: UX + docs snapshot + server
- `usercase-mvp-v2-groups-async` [L] — UserCase MVP v2: groups, functions, async tracks on freeze
- `ucv2-0-spec-lgtm` [S] — UCV2-0: spec graph + groups/functions map + LGTM
- `ucv2-1-graph-collapse` [M] — UCV2-1: mic graph → groups + collapse to function
- `ucv2-2-freeze-async-tracks` [M] — UCV2-2: async MakeTrack + reports while runtime paused
- `ucv2-3-pack-verify` [S] — UCV2-3: usercase:build + verify-pack + smoke
- `ucv2-4-operator-signoff` [S] — UCV2-4: operator LGTM doc + epic close
- `device-board-phase-3` [L] — Device-board Phase 3: catalog service, validators, competition
- `db-p3-a1-usercase-catalog-service` [M] — DB-P3-A1: migrate usercase-catalog-service package
- `db-p3-a2-runtime-validators` [M] — DB-P3-A2: runtime validators + live UI
- `db-p3-a3-competition-restrictions` [M] — DB-P3-A3: competition executionPolicy + restrictions
- `db-ap-r1-core-contracts` [L] — DB-AP-R1: core PromiseRef + async job types + node kinds
- `db-ap-r2-core-sequence-latent` [M] — DB-AP-R2: core sequenceConfig.latentThen
- `db-ap-r3-async-job-store` [L] — DB-AP-R3: AsyncJobStore + backpressure + cancel
- `db-ap-r4-sequence-latent-runtime` [M] — DB-AP-R4: exec-sequence latent Then mode
- `db-ap-r5-promise-nodes-editor` [L] — DB-AP-R5: promise nodes palette + inspector + validators
- `db-ap-r6-promise-nodes-executor` [L] — DB-AP-R6: block-executor promise nodes + supportsAsync
- `db-ap-r7-host-bridge-jobs` [M] — DB-AP-R7: scenarioMicJournalBridge async job wiring
- `db-ap-r8-detached-event-dispatch` [M] — DB-AP-R8: detached event branches + abort
- `db-ap-r9-mvp-graph-v2` [L] — DB-AP-R9: bundled MVP graph v2.0-async + groups
- `db-ap-r10-agenda-async-hub` [M] — DB-AP-R10: ScenarioAsyncJobHub in @membrana/agenda
- `db-ap-r11-observability-tests` [M] — DB-AP-R11: chain-log, logs:parse, vitest smoke matrix
- `db-ap-r12-docs-signoff` [S] — DB-AP-R12: CONCEPT, SCENARIO_RUNTIME, operator LGTM, archive
- `device-board-three-hosts-2026-06-26` [L] — Device-board UserCase: стабильность на cabinet + Studio + Device (эпик)
- `db3h-s2-cabinet-host` [L] — DB3H-S2: device_board на сервере в кабинете пользователя
- `db3h-s5-desktop-logging` [M] — DB3H-S5: политика логов Studio + Device (support feedback)
- `db3h-s4-microphone-detectors` [L] — DB3H-S4: рефакторинг микрофона + audit детекторов (async)
- `device-board-server-first` [L] — Device-board server-first: lease, capture soft/strict, Nodes controls (SF0–SF9)
- `db-sf-0-canon` [S] — SF0: консилиум + canon DEVICE_BOARD_SERVER_FIRST
- `db-sf-1-core-contracts` [M] — SF1: core board + runtime contracts (vesnin)
- `db-sf-2-gateway-board` [M] — SF2: gateway channel board
- `db-sf-3-cabinet-lease-api` [M] — SF3: REST edit lease + DeviceBoardPage
- `db-sf-4-client-follower` [M] — SF4: field client follower soft/strict
- `db-sf-5-board-flags-ui` [M] — SF5: resolveServerFirstFlags + board UX
- `db-sf-6-nodes-runtime` [M] — SF6: NodesPage pause/run/mode
- `db-sf-7-last-track-preview` [S] — SF7: last journal track preview on node card
- `db-sf-8-tests-smoke` [M] — SF8: tests + smoke runbook
- `db-sf-9-docs-sync` [S] — SF9: docs sync CONCEPT/catalog/ARCHITECTURE

## Платформа, кабинет, продуктовая витрина (15)

- `membrana-device-build-profile` [M] — Epic: Membrana Device — профиль сборки apps/client с единственным модулем борда
- `grp4-graphify-gated` [M] — GRP4 (условная): graphify за grant:graphify — только после #529 + 3 условий очереди
- `grp3-research-tree-gated` [M] — GRP3: research-tree за grant:research-tree + git-time-travel офлайн-снапшот, presentation-порт
- `grp2-grants-owner-matrix` [M] — GRP2: два гранта (research-tree/graphify) + owner-матрица/промокоды, empty-state
- `grp1-route-bridge-sections` [M] — GRP1: маршрут-мост + реестр секций панели + ADR топологии + контракт-тест подписи×гранта
- `graphify-research-tree-panel-sections` [L] — Epic: graphify + research-tree как разделы панели за гейтом (GRP1-4)
- `product-landing` [M] — product-landing: лендинг membrana.space/ (описание продукта + CTA регистрация→кабинет + загрузка клиентов)
- `root-domain-scenarios-docs` [M] — root-domain-scenarios-docs: доки на membrana.space/scenarios/docs (Mintlify subpath-proxy) + root-Caddy на cabinet-VPS
- `media-library-a3-mic-recorder` [M] — Media library A3: mic buffer recorder plugin
- `media-library-a4-sample-player` [M] — Media library A4: sample playback, export, and waveform player plugin
- `comp-packaging-catalog-2026-06-25` [M] — Competition packaging: async-v2 catalog publish + operator debug
- `studio-capture-adaptation` [M] — Epic: Studio — адаптация к явному захвату v2 (SC1/SC3/SC4/SC5 + manual deferred)
- `sca-manual-smoke` [M] — SC-manual: ручной smoke Studio paired (capture/TTL/LWW/fade слухом, VDR-плагин) — DEFERRED
- `pcb-d2-multinode` [L] — PCB-D2 (Фаза 3, ОТЛОЖЕНО): multi-node — getPairStatus/authenticateCabinet take:1 -> массив узлов + UI список
- `cabinet-scenario-picker-system` [L] — Epic: cabinet-scenario-picker-system — user + system (по тарифу) сценарии в кабинете + UI-паритет с клиентом

## Ритуалы и контур достоверности команды (34)

- `angelina-hostess-impl` [L] — Спринт: реализация вердиктов «Ангелина — хозяйка утра» (C→B+G→H→GC)
- `linear-hygiene-dreams-providers-night` [M] — Night: Linear-гигиена → живые провайдеры снов
- `ritual-r-report` [M] — Доклад наружу: линза + живые ссылки (R эпика ritual-refactor)
- `ritual-s-standup` [M] — Стендап Тимлидом + движок задач (S эпика ritual-refactor)
- `ritual-k-karkas` [M] — 5-блочный каркас плана дня (K эпика ritual-refactor)
- `ritual-a-angelina-coordinator` [M] — Ангелина-координатор ритуала (компонент A эпика ritual-refactor): чистое ядро каскада
- `meeting-registry-relocation` [L] — Заседание: переезд реестра задач на внешний стек (Linear)
- `meeting-team-execution-contour` [L] — Заседание: контур исполнения виртуальной команды (контур 2)
- `morning-ritual-regulation` [L] #605 — Регламент утреннего ритуала + фоновый агент (барьер против проглоченного гейта)
- `night-build-format-v2` [M] — Формат night-build: доработка по трению ночи 17.07 (заседание)
- `strategy-day-generator` [L] #592 — Генератор стратегии дня: горизонт вместо списка задач
- `truth-graph-contour` [L] #576 — Граф правды: архитектура, реестр зависимых процессов, охлаждение сессии, инструменты редактирования
- `mf10-teeth-sm5` [M] — Зубы S-M5: возможна ли независимость аудитора-субагента
- `mf9-auditor-readonly` [M] — Чем обеспечена read-only природа аудитора
- `mf8-sprint-kind` [M] — Нужен ли sprintKind: meeting
- `mf7-active-guard` [M] — ACTIVE-guard: одно заседание за раз или несколько
- `mf6-auditor-worktree` [M] — Нужен ли аудитору worktree
- `mf5-echo-rule` [M] — Правило про лишнюю посылку в двух копиях на разных ветках
- `mf4-teeth-sm2` [M] — Зубы S-M2: чем мерить наличие вердикта
- `mf3-commands-vs-flag` [M] — Нужны ли команды open/next/audit или хватит флага --meeting
- `mf2-branch-count` [M] — Сколько веток нужно заседанию
- `mf1-format-carrier` [M] — Q-носитель: формат = 5-й регламент или секция в membrana-consilium
- `meeting-format` [L] — Формат Заседания: структура, дорожная карта, зубы, аудитор
- `rt-10-review-precision-degradation` [S] — RT-10: честный режим precision — exact vs working-tree
- `rt-9-code-review-freshness` [S] — RT-9: гвард свежести code-review — критичный сбой не молчит
- `rt-7-priorities-from-registry` [M] — RT-7: приоритеты планирования из реестра, а не хардкод-текстом
- `rt-5-pr-land` [M] — RT-5: task:pr-land + норма «доверяй union-драйверу»
- `rt-4-closure-chain` [M] — RT-4: closure-цепочка — promptPath из реестра + finalize против нормы bookkeeping
- `rt-3-closure-integrity` [M] — RT-3: целостность закрытия issue в обе стороны
- `rt-2-session-extracts` [M] #537 — RT-2: экстракты сессий агентов как свидетельство (не источник истины)
- `rt-1-manifest-generator` [M] — RT-1: генератор пишет манифест посылок и источников сам
- `ritual-trust-contour` [L] #539 — Эпик: достоверность контура планирования и закрытия — код первичен, документы вторичны
- `main-day-probe-gate` [M] #533 — Препроцессор-гейт посылок MAIN_DAY_ISSUE: маркер в коде первичен, Issue вторичен
- `drift-anchor-contour` [M] #396 — Drift-Anchor контур: детерминированный якорь против агентного дрейфа (DA0-DA4)

## Агентский тулинг, CI и техдолг (27)

- `scripts-boundary-container` [M] — Граница scripts/: контейнер для ритуала — пакет, регламент, реестр
- `agent-tooling-friction-3` [M] #554 — agent-tooling-friction-3: 5 фиксов трения сессии + мета-документы (инвентарь тулинга протух)
- `opencode-proxy-sprint-2026-06-25` [M] — Day sprint: OpenCode + LLM proxy providers (freemodel.dev)
- `oc-proxy-s0-research-isolation` [S] — OC0: research + env isolation for LLM proxy
- `oc-proxy-s1-opencode-install` [S] — OC1: install OpenCode CLI
- `oc-proxy-s2-freemodel-keys` [S] — OC2: freemodel.dev keys + smoke
- `oc-proxy-s3-llm-proxy-script` [M] — OC3: llm-proxy-ask.mjs CLI
- `oc-proxy-s4-opencode-config` [S] — OC4: OpenCode config template
- `ci-gate-stabilization` [M] — Epic: CI-gate stabilization — флейки rag-service, двухуровневый test gate, flaky-метрики
- `cg2-two-tier-test-gate` [M] — CG2: двухуровневый test gate — smoke (hard) + full (опциональный) на vitest
- `cg3-flaky-metrics-week` [S] — CG3: логирование + сбор flaky-метрик за неделю (7 прогонов main)
- `cg4-ci-testing-docs` [S] — CG4: CONTRIBUTING § CI & Testing — таблица smoke vs full, классификация тестов
- `rag-dual-circuit-v1` [L] — RAG Dual-Circuit v1: doc-memory + code-structure (эпик)
- `rag-r6-closure` [S] — RAG R6: closure — bootstrap --full на techies68, docs/RAG.md, AGENTS.md update, task archive
- `rag-r7-optional` [S] — RAG R7: optional overlays — Obsidian adapter, Pinecone/pgvector backend, Voyage benchmark, reranker
- `fv1-s2-closeout` [S] — Night Build: fv1-S2 closeout — реестр/worktree reconciliation после merge #217/#218
- `tech-debt-2026-07` [M] — Epic: tech-debt-2026-07 — спринт технического долга (персистентность + enforcement + чистка)
- `agent-tooling-night-build` [L] — Night Build: инструменты агента — pr:ship, build:affected, wire-sync, хуки, хелперы, скиллы
- `nb-at-0-gate` [S] — NB0: gate — scoped CI baseline + заморозка конвенций (кода нет)
- `nb-at-1-gitignore-review` [S] — NB1: .gitignore ревью-артефакта uncommitted-code-review.md
- `nb-at-2-pr-ship` [M] — NB2: yarn pr:ship (ветка+commit+PR+merge+sync, dry-run default, synthetic-тест)
- `nb-at-3-build-affected` [S] — NB3: yarn build:affected (пересборка dist изменённых @membrana, kill stale-dist)
- `nb-at-4-verify-wire-sync` [M] — NB4: yarn verify:wire-sync (core↔bg-cabinet CJS wire синхрон) + pre-push
- `nb-at-5-hooks` [S] — NB5: scoped pre-push typecheck + commit-msg хук (трейлер+conventional)
- `nb-at-6-helpers` [M] — NB6: deploy:when-green (print) + prisma:migration (оффлайн diff)
- `nb-at-7-bookkeeping-gitctx` [M] — NB7: tasks:archive-closed + lib/git-day-context (общий «работа дня»)
- `nb-at-8-docs-skills` [S] — NB8: docs AGENTS.md + скиллы membrana-ship / tooling-doctor

## Партнёры и внешние коммуникации (7)

- `swallow-delivery-idempotency` [S] — Ласточка: таймаут ≠ недоставка — идемпотентность отправки
- `ally-swallow-editorial-gate` [M] #569 — Ласточки партнёрам: формулировка Ожеговым + явное одобрение владельца + память после отправки
- `partner-tutorials` [M] — Epic: Туториалы для партнёра по внешним коммуникациям (PT0–PT3)
- `pt-0-tutorial-template` [S] — PT0: шаблон-конструкция туториала (шапка/что понадобится/шаги/результат/чек-лист + frontmatter версия+дата+FACTS_SHEET, тёмная тема, a11y)
- `pt-1-read-facts-sheet` [S] — PT1: как достать актуальные факты из FACTS_SHEET.md и не соврать (пометки подтверждён/гипотеза/TBD, [TBD] вместо выдумки)
- `pt-2-first-output-v01-endtoend` [M] — PT2: сквозной сценарий первого выхода v0.1 от канона до файла в out/ + сверка render-check/Playwright (НЕ Storybook), показ tone-guard
- `pt-3-honest-tech-storytelling` [M] — PT3: как честно рассказывать о технологии и стадии (пары до/после, пометки риска, dual-use GLOSSARY §4, без сырых внутренних цифр)

## Ресёрчи — входы для решений (5)

- `linear-agent-identity-facts` [S] — Ресёрч: Linear — личность агента, состояние подзадач, блокирующие связи
- `team-accountability-metrics` [S] — Ресёрч: математическая оценка ответственности команды
- `generated-docs-quality-criteria` [S] — Ресёрч: критерии качества генерируемых документов
- `angelina-orchestrator-prompt` [S] — Ресёрч: промпт агента-оркестратора (процедура оркестрации)
- `research-query-hygiene` [S] — Гигиена research-запроса: ярлык рубрики уезжает в текст вопроса
