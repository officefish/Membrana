# TASKS_DECOMPOSE_LIST — реестр декомпозиции задач

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Head SHA | 8d4af75d1f3b18bb52ca120a40b2b15e44fcd67c |
| Source | yarn tasks:decompose --by category --report |
| Axis | category |
| Config | scripts/tasks-decompose.config.json |
| Active | 204 |

## Summary

| № | Категория | Карточек | Доля | Примеры |
|---|-----------|----------|------|---------|
| 1 | Детекция и качество распознавания | 29 | 14% | `detector-scoreboard`, `scoreboard-spectral-ladder`, `scoreboard-dataset-ladder`, … |
| 2 | Device Board — сценарный редактор и runtime | 47 | 23% | `device-board-hackathon-1`, `db-h1b-board-shell`, `db-h1c-graph-serialize`, … |
| 3 | Платформа, кабинет, продуктовая витрина | 16 | 8% | `office-stability-emergency`, `membrana-device-build-profile`, `grp4-graphify-gated`, … |
| 4 | Ритуалы и контур достоверности команды | 38 | 19% | `night-triage-insight-channel`, `insight-mandate-for-new`, `insight-review-from-file`, … |
| 5 | Агентский тулинг, CI и техдолг | 42 | 21% | `tooling-sanitary-pack-3007`, `weekly-dead-wire-audit`, `deps-basket-immediate-2026-07-29`, … |
| 6 | Партнёры и внешние коммуникации | 8 | 4% | `swallow-format-frame-fix`, `swallow-delivery-idempotency`, `ally-swallow-editorial-gate`, … |
| 7 | Ресёрчи — входы для решений | 4 | 2% | `team-accountability-metrics`, `generated-docs-quality-criteria`, `angelina-orchestrator-prompt`, … |
| 8 | Контейнеры, процедуры и мастерские | 14 | 7% | `network-container`, `archivarius-sessions-container`, `adr-procedure-legalize`, … |
| 9 | LLM-каналы и провода процедур | 6 | 3% | `dreams-deploy-office`, `lpc-d-panel`, `lpc-c-office`, … |
| | **Итого** | **204** | 100% | распределено 204 |

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
- `nb-vlr-0-gate` [S] — NB0: gate — baseline scoped CI + фиксация модели хранения библиотеки
- `nb-vlr-1-labels-export-ui` [S] — NB1: кнопка «Экспорт меток (JSON)» коллекции в SampleLibraryModule
- `nb-vlr-2-labels-merge-script` [S] — NB2: yarn vdr:labels-merge — merge меток в манифест пилота + --labels-only для intra-rater
- `nb-vlr-3-library-label-filter` [S] — NB3: фильтр по метке + счётчик прогресса в клиентской библиотеке (порт HG1-UX)
- `nb-vlr-4-docs` [S] — NB4: DATASET_CURATION §Пилот — операторский путь разметки через библиотеку + round-trip
- `detection-alarm-loop-refactor` [L] — Detection-Alarm рефакторинг переключения лупов: fusion→lastDetection+front+loop-transition-policy (тема1), effectiveLoop-sync/захват-гейтинг (ADR Р1/Р2), pure-геттеры, Alpha L36
- `batch-collection-run-contour` [L] #494 — batch-collection-run-contour: прогон детекторов по коллекции — новая execution-модель live↔batch (пост-FREE, следующий цикл)

## Device Board — сценарный редактор и runtime (47)

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

## Платформа, кабинет, продуктовая витрина (16)

- `office-stability-emergency` [M] #933 — АВАРИЯ: таймауты office — server-first не выполняется; починка до строительства роутера (T10)
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

## Ритуалы и контур достоверности команды (38)

- `night-triage-insight-channel` [M] #1445 — Канал «ночной триаж → карточка инсайта»: дома сырья, promote-only PR, стык с магистралью дня
- `insight-mandate-for-new` [M] — Решение по инсайту недостижимо для новых инсайтов: мандаты только из зашитой миграции
- `insight-review-from-file` [S] — insight review принимает готовый REVIEW.md из чата (как консилиум — протокол)
- `cascade-honest-manual` [M] #999 — Каскад не выражает честную ручную чеканку
- `code-review-lead-refactor` [M] — Рефакторинг код-ревью: ведущий из пяти + память ведущего + бестиарий антипаттернов (T3/T4/T5)
- `morning-report-completion` [L] #788 — Спринт достройки утра: доклад по задачам — главный продукт (Ф1 доклад-зеркало, Ф2 ласточка, Ф3 перезапуски по критериям)
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
- `rt-7-priorities-from-registry` [M] — RT-7: приоритеты планирования из реестра, а не хардкод-текстом
- `rt-5-pr-land` [M] — RT-5: task:pr-land + норма «доверяй union-драйверу»
- `rt-4-closure-chain` [M] — RT-4: closure-цепочка — promptPath из реестра + finalize против нормы bookkeeping
- `rt-3-closure-integrity` [M] — RT-3: целостность закрытия issue в обе стороны
- `rt-2-session-extracts` [M] #537 — RT-2: экстракты сессий агентов как свидетельство (не источник истины)
- `rt-1-manifest-generator` [M] — RT-1: генератор пишет манифест посылок и источников сам
- `ritual-trust-contour` [L] #539 — Эпик: достоверность контура планирования и закрытия — код первичен, документы вторичны
- `main-day-probe-gate` [M] #533 — Препроцессор-гейт посылок MAIN_DAY_ISSUE: маркер в коде первичен, Issue вторичен
- `drift-anchor-contour` [M] #396 — Drift-Anchor контур: детерминированный якорь против агентного дрейфа (DA0-DA4)

