<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-07
  archived-at: 2026-08-07T16:11:46.159Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-07T06:49:42.359Z (yarn main-day-issue@e291f11e) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"1b39a0f7848fd4091aa321e3193e7c0d79de7159","digest":"d6a2179e532b58d59a4b495471e08ed5afd520b0d687e4821bae2bf5b89ba840"},"DAILY_STANDUP":{"version":"1b39a0f7848fd4091aa321e3193e7c0d79de7159","digest":"114454bcbe68603d3582fafb3cbfcf3ed592a65d2e6142aa56dd03f445cfe1c8"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: tariff-promo-server-wiring, pr-ship-post-merge-landing, lazy-close-scope, archivarius-mongo-backup, worktrees-align, recreate-execution-procedure-interface, procedure-run-journal-panel-reader, corpus-track-acceptance-predicate, one-shot-trail-forecast-fact, sprint-cut-teeth-to-live-modules, worktree-foreign-resolution-probe, gate-stale-supersede-by-recut, gate-honest-pair-completeness, deploy-procedure-survey, workflow-examples-marathon, detectors-window-single-carrier, review-oversized-queue, ritual-magistral-source-freshness, deps-watch-disappearance-named, detectors-judge-whole-record, tooling-truth-orphans-diagnosis, subconscious-lift-c3, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, forecast-archive-wire, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, mfcc-lib-choice, network-container, weekly-dead-wire-audit, night-triage-insight-channel, deps-basket-immediate-2026-07-29, archivarius-sessions-container, worktree-hygiene-epic, adr-procedure-legalize, send-gate-on-path, tc-nightly-frame, tc-setups-selector, tc-home-workshop, tests-container, tooling-friction-2607, notes-regex-cyrillic-translit, leveling-snapshot-out-path, insight-mandate-for-new, insight-review-from-file, ship-automerge-predicate, tw-declared-verbs-honest-no, friction6-secret-inventory, friction6-hygiene-notes, friction6-scripts-lint, friction6-test-scripts-groups, agent-tooling-friction-6, cascade-honest-manual, dreams-deploy-office, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, angelina-codex-no-repo-writes, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, agent-tooling-friction-3, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, media-library-a3-mic-recorder, media-library-a4-sample-player, trends-fft-template-editor, live-parallel-detection-sprint, lp1-mic-drone-stream-modes, lp1b-drone-detailed-report-server, lp2-fft-plugins-journal-sink, lp3-track-import-backpressure, lp4-parallel-detection-smoke, lp5-journal-report-renderers, device-board-hackathon-1, db-h1b-board-shell, db-h1c-graph-serialize, db-h2a-json-import, db-h2b-scenario-runtime, db-h2c-mic-journal, db-h2d-cabinet-sync, db-h3a-trigger-stop, db-h3b-trigger-disconnect, db-h3c-subgraph, db-h4-alarm-close, membrane-node-runtime-remote, mp7b-rt0-contract, mp7b-rt1-gateway, mp7b-rt2-client-runtime, mp7b-rt3-mode, mp7b-rt4-multinode-schema, mp7b-rt5-cabinet-nodes, mp7b-rt6-board-ux, mp7b-rt7-prod-hardening, db-doc-v04-mvp, db-post-usercase-roadmap, usercase-mvp-v2-groups-async, ucv2-0-spec-lgtm, ucv2-1-graph-collapse, ucv2-2-freeze-async-tracks, ucv2-3-pack-verify, ucv2-4-operator-signoff, device-board-phase-3, db-p3-a1-usercase-catalog-service, db-p3-a2-runtime-validators, db-p3-a3-competition-restrictions, opencode-proxy-sprint-2026-06-25, oc-proxy-s0-research-isolation, oc-proxy-s1-opencode-install, oc-proxy-s2-freemodel-keys, oc-proxy-s3-llm-proxy-script, oc-proxy-s4-opencode-config, comp-packaging-catalog-2026-06-25, device-board-three-hosts-2026-06-26, ci-gate-stabilization, cg2-two-tier-test-gate, cg3-flaky-metrics-week, cg4-ci-testing-docs, db3h-s2-cabinet-host, db3h-s5-desktop-logging, db3h-s4-microphone-detectors, device-board-server-first, db-sf-0-canon, db-sf-1-core-contracts, db-sf-2-gateway-board, db-sf-3-cabinet-lease-api, db-sf-4-client-follower, db-sf-5-board-flags-ui, db-sf-6-nodes-runtime, db-sf-7-last-track-preview, db-sf-8-tests-smoke, db-sf-9-docs-sync, neural-tier-1b-contract, neural-free-tier-dataset-report, rag-dual-circuit-v1, fv1-s2-closeout, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, vdr-label-roundtrip-night-build, nb-vlr-0-gate, nb-vlr-1-labels-export-ui, nb-vlr-2-labels-merge-script, nb-vlr-3-library-label-filter, nb-vlr-4-docs, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, tech-debt-2026-07, cabinet-scenario-picker-system, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-07

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `tariff-promo-server-wiring` |
| `primaryTitle` | Провод доменного решения тарифа и промокода до сервера и клиента |
| `githubIssue` | #1761 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-08-07 |

---

## Магистраль

**`tariff-promo-server-wiring`** — провод готового доменного решения тарифа/промокода до сервера и клиента.

Домен решения уже написан: `decideTransition(grid, request, promo, now)` с доказательствами `admin|promo`, закрытым списком отказов (`promo_revoked`, `promo_already_redeemed`, `promo_expired`, `promo_target_mismatch`, `promo_downgrade_forbidden`), флагом `spendPromo` и 16 зубами теста. Модель `PromoCode` существует в `schema.prisma:270`. Матрица тарифов и серверный enforcement квот доставлены ранее. При этом все 16 упоминаний `decideTransition` в репозитории — из собственного теста функции: **её никто не вызывает**. Задача дня — не написать логику, а подключить: серверный роут читает запрос, вызывает домен, атомарно списывает попытку промокода, возвращает клиенту различимую причину отказа; клиент отображает результат выбора тарифа.

**Критерий успеха к вечеру:** существует серверный обработчик, вызывающий `decideTransition`; при переходе с промокодом попытка списывается атомарно; клиент получает и отображает ответ (включая различимую причину отказа из закрытого списка); хотя бы один интеграционный зуб проходит по реальному маршруту, а не только по unit-тесту домена.

---

## Подкрепление

- **Атомарное списание промокода (`spendPromo`):** до провода сервера `spendPromo` не вызывается ни при каком сценарии. Подкрепление — выделить транзакционный шаг списания (Prisma-транзакция: проверка статуса промокода + запись использования + смена тарифа) как отдельный, явно тестируемый слой, чтобы магистральный провод опирался на надёжный примитив, а не на один вызов в теле роута.

- **Различимый ответ клиенту (error reason):** закрытый список отказов домена (`promo_revoked` и др.) должен пройти до UI в читаемой форме. Подкрепление — завести enum/тип ошибки тарифного перехода на клиенте и сопоставить с каждым отказом домена, чтобы пользователь видел конкретную причину, а не generic-ошибку. Без этого шага провод технически замкнут, но продуктово неполон.

---

## Перспективные

- **Витрина детекции (Ф3 `scoreboard-spectral-ladder`):** разблокируется после закрытия долга #1647 (37 пакетов в чужое дерево) и хотя бы одного зуба `media-library-a3-mic-recorder`; числа для витрины уже есть, судьи зелёного CI пока нет.
- **`archivarius-sessions-container`:** бэкап 106К записей второй день в топе хендофа (#1714); риск потери данных назван явно — кандидат в следующую магистраль при выборе владельца.
- **Ночная сборка инструментов агента (`agent-tooling-night-build`):** ADR-набросок три поля (что зубит ночной прогон / кто судья / где журнал) не создан второй день; без формы L-задача не стартует чисто — перспективный приоритет на следующий owner-choice.

---

## Экспериментальные

- **Проба `insight:insight-dreams-procedure-frames`:** запустить один ночной сон через минимальный фрейм-шаблон (5 полей: образ, эмоция, связь с задачей, вопрос, действие) — проверить, достаточно ли скелета без панели, чтобы сон дал зацепку для утренней посылки.
- **Проба `insight:insight-procedure-memory-shown-not-asked`:** в одном переходе между слотами показать участнику текущее состояние задачи числом («вот: 3 из 5 зубов зелёные»), а не спрашивать «помнишь ли?» — проверить, сокращает ли это время на введение в контекст.
- **Проба `insight:insight-meeting-agenda-as-extract`:** сформировать повестку одного внутреннего разбора (например, расхождения `assertions.json` ↔ гейт) как машинный выписной список с id кристаллов и спорными посылками — проверить, хватает ли выписки без прозы председателя.

---

## Санитарные

- **Красный CI трёх детекторных сервисов (`cepstral`, `harmonic`, `spectral-flux`):** вердикт по каждому — одна строка «аудио-дефект / инфраструктура»; без вердиктов ночной прогон не имеет судьи.
- **Долг #1647 (37 пакетов резолвятся в чужое дерево):** `node_modules/@membrana/detector-base` симлинком смотрит в Membrana-grok со сборкой от 21 июля — локальный typecheck недостоверен, красный `harmonic` не лечится; при первом касании дерева.
- **Ревью oversized-очереди `yarn code-review:pr 1729`** (#1729, 1076 строк) — второй день не проведён; один проход с вердиктом в одну строку журнала (хендоф №8).
- **`githubIssueClosedAt` для `llm-transport-no-key-class`** (#1549) — третий день не закрыт; при первом касании реестра.
- **Граф правды не двинулся при трёх закрытых спринтах:** проверить, вызывался ли `truth:cool`, подключены ли подписчики закрытия эпика; кристаллы — единственный слой, фиксирующий пройденные посылки вехи.
- **`assertions.json` не перечеканен под `main-day-assertions.json`:** магистраль сегодня взята из `sources[0]` (owner-choice 07.08, запись есть), но `assertions[]` пуст — расхождение не устранено, перечеканка предписана каноном и не сделана (см. раздел обоснования ниже).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `tariff-promo-server-wiring`; ось названа владельцем прямо вне первого снимка топ-3 | сессия (owner-choice) | `docs/tasks/main-day-assertions.json` → `sources[0]`, `origin: owner-choice@chat/magistral-07-08` | **2026-08-07** |
| `decideTransition` существует с 16 зубами теста, но никто её не вызывает (все 16 упоминаний — из собственного теста) | код | репозиторий, grep `decideTransition` | 2026-08-07 |
| `PromoCode` есть в `schema.prisma:270`; матрица тарифов и enforcement квот доставлены | код | `schema.prisma` | до 07.08 |
| Гейт утра (`morning-gate`) зафиксировал снимок одним кандидатом `tariff-promo-server-wiring`; первый снимок топ-3 переморожен — `sources[0]` честно кодирует «владелец назвал ось» | план (гейт) | `morning-gates-state.json`, frozenDigest `cde96130…` | **2026-08-07** |
| `assertions[]` в `main-day-assertions.json` пуст — посылки не перечеканены под сегодняшнюю магистраль | код/конфиг | `docs/tasks/main-day-assertions.json` | 2026-08-07 |
| **Расхождение (норма У1):** `sources[0]` несёт выбор 07.08; если `morning-gates-state.json` также несёт `magistral` с `day=2026-08-07` — оба источника владельческие, спор решается свежестью в пользу гейта; **магистраль взята с `sources[0]` (chat 07.08), assertions не перечеканены** — расхождение само есть находка, перечеканка `main-day-assertions.json` предписана каноном | конфиг | `main-day-assertions.json` + `morning-gates-state.json` | 2026-08-07 |
| Стендап и план дня (`DAY_PLAN.md`) называют трёх кандидатов (angelina / archivarius / assets), НЕ `tariff-promo-server-wiring` — это 1 источник, 2 отражения одного снимка (первый снимок топ-3 до owner-choice); owner-choice 07.08 свежее и перекрывает | план | `docs/DAY_PLAN.md` + `docs/DAILY_STANDUP.md` (1 источник, 2 отражения) | 07.08 (снимок до owner-choice) |

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| `decideTransition` не вызывается никаким серверным роутом — потребителя нет | `symbol:decideTransition` в `packages/**/src/**` и `apps/**/src/**` (исключая собственный тест домена) | **holds** — все упоминания внутри теста домена, серверный роут отсутствует |
| Серверный обработчик выбора тарифа с промокодом не существует | `file:apps/server/src/routes/tariff*` или аналогичный роут с вызовом домена тарифа | **holds** — файл не существует |
| Атомарное списание `spendPromo` нигде не вызывается | `symbol:spendPromo` в `packages/**/src/**` и `apps/**/src/**` | **holds** — 0 вызовов вне теста |

---

## Сегодня делаем

1. Найти точку входа серверного слоя (существующий роутер или создать `apps/server/src/routes/tariff-transition.ts`) и убедиться, что сборка проходит до добавления вызова домена.
2. Добавить вызов `decideTransition(grid, request, promo, now)` в серверный обработчик; убедиться, что импорт домена разрешается без ошибок типов.
3. Реализовать атомарную Prisma-транзакцию `spendPromo`: проверка статуса промокода → запись использования → смена тарифа — как изолированный примитив с собственным тестом.
4. Сериализовать причину отказа из закрытого списка домена в HTTP-ответ (JSON с полем `reason: PromoDeclineReason`); убедиться, что каждый из пяти отказов возвращает различимый код.
5. На клиенте: принять `reason` из ответа, сопоставить с enum/текстом ошибки, отобразить пользователю (не generic-ошибку).
6. Написать хотя бы один интеграционный зуб, прогоняющий реальный маршрут: запрос → `decideTransition` → `spendPromo` → ответ с `reason`.
7. Зафиксировать вердикты по красному CI трёх детекторов (`cepstral` / `harmonic` / `spectral-flux`) — одной строкой каждый «аудио-дефект / инфраструктура» — в журнале дня.

---

## Definition of Done (фокус)

- [ ] Серверный роут тарифного перехода существует и вызывает `decideTransition` (grep подтверждает вызов вне теста домена)
- [ ] Атомарная транзакция `spendPromo` реализована и покрыта минимум одним unit-тестом
- [ ] Все пять отказов домена (`promo_revoked`, `promo_already_redeemed`, `promo_expired`, `promo_target_mismatch`, `promo_downgrade_forbidden`) сериализуются в HTTP-ответ с различимым `reason`
- [ ] Клиент отображает конкретную причину отказа (не generic), для каждого из пяти случаев есть сопоставление в типе/enum
- [ ] Хотя бы один интеграционный зуб проходит по реальному маршруту (не только unit домена)
- [ ] `yarn typecheck` зелёный в затронутых пакетах
- [ ] Вердикты по красному CI (`cepstral` / `harmonic` / `spectral-flux`) записаны — по одной строке на каждый

---

## Сознательно не делаем сегодня

- **Новые DSP-бенчмарки** (`harmonic` / `cepstral` / `spectral-flux` на free-v1) — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%), физика не изменилась.
- **`angelina-hostess-impl` / `archivarius-sessions-container` / `assets-container`** — кандидаты первого снимка топ-3 сегодняшнего утра; owner-choice перекрыл их прямым называнием оси `tariff-promo-server-wiring`.
- **`agent-tooling-night-build` ADR** — ADR-набросок второй день