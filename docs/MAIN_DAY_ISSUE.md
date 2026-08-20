<!-- Сгенерировано: 2026-08-20T05:36:58.262Z (yarn main-day-issue@a0e663b1) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"aacc1732776baf22dfeb8f5bde1deee3e305b1f0","digest":"9b841e70883aaaa517696fb2fc07e5691d8ac060276e0d28a1bf909f67f0883e"},"DAILY_STANDUP":{"version":"aacc1732776baf22dfeb8f5bde1deee3e305b1f0","digest":"9226aad56060f583952b631d375b8652bc447b67ada22e96b2ef26b8978c17da"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: capture-sidecar-protocol, plugin-results-payload-pocket, plugin-results-bridge, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-20

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `firebat-node-device` |
| `primaryTitle` | Узел Firebat как устройство — приложение держит исходящий канал к серверу |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-08-20 |

---

## Магистраль

**firebat-node-device (L)** — магистраль взята из `sources[0].claim`: владелец 19.08 назвал её прямым выбором из замороженного снимка топ-3.

Ступень 1 (узел пишет 48 кГц и отправляет сам) закрыта 18.08. Сегодня — ступень 2: приложение на узле Firebat держит **исходящий** канал к серверу и получает права при установке, а не через SSH-дыру снаружи. Узел стоит за вторым роутером — вход извне закрыт конструктивно; весь обмен должен инициироваться со стороны узла. Работа дня: зафиксировать форму исходящего канала (протокол, аутентификация при установке, heartbeat), пройти до первого живого рукопожатия «узел → сервер» и записать факт в acceptance-документ.

**Критерий успеха к вечеру:** существует датированный артефакт (docs/ или PR), подтверждающий, что узел Firebat самостоятельно открыл исходящее соединение с сервером и сервер его принял; SSH используется только для лабораторной отладки, не для штатного канала.

---

## Подкрепление

- **Закрыть вердикты по 6 oversized-PR** (#1980, #1981, #1987, #2003, #2004, HEAD 847) — каждый PR получает явный LGTM или BLOCK с именованным блокером; приоритет #1981 (741 строка, `plugin-results-bridge b1+b2`, архитектурный контракт моста `media → office`). Без вердиктов downstream (`server-plugin-foundation`, `angelina-hostess-impl`, `assets-container`) заблокированы.
- **Закрыть или эскалировать гейт `secret-parser-built`** — резак в `night-triage-secret-scan.mjs` не прошёл гейт третий день подряд; либо провести один датированный проход с манифестом ротации засвеченных ключей и зафиксировать вердикт, либо записать конкретный диагноз «почему нет» — чтобы снять из санитарных следующего дня.

---

## Перспективные

- **`server-plugin-foundation` — шторм и форма решения** откроются сразу после LGTM по oversized-PR; шторм поверх неревьюированного плагинного контура создаст архитектурный конфликт. Готовность: вердикты по PR → шторм → ADR → код.
- **`angelina-hostess-impl` и `assets-container`** разблокируются параллельно с зелёным `background-media#test`; стоит проверить статус CI после вчерашних merge'ей — чтобы завтрашнее окно не было потрачено на диагностику.
- **`mfcc-compare-sprint`** — явное решение («проба на записи 89e428ba» или «ждём») разблокирует акустическую ветку; откладывать дольше означает накапливать неопределённость в корпусной работе.

---

## Экспериментальные

- **Проба исходящего канала через WebSocket с токеном установки** — узел открывает WS-соединение к `background-office`, передаёт токен, записанный PS1-скриптом при установке; сервер возвращает `{ok: true, nodeId}`. Одна функция, без фреймворка, без UI — узнаем, достаточно ли существующего office-эндпоинта или нужен новый.
- **Проба-secret:** один вызов `scripts/lib/secret-redact.mjs` на последнем бэкапе сессии — узнаем, сколько вхождений режется и есть ли ложные срабатывания на цитаты владельца (риск из limit'а кристалла `secret-parser-cuts-aggressively`).
- **Проба-CI:** запустить `background-media#test` вручную и сверить статус — узнаем, нужна ли эскалация или тест зелёный после вчерашних merge'ей.

---

## Санитарные

- Провести ревью #1981 отдельным прогоном (741 строка, `plugin-results-bridge b1+b2`) — зафиксировать вердикт (LGTM / BLOCK + блокер).
- Провести ревью #1980, #1987, #2003, #2004, HEAD 847 — по каждому явный вердикт.
- Проверить статус `@membrana/background-media#test` после вчерашних merge'ей — закрыть или эскалировать.
- Зафиксировать диагноз по `secret-parser-built`: либо проход с манифестом, либо письменный блокер «почему нет» (третий перенос — четвёртый недопустим).
- Подтвердить, что CI-метрика `RAG_ACCEPTANCE_TIMING_MS` записана в ряд, а не осталась одноразовым числом (вчера `rag-service#test` был зелёным).
- `mfcc-compare-sprint` — назвать решение словом: проба сейчас или явный отложить.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|--------------|--------------|---------|
| Магистраль дня — `firebat-node-device` | `docs/tasks/main-day-assertions.json`, `sources[0].claim` | Слово владельца, owner-choice@chat/magistral-19-08 | 2026-08-19 |
| Ступень 1 (узел пишет и отправляет) закрыта 18.08 | стендап 2026-08-20 | DAILY_STANDUP.md (ссылается на факт 18.08) | 2026-08-20 |
| Узел за вторым роутером — вход снаружи закрыт, канал обязан быть исходящим | `sources[0].claim` | Слово владельца 18.08 вечером, зафиксировано в sources[0] | 2026-08-19 |
| 6 oversized-PR блокируют downstream (подкрепление, не магистраль) | стендап 2026-08-20 | DAILY_CODE_REVIEW.md (вчерашний, Vesnin T2) | 2026-08-19 |
| `secret-parser-built` не закрыта третий день (подкрепление) | план дня DAY_PLAN.md | docs/strategy/day-horizon.json (генератор #592) | 2026-08-20 |
| **Расхождение:** `DAY_PLAN.md` предлагает три кандидата без выбора; `DAILY_STANDUP.md` называет «закрыть ревью oversized-PR» фокусом дня — **магистраль взята с `sources[0]` (assertions), DAY_PLAN и стендап не перечеканены** | снимок | DAY_PLAN.md / DAILY_STANDUP.md vs main-day-assertions.json | расхождение само есть находка; перечеканка main-day-assertions.json каноном предписана и не сделана |

*Голоса: 1 первоисточник по магистрали (слово владельца 19.08). Стендап и план — контекст, не выбор. Синтез запрещён — sources[0] задан.*

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Исходящий WS/HTTP-канал «узел → сервер» с токеном установки не реализован в приложении узла | `symbol:OutgoingNodeChannel` в `packages/**` и `apps/**` | unknown — маркер требует прогона `git grep`; при вердикте `violated` (символ найден) — день превращается из «построить» в «принять и задокументировать» (прецедент archivarius 14.08) |
| PS1-скрипт установки не вшивает токен канала в конфиг приложения узла | `file:scripts/firebat-service-install.ps1` существует, но не содержит генерации/записи channel-токена | unknown — требует просмотра файла; если токен уже вшит, посылка нарушена → переходим к тестированию рукопожатия |

*Примечание: `firebat-service-install.ps1` существует (факт из вещдока retired-installer-built-19-08 в assertions). Прежде чем объявлять работу «не сделана» — прогнать `git grep OutgoingNodeChannel` и просмотреть PS1. Расхождение «symbol есть, issue висит» — находка, не повод молча обойти.*

---

## Сегодня делаем

1. Прогнать `git grep OutgoingNodeChannel` и просмотреть `scripts/firebat-service-install.ps1` — зафиксировать вердикт по посылкам (holds / violated).
2. Зафиксировать форму исходящего канала: протокол (WS или HTTP long-poll), точка подключения в `background-office`, схема аутентификации токеном установки — оформить как ADR-note или inline в acceptance-doc.
3. Реализовать или достроить исходящий канал на стороне узла: `узел → сервер`, первое живое рукопожатие с `{ok: true, nodeId}`.
4. Провести ревью #1981 (приоритет), затем #1980, #1987, #2003, #2004, HEAD 847 — по каждому письменный вердикт.
5. Проверить `background-media#test` и `RAG_ACCEPTANCE_TIMING_MS` в CI — закрыть или эскалировать.
6. Зафиксировать диагноз / проход по `secret-parser-built` — снять из санитарных или записать блокер.
7. Записать acceptance-артефакт дня: дата, факт рукопожатия узла с сервером, статус исходящего канала.

---

## Definition of Done (фокус)

- [ ] Вердикт по посылкам зафиксирован (`git grep` + просмотр PS1): holds или violated с объяснением.
- [ ] Форма исходящего канала (протокол, аутентификация) задокументирована в одном артефакте (ADR-note / acceptance-doc).
- [ ] Узел Firebat открыл исходящее соединение с `background-office` и получил подтверждение `{ok: true, nodeId}` — факт зафиксирован в лог или скриншоте.
- [ ] SSH не используется в штатном канале: только для лабораторной отладки (проверяется отсутствием SSH-вызова в коде исходящего канала).
- [ ] Acceptance-документ датирован 2026-08-20 и содержит явное «ок» по исходящему каналу.
- [ ] По каждому из 6 oversized-PR (подкрепление) зафиксирован вердикт LGTM или BLOCK + блокер.
- [ ] `secret-parser-built`: либо проход с манифестом, либо письменный диагноз «почему нет».

---

## Сознательно не делаем сегодня

- **`server-plugin-foundation` (шторм + код)** — не открываем до LGTM по oversized-PR; шторм поверх неревьюированного контура создаст архитектурный конфликт.
- **`mfcc-compare-sprint`** — PR #1951/#1953 без принятого ревью, корпус недостоверен; входим только после явного решения (проба или отложить).
- **Повторный DSP-бенчмарк (harmonic / cepstral / spectral-flux на free-v1)** — потолок зафиксирован (`DRONE_TIGHT` 95%/30%); без смены датасета повтор не добавляет информации.
- **`angelina-hostess-impl` и `assets-container`** — ждут зелёного `background-media#test` и LGTM по PR-блоку.
- **Реализацию серверных плагинов** — только после LGTM формы от Vesnin (B4-риск: «своих копий не осталось» проверять нечем до ADR).
- **Полевой сбор новых записей** — не в этот день; Firebat сегодня строит канал, а не собирает датасет.

---

## Вторично (если останется время)

- Проверить, добавлен ли `includeInsights` в дневной генератор стратегии после закрытия кристалла `insight-flow-broken-by-weekly-freeze` (revoked 2026-07-20) — если нет, поднять как техдолг.
- Просмотреть промпт `firebat-node-device` и сверить шаги эпика с фактическим состоянием кода после b5 (installer built 19.08) — чтобы завтрашний день открывался с точным списком остатка.

---

## Зависимости и риски

- **Блокер #1:** Вердикт по посылкам может оказаться `violated` (исходящий канал уже реализован) — тогда день уходит в приёмку и документирование, а не в реализацию. Это хороший исход, не плохой.
- **Блокер #2:** Ревью #1981 может обнаружить нарушение контракта M3 (`адрес = pluginId + mountTarget`, не module-сегмент) — тогда день уходит на BLOCK + исправление формы, downstream остаётся заблокированным ещё один день.
- **Риск:** `background-media#test` красный после вчерашних merge'ей — `angelina-hostess-impl` и `assets-container` не могут мёрджиться; нужна ранняя проверка CI.
- **Риск:** `secret-parser-built` четвёртый перенос недопустим (норма вечернего фидбека); если диагноза нет к вечеру — эскалация к владельцу.

---

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-08-20
- [DAY_PLAN.md](../docs/DAY_PLAN.md) — план дня (5 слотов, канон M2-B)
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json) — sources[0], выбор владельца 19.08
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](../docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, запрет на повтор бенчмарка
- [STRATEGY_DAY.md](../docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`