## Агентский тулинг, CI и техдолг (42)

- `tooling-sanitary-pack-3007` [S] — Санитарный пакет тулинга 30.07: пересборка производных снимков, вывод сноса в файл, содержание в строку вопроса, один автор долгов
- `weekly-dead-wire-audit` [M] #1447 — Недельная процедура «мёртвые провода»: declared ⇒ файл существует ∨ явный pending
- `deps-basket-immediate-2026-07-29` [S] #1422 — Корзина deps «СРАЗУ»: 1 critical (tar DoS) + 22 high по порогу M1
- `worktree-hygiene-epic` [L] #1232 — Эпик: гигиена рабочих деревьев — freshEnough∧clean, гард держателя, инвентарь
- `send-gate-on-path` [S] #1233 — Гейт отправки на путь отправки: день в предикатах, canSendAlly в swallow, сверка digest
- `tc-nightly-frame` [M] #1293 — Ночной полный прогон от пина; фрейм night-report получает носитель и блокирует утро
- `tc-setups-selector` [M] #1292 — Сетапы smoke/gate/full и селектор по графу импортов; отчёт «что не гонялось»
- `tc-home-workshop` [M] #1291 — Контейнер тестов: дом в корневом tests/, кит tests-master, мастерская (homePath начинает работать)
- `tests-container` [L] — Эпик: контейнер тестов — дом в корневом tests/, кит, мастерская, сетапы и ночной полный прогон
- `tooling-friction-2607` [M] #1272 — Тулинг-фрикции 25–26.07: скан по диффу, чужая база ветки, слияние в изоляции, честные отказы хуков
- `notes-regex-cyrillic-translit` [S] — Грабли в канон: кириллица в регулярках JS и транслит при сверке имён
- `leveling-snapshot-out-path` [S] — Снимок выравнивания ломается на абсолютном --out (клеит путь к корню репозитория)
- `ship-automerge-predicate` [S] — Предикат автослияния спрашивает галку вместо правил защиты ветки
- `tw-handoff-liveness` [S] #1319 — Сверка живости топ-10 хендоффа: строки таблицы против состояний задач
- `tw-declared-verbs-honest-no` [S] — Мастерская задач: три глагола объявлены без движков — строить или объявить declared-not-built
- `friction6-secret-inventory` [S] #1266 — yarn secret:inventory — инвентарь засвеченного как вход ротации ключей
- `friction6-hygiene-notes` [S] #1265 — Реестр скриптов не протухает + три грабли окружения в AGENTS.md
- `friction6-scripts-lint` [M] #1264 — scripts/*.mjs вне линтера: дать парсер ESM и назвать шум числом
- `friction6-test-scripts-groups` [S] #1263 — test:scripts разбить на именованные группы — снять файл-перекрёсток
- `agent-tooling-friction-6` [M] — Agent tooling friction — раунд 6 (сессия 2026-07-26): ship не врёт, секрет-гейт не блокирует чужих
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
- `fv1-s2-closeout` [S] — Night Build: fv1-S2 closeout — реестр/worktree reconciliation после merge #217/#218
- `tech-debt-2026-07` [M] — Epic: tech-debt-2026-07 — спринт технического долга (персистентность + enforcement + чистка)
- `agent-tooling-night-build` [L] — Night Build: инструменты агента — pr:ship, build:affected, wire-sync, хуки, хелперы, скиллы
- `nb-at-0-gate` [S] — NB0: gate — scoped CI baseline + заморозка конвенций (кода нет)
- `nb-at-1-gitignore-review` [S] — NB1: .gitignore ревью-артефакта uncommitted-code-review.md
- `nb-at-2-pr-ship` [M] — NB2: yarn pr:ship (ветка+commit+PR+merge+sync, dry-run default, synthetic-тест)
- `nb-at-3-build-affected` [S] — NB3: yarn build:affected (пересборка dist изменённых @membrana, kill stale-dist)
- `nb-at-4-verify-wire-sync` [M] — NB4: yarn verify:wire-sync (core↔bg-cabinet CJS wire синхрон) + pre-push
- `nb-at-6-helpers` [M] — NB6: deploy:when-green (print) + prisma:migration (оффлайн diff)
- `nb-at-8-docs-skills` [S] — NB8: docs AGENTS.md + скиллы membrana-ship / tooling-doctor

## Партнёры и внешние коммуникации (8)

- `swallow-format-frame-fix` [S] #918 — Фрейм форматирования ласточки: полноценное зеркало 5 блоков вместо телеграфных строк (Ожегов)
- `swallow-delivery-idempotency` [S] — Ласточка: таймаут ≠ недоставка — идемпотентность отправки
- `ally-swallow-editorial-gate` [M] #569 — Ласточки партнёрам: формулировка Ожеговым + явное одобрение владельца + память после отправки
- `partner-tutorials` [M] — Epic: Туториалы для партнёра по внешним коммуникациям (PT0–PT3)
- `pt-0-tutorial-template` [S] — PT0: шаблон-конструкция туториала (шапка/что понадобится/шаги/результат/чек-лист + frontmatter версия+дата+FACTS_SHEET, тёмная тема, a11y)
- `pt-1-read-facts-sheet` [S] — PT1: как достать актуальные факты из FACTS_SHEET.md и не соврать (пометки подтверждён/гипотеза/TBD, [TBD] вместо выдумки)
- `pt-2-first-output-v01-endtoend` [M] — PT2: сквозной сценарий первого выхода v0.1 от канона до файла в out/ + сверка render-check/Playwright (НЕ Storybook), показ tone-guard
- `pt-3-honest-tech-storytelling` [M] — PT3: как честно рассказывать о технологии и стадии (пары до/после, пометки риска, dual-use GLOSSARY §4, без сырых внутренних цифр)

## Ресёрчи — входы для решений (4)

- `team-accountability-metrics` [S] — Ресёрч: математическая оценка ответственности команды
- `generated-docs-quality-criteria` [S] — Ресёрч: критерии качества генерируемых документов
- `angelina-orchestrator-prompt` [S] — Ресёрч: промпт агента-оркестратора (процедура оркестрации)
- `research-query-hygiene` [S] — Гигиена research-запроса: ярлык рубрики уезжает в текст вопроса

## Контейнеры, процедуры и мастерские (14)

- `network-container` [M] #1449 — Контейнер network: словарь исходов, зонды обоими путями, предполётная проверка, снимок окружения для агентов
- `archivarius-sessions-container` [L] #1330 — Контейнер сессий Archivarius: Mongo office, адресуемые span, ingest/search с секрет-маской
- `adr-procedure-legalize` [M] #1296 — Легализовать ADR как процедуру: запись в реестре, ядро trigger/steps/gates, зуб на реестр записей
- `frame-rails-2307` [L] — Эпик: базовые процедуры на фрейм-рельсы (утро/спринт/заседание)
- `frames-alive-rodchenko` [M] #981 — Оживление фреймов — Верстальщик: рендер цепочки
- `frames-alive-dynin` [M] #980 — Оживление фреймов — Дынин: математика версии+резолв
- `frames-alive-ozhegov` [M] #979 — Оживление фреймов — Ожегов: контракт+код+начинка
- `tooling-atlas` [M] — Атлас контейнеров — контейнер контейнеров + мастерская + mintlify
- `assets-container` [L] #959 — Эпик: контейнер имущества — три яруса (git/сервер-БД/Drive), набор от чека, подтверждение датой-сегодня
- `bridge-room` [M] #936 — Спринт «мостик»: явное открытие/закрытие комнаты капитана, попугай-техдолг, конспекты фреймом в репо
- `precedent-container` [M] — Контейнер прецедентов + мастерская к нему
- `procedural-workshop` [M] — Процедурная мастерская — три глагола над 2D-домом
- `angelina-codex-no-repo-writes` [S] #922 — Кодекс Ангелины: запрет пушить/редактировать, право только на конспект, репо — по явному разрешению
- `procedural-layer-impl` [L] #781 — Эпик: реализация процедурного слоя (Р1-Р5 заседания procedural-layer)

## LLM-каналы и провода процедур (6)

- `dreams-deploy-office` [M] #997 — Сны: смерджены, но не выкачены на office
- `lpc-d-panel` [M] #1011 — LPC D: panel owner LLM page
- `lpc-c-office` [M] #1010 — LPC C: office overlay + usage API
- `lpc-b-wire` [M] #1009 — LPC B: wire code-review + consilium
- `lpc-a-lib` [M] #1008 — LPC A: registry + resolve + catalog
- `llm-procedure-channels` [L] #1007 — Epic: LLM procedure channels + usage panel
