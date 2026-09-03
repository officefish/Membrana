<!-- Сгенерировано: 2026-09-03T10:48:40.019Z (yarn main-day-issue@6772645a) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"564238012474b93ad6fa7ade16ae48cc28041d0d","digest":"9013d121b75ea24e6eadafed4068d2d5aa3285283210bcf7656cb2338c838340"},"DAILY_STANDUP":{"version":"564238012474b93ad6fa7ade16ae48cc28041d0d","digest":"8a938e4a1c57440b75a7df92b53088c52f19b96f9745b862c8646f2996313baa"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-03

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `library-open-api-door` |
| `primaryTitle` | Дверь Open API библиотеки: три ручки + ключ + TTL в кабинете |
| `githubIssue` | — (база коворка PR #2267) |
| `size` | L |
| `promptPath` | `docs/meeting/library-open-api/EPIC.md` |
| `сгенерировано` | 2026-09-03 |

## Магистраль

**library-open-api-door** — довести вчерашний коворк Open API библиотеки (PR #2267: ownership / contract / key-ttl, 7 адаптеров, смоук 6/6, **открыт**) до состояния, которое владелец проверит руками снаружи. Факт утра: снаружи API **не отвечает** — в ветке коворка нет контроллеров/маршрутов (только `library-ownership.module.ts` без обработчиков). Дверь при нарезке была названа «строки сборки вносит координатор» (обещание, не носитель) и оказалась отдельной вещью: порядок проверок существование→владение, коды 404/403, `no-store` на credential-bearing ответ.

Сегодня строим носитель: (1) три ручки вердикта M2 — `/v1/devices/:deviceId/collections`, `…/:collectionId/samples`, `…/:sampleId/blob`; без слоя трансляции; ключ пробы `sampleId`; обёртка `items/total/page/limit` **без** `hasMore`; 404 нет / 403 закрыто; ответ со связкой ключей = credential-bearing (`no-store`, не в логи); (2) хранилище ключа — Prisma-модель, миграция, уникальность на `membraneId`; (3) блок настроек срока в кабинете (масштаб выключателя — мембрана). **Не берём** M4-квоты (выведены владельцем за спринт).

**Критерий успеха к вечеру:** снаружи отвечают три ручки по контракту M2; ключ живёт в БД с уникальностью на мембрану; в кабинете виден выключатель/срок TTL; смоук на дверь зелёный либо явный вердикт блокера с repro; PR #2267 либо дополнен дверью и готов к слову владельца на мердж, либо разрезан так, что дверь — отдельный проверяемый PR поверх базы коворка.

## Подкрепление

- **Смоук и контрактные зубы на три ручки** — фиксируют порядок 404→403, форму `items/total/page/limit` без `hasMore`, запрет утечки `storageRef`/`notes`, `Cache-Control: no-store` на credential-bearing; без этого дверь нельзя отдавать владельцу «на руки».
- **Prisma-модель ключа + миграция (уникальность `membraneId`) и UI-блок TTL в кабинете** — второй и третий куски двери из слова владельца; fail-closed к `DEFAULT_TRACK_KEY_TTL` уже в базе коворка, сегодня — носитель хранения и выключатель на масштабе мембраны.

## Перспективные

- Слово владельца на мердж PR #2267 (ownership/contract/key-ttl) после проверки двери руками — закрывает коворк-контур Open API.
- Вердикт по красным `@membrana/media-library-service` / `@membrana/background-cabinet` (#2266 порог 5 с; #2256 false red без `dist`) — разблокирует product-merge очередь и хвост `sample-move-between-collections`.
- Прохождение гейта `secret-parser-built` (резак + датированный манифест ротации) — снимает амнистию на правку архива сессий и открывает безопасный бэкап без сырых секретов на сервер.

## Экспериментальные

- Прогон «ключ выдан → blob по `sampleId` → повтор с протухшим/чужим ключом» — узнаем, держится ли разведение 404/403 и fail-closed TTL на живом контуре, а не только на смоуке адаптеров.
- Сверка обёртки списка с потребителем кабинета: нет ли скрытой зависимости от `hasMore` или трансляции путей — шов, который коворк намеренно не закрывал заранее.
- Dry-run `night-triage-secret-scan.mjs` / резак на копии одного датированного фрагмента бэкапа — узнаем покрытие манифеста засвеченных до боевого прохода гейта (подкрепление горизонта, не ствол дня).

## Санитарные

- красные `@membrana/media-library-service` + `@membrana/background-cabinet` — вердикт «помеха vs pre-existing» (#2266: порог 5 с при 5,4–5,6 с; у `background-media` тот же класс лечат `testTimeout: 30_000`)
- классификация `#2256` (false red без `dist`/CI-контура) — вчера не проведена до issue-вердикта
- UI-дверь `BUFFER_COLLECTION_ID` / симметрия `canMutate` Studio↔кабинет — санитарный хвост owner-мандата 31.08 (набор→набор без буфера)
- review oversized `47d731e9` (672 строки, автозабор ритуала) — отложенный ревью-долг
- dry-run резака + сверка ключей с biweekly-ротацией — хвост к вехе `secret-parser-built` (не ствол)

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `library-open-api-door` (выбор №1 из снимка door · node-duty-ready · archive-quota-direction) | сессия | owner-choice@chat/magistral-03-09 → `docs/tasks/main-day-assertions.json` `sources[0]` | 2026-09-03 |
| База коворка готова (ownership/contract/key-ttl, 7 адаптеров, смоук 6/6), PR #2267 открыт, ждёт слова на мердж | issue | PR #2267 / коворк 02.09 | 2026-09-02 |
| Снаружи API не отвечает: в ветке нет контроллеров/маршрутов, только module без handlers | код | проверка ветки коворка (`library-ownership.module.ts` без обработчиков) — зафиксировано в `sources[0].claim` | 2026-09-03 |
| Три ручки, обёртка без `hasMore`, 404/403, credential-bearing `no-store`; Prisma-ключ; TTL UI на мембране; M4 квоты вне спринта | сессия | то же owner-choice 03.09 (вердикт M2 заседания library-open-api) | 2026-09-03 |
| `node-duty-ready` и `archive-quota-direction` отложены владельцем (старая Studio на Firebat; диск 82% / буфер <1% — шторм, не код) | сессия | owner-choice@chat/magistral-03-09 | 2026-09-03 |
| Стендап держит P0 `#2266` + хвост sample-move — **контекст санитарной/merge-очереди**, не выбор магистрали | план | `docs/DAILY_STANDUP.md` 2026-09-03 | 2026-09-03 |
| DAY_PLAN top-3 (angelina-hostess-impl / assets-container / batch-collection-run-contour) — кандидаты **до** слова владельца; магистраль планом не назначена | план | `docs/DAY_PLAN.md` + норма Q1 | 2026-09-03 |
| Горизонт #592 = `secret-parser-built` — веха графа, **не** ствол дня | снимок-хардкод | `docs/strategy/day-horizon.json` → `docs/STRATEGY_DAY.md` | генератор #592 |

**Голоса:** 1 источник магистрали — owner-choice 03.09 (`sources[0]`). Стендап, DAY_PLAN top-3 и горизонт `secret-parser-built` — **другие** контуры (санитария / кандидаты до выбора / веха); не переопределяют `sources[0]`. Отражения коворка 02.09 и EPIC meeting — поддержка «что уже сделано», не второй голос за другую магистраль. **Синтез из стендапа запрещён** при непустом `sources[]`.

*У1:* в предоставленном входе нет актуального `docs/tasks/morning-gates-state.json` с `magistral.day = 2026-09-03`, перекрывающего `sources[0]`. Магистраль взята из `sources[0].claim`. Если гейт утра позже перечеканит другой id — зафиксировать строкой «магистраль взята с гейта, assertions не перечеканены» и перечеканить assertions.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| В базе коворка Open API **нет** HTTP-носителя двери (контроллеров/маршрутов трёх ручек) — есть ownership/contract/key-ttl без handlers | `symbol:library-ownership` / отсутствие route-handlers на `/v1/devices/:deviceId/collections` в ветке #2267 | `holds` (по слову владельца 03.09 и утренней проверке; день = построить носитель) |
| Хранилище ключа трека как Prisma-модель с уникальностью на `membraneId` ещё не является проверяемым носителем двери | `symbol` модели ключа / migration под `membraneId` unique | `unknown` → подтвердить grep/схемой в начале дня; при `violated` (модель уже есть) — не строить заново, только ручки + UI |
| M4-квоты выведены за спринт — не часть двери | — | развилки A/B по квотам нет; квоты в «не делаем» |

Развилка «строить door vs только merge #2267»: при `holds` на отсутствии handlers — **строим door**; merge без handlers оставляет API мёртвым снаружи (прямое слово владельца).

## Сегодня делаем

1. Зафиксировать baseline ветки PR #2267: список модулей ownership/contract/key-ttl, смоук 6/6, **отсутствие** controllers на три пути M2 (вещдок в описании/чеклисте).
2. Реализовать три ручки: collections → samples → blob; ключ `sampleId`; обёртка `items/total/page/limit` без `hasMore`; 404/403; `no-store` на credential-bearing.
3. Ввести (или подтвердить) Prisma-модель ключа + миграцию с уникальностью на `membraneId`; fail-closed к `DEFAULT_TRACK_KEY_TTL` не ломать.
4. Блок настроек срока TTL в кабинете (выключатель/срок на масштабе **мембраны**, не «угадай владельца»).
5. Смоук/зубы: счастливый путь + 404 + 403 + протухший ключ + отсутствие `hasMore`/`storageRef` в наружном JSON.
6. Собрать PR двери (дополнение #2267 или поверх него) в состояние «владелец может проверить руками»; не мержить без слова владельца.
7. Санитарным параллельным слотом (не ствол): завести/обновить issue-вердикт по #2266/#2256, если красные всё ещё валят merge-очередь.

## Definition of Done (фокус)

- [ ] Снаружи (или интеграционным смоуком, эквивалентным снаружи) отвечают `GET …/collections`, `…/samples`, `…/blob` по путям без слоя трансляции
- [ ] Отказы разведены: 404 «нет» / 403 «закрыто»; порядок проверок существование → владение соблюдён
- [ ] Списки отдают `items` + `total` + `page` + `limit` и **не** отдают `hasMore`
- [ ] В наружном контракте нет `storageRef` и `notes`; blob/ключ не пишутся в логи; `Cache-Control: no-store` на credential-bearing
- [ ] Ключ хранится в БД (Prisma + миграция), уникальность на `membraneId` enforced
- [ ] В кабинете доступен блок срока TTL на масштабе мембраны; fail-closed ветка генератора не регрессирует в `null`
- [ ] Смоук двери зелёный (или отдельный failing-тест с явным вердиктом «блокер», не «тихо красное»)
- [ ] M4-квоты **не** входят в diff; PR готов к слову владельца на мердж (не слит самовольно)

## Сознательно не делаем сегодня

- Старт L-кандидатов `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового слова владельца
- Боевой проход гейта `secret-parser-built` и правки архива сессий (только dry-run/черновик манифеста — не ствол)
- DSP/FFT «Этап 1.A» / benchmark harmonic+cepstral+flux / stage-gate free-v1 / «разведка» yamnet
- `node-duty-ready` (Studio на Firebat старая) и `archive-quota-direction` как код-спринт (узел 82% — шторм-кандидат, не сегодняшняя полоса)
- M4-квоты выемки Open API
- `detector-scoreboard` / содержимое `CURRENT_TASK.md` как канон дня
- Разворачивание diff sample-move / `isReadOnlyCollection` под флаки тестов вместо вердикта помеха vs pre-existing

## Вторично (если останется время)

1. Issue-вердикт по красным media-library/background-cabinet (#2266 timeout-класс; #2256 false red) — чтобы вечером merge-очередь не стояла на том же месте.
2. Черновик манифеста ротации по dry-run резака (критерий (в) гейта `secret-parser-built` не закрываем боевым проходом).

## Зависимости и риски

- **Блокер:** без HTTP-ручки API остаётся мёртвым при зелёном смоуке адаптеров — ложная «готовность» коворка.
- **Риск:** принять флаки `#2266`/`#2256` за регресс product-merge и раздуть diff двери посторонними фиксами media-library/cabinet.
- **Риск:** снова назвать дверь «строками сборки координатора» и уйти в обвязку без controllers — повтор вчерашнего зазора.
- **Зависимость:** слово владельца на мердж #2267+дверь; до слова — только готовый проверяемый артефакт.
- **Риск шва:** расхождение имён временного поля ключа (M2 `trackUrl` vs лемма M4 `temporaryKey`) — закрывать явно в контракте двери, не молча.

## Ссылки

- `docs/DAILY_STANDUP.md` — стендап 2026-09-03 (P0 merge-хвост = санитария, не магистраль)
- `docs/tasks/main-day-assertions.json` — `sources[0].claim` owner-choice 03.09 (`library-open-api-door`)
- `docs/meeting/library-open-api/EPIC.md` — заседание / контракт Open API
- PR #2267 — база коворка ownership/contract/key-ttl
- `docs/STRATEGY_DAY.md` — горизонт `secret-parser-built` (веха, не ствол)
- `docs/DAY_PLAN.md` — top-3 до owner-choice; подкрепление/санитария
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — запрет DSP-магистрали «Этап 1.A»