<!-- Сгенерировано: 2026-09-08T08:32:00.789Z (yarn main-day-issue@8fa1ba4a) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"22c2a3e57141e000d1c9278233d3e26c790f0997","digest":"291b4697c2305fb846475cf2821da8e0c27f61692e9a51765fc467ae7bda04f1"},"DAILY_STANDUP":{"version":"22c2a3e57141e000d1c9278233d3e26c790f0997","digest":"012de2f878b55cf2e45d9f0bf45b2fc30ac46794aec5059e1997df055d2f5ba4"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cabinet-deploy-smoke-tooth-2288, cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-08

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-canon-transitions-2329` |
| `primaryTitle` | Канон тарифов и поведение сервера при переходах (буфер 1 ГБ · upgrade/downgrade · переполнение · знание прибора) |
| `githubIssue` | #2329 |
| `size` | L |
| `promptPath` | — (фокус по owner-choice из замороженного снимка; карточка/промпт — по реестру `tariff-canon-transitions-2329`) |
| `сгенерировано` | 2026-09-08 |

## Магистраль

**tariff-canon-transitions-2329** — единственный обязательный мандат дня: письменно зафиксировать канон «буфер 1 ГБ на **всех** тарифах» и **проверяемое** поведение сервера (и знания прибора) при переходах free ↔ observatory ↔ checkpoint и при эпизоде переполнения. Вчерашний `cowork-buffer-full-stop` закрыл stop/413/плашку, но на дежурстве прибор снова упирается в буфер: без единого контракта «лимит одинаков / что делает сервер при смене тарифа / что знает прибор» stop-контур дыряв на границах сетки. Замер прод 08.09 (ствол `d0bcf8aa`): `tariff-grid.json` — `storage.buffer = 1 ГБ` у всех; база кабинета — `bufferQuotaBytes` 1 ГБ; расхождение сетка↔база по free `storage.hot` (512 МБ vs 1 ГБ); после self-перехода free→observatory userStorage 2 ГБ доехало, buffer 1 ГБ по канону — ожидание «на старшем тарифе буфер больше» в каноне **отсутствует**. Критерий успеха к вечеру: (1) канон 1 ГБ buffer везде принят как единственная правда сетки; (2) политика upgrade (закрытие эпизода переполнения при росте иных лимитов, знание прибора о переходе) и downgrade (занято > нового лимита: отказ / принять с переполнением / грация + stop по M1, вещдоки не трогать) зафиксированы и проверяемы; (3) прибор получает/держит знание лимита без «записи в никуда»; (4) расхождение free hot закрыто либо явным пересевом, либо принятым ADR «сетка — истина».

## Подкрепление

- **studio-stop-freeze-2328** — зависание Студии при STOP на доске после закрытия окна; контракт «полный буфер» руками владельца уже ок (окно/плашка/статус), остаётся fail-closed stop UI без клиппинга и без ложного «ещё пишем».
- **team-debts-review-media** — построчный ревью oversized MERGED #2314 / #2316 / #2324; вердикт по локальным красным `@membrana/media-library-service` / `@membrana/background-media` при зелёном CI; хвосты #2313 В, красные #2311 / #2312 Г — без разворота в продуктовую тему дня.

## Перспективные

- Прохождение `secret-parser-built` (резак + датированный проход с манифестом ротации) снимает амнистию на правку архива и открывает безопасный бэкап сессий без сырых секретов на сервере.
- Зелёный test+build `media-library-service` / `background-media` разблокирует следующий коворк/интеграции в buffer/media.
- Калибровка сторожа и разгрузка буфера до следующего дежурства — окно живой записи с рабочим D1 и местом под ночной улов.

## Экспериментальные

- Сверить один self-переход free→observatory на копии каталога/стейджа: до/после `bufferQuotaBytes`, `userStorage`, ответ прибора на лимит — без догадок «буфер вырос».
- Прогнать downgrade-сценарий «занято > нового лимита» на фикстуре (отказ vs грация vs stop) и зафиксировать, какой из трёх путей канон выбирает до кода.
- Dry-run пересева free `storage.hot` 512 МБ → 1 ГБ идемпотентным скриптом/миграцией на копии БД — узнаем, молчит ли повторный прогон.

## Санитарные

- Построчный ревью oversized MERGED без разворота: #2314 / #2316 / #2324 (`yarn code-review:pr`).
- Красный test+build `@membrana/media-library-service` и `@membrana/background-media` — P1-хвост до любой новой интеграции в buffer/media.
- Smoke аудио-пути после media@17473545: запись → квота → отказ/hold → три дороги UI, без клиппинга и «записи в никуда».
- Граничные условия буфера (#2314/#2324): равенство квоте, +1 байт, fail-closed stop, порог N отказов.
- Ритуальная помеха: автозабор артефактов + сверка свежести `MAIN_DAY_ISSUE` с фактом дня (не тащить вчерашний мандат).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец 08.09: магистраль — `tariff-canon-transitions-2329`; «темой сегодняшнего дня будет уточнение канона и корректное поведение сервера при переходах…»; «магистраль подтверждаю»; выбор №1 из снимка (tariff-canon-transitions-2329 · studio-stop-freeze-2328 · team-debts-review-media) | сессия | owner-choice@chat/magistral-08-09 → `docs/tasks/main-day-assertions.json` `sources[0]` | 2026-09-08 |
| Фокус стендапа дня = канон тарифов / #2329, буфер 1 ГБ, upgrade/downgrade, переполнение, знание прибора | план | `docs/DAILY_STANDUP.md` (отражение owner-choice 08.09, не независимый выбор) | 2026-09-08 |
| Замер прод: buffer 1 ГБ у всех в сетке и базе; free hot 512 МБ vs 1 ГБ; после free→observatory buffer остался 1 ГБ | код | ствол `d0bcf8aa` + `docs/tariffs/tariff-grid.json` + база Tariff / userStorage (замер в claim владельца) | 2026-09-08 |
| Контракт «полный буфер» руками на приборе работает; STOP-freeze Студии — #2328 | сессия / issue | слово владельца 08.09 + issue #2328 | 2026-09-08 |
| Не primary: angelina-hostess-impl / assets-container / batch-collection-run-contour без нового owner-choice | план | `docs/DAY_PLAN.md` top-3 + стендап «сознательно не делаем» | 2026-09-08 |
| Не магистраль: `secret-parser-built` (#592) — веха горизонта, санитарный/экспериментальный хвост | план | `docs/STRATEGY_DAY.md` gate `secret-parser-built` | 2026-09-08 |
| Детекционный контур / Этап 1.A / free-v1 benchmark — не магистраль | код | `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; `detection-planning-priorities` | 2026-06-14 / канон |

**Счёт голосов по различным первоисточникам:** 1 источник owner-choice 08.09 (стендап и формулировка фокуса — **1 источник, 2 отражения** того же выбора). Независимые подпоры: замер кода/прода 08.09; issue #2328 как подкрепление, не конкурент. Синтез из DAY_PLAN top-3 **запрещён** — owner-source задан. Расхождение с top-3 плана: план не назначал магистраль (Q1), ждал слово владельца; слово пришло → `tariff-canon-transitions-2329`. Гейт `morning-gates-state.json` / `magistral` в этом прогоне **не** перебил `sources[0]` (свежий owner-choice того же дня); перечеканка assertions не требуется по У1.

## Посылки

Развилки A/B по «работы ещё нет» в смысле отсутствующего символа **нет**: предмет дня — **канон и контракт переходов**, не missing `fuse*`. Посылки отсутствия работы текущими маркерами probe (file/test/symbol) для «политика downgrade не записана» **невыразимы** честно → не выдумываем суррогат.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Сетка уже несёт buffer 1 ГБ на всех тарифах | `file:docs/tariffs/tariff-grid.json` (`storage.buffer`) | `violated` как «работы нет» — **канон buffer в сетке УЖЕ есть**; день = поведение переходов + закрытие расхождений, не «вписать 1 ГБ с нуля» |
| Ожидание «старший тариф → больший buffer» отсутствует в каноне | замер claim 08.09 + сетка | `holds` (ожидание продукта ≠ код) — фиксируем явно в каноне дня |

**развилки нет, посылок «построить отсутствующее» не требуется** — мандат: уточнить канон, серверные переходы, знание прибора; при `violated` «буфера нет в сетке» работу «ввести 1 ГБ» **не** назначать.

## Сегодня делаем

1. Зафиксировать **письменный канон**: buffer = 1 ГБ на всех тарифах; что растёт на старших (nodes, hot/cold), что не растёт (buffer).
2. Описать и согласовать **upgrade**: лимиты, закрытие эпизода переполнения при росте релевантного лимита (носитель #2319), доставка знания прибора о новом лимите (#2323).
3. Описать и согласовать **downgrade**: занято > нового лимита — одна выбранная политика (отказ / принять сверху / грация) + stop по M1; вещдоки не трогать; same_tariff и параллельная смена — явно.
4. Закрыть или ADR-нуть расхождение **free storage.hot** сетка 512 МБ ↔ база 1 ГБ; принцип «сетка — единственная правда», пересев идемпотентно.
5. Проверяемый след: прибор после перехода **держит** актуальный buffer/quota без записи в никуда (smoke или протокол на стейдже/приборе по слову владельца).
6. Подкрепление: минимальный bug-pass по #2328 (STOP-freeze) **без** подмены магистрали.
7. Санитария параллельно: старт построчного ревью #2314/#2316/#2324 и статус красных media (вердикт, не полный рефакторинг).

## Definition of Done (фокус)

- [ ] Канон «buffer 1 ГБ на всех тарифах» записан в принимаемом артефакте дня (док/ADR/issue #2329) без двусмысленности «старший = больший buffer».
- [ ] Поведение сервера на **upgrade** специфицировано и проверяемо (лимиты, эпизод переполнения, ответ API).
- [ ] Поведение сервера на **downgrade** при occupied > new limit — одна явная политика + stop/M1, вещдоки сохранены.
- [ ] Правило знания прибора о лимите после перехода (#2323-контур) названо; нет «молчаливой» записи сверх квоты.
- [ ] Расхождение free `storage.hot` сетка↔база закрыто кодом/пересевом **или** принятым ADR с датой.
- [ ] same_tariff и гонка параллельной смены тарифа упомянуты в каноне (есть/как обрабатываем).
- [ ] К вечеру: короткий протокол проверки (ручной или авто) «до/после перехода» по bufferQuota и ответу прибора.
- [ ] #2329 не подменён UI-only или quota-only фиксом без контракта перехода.

## Сознательно не делаем сегодня

- Не поднимаем в primary L из top-3 без owner-choice: `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`.
- Не делаем `secret-parser-built` (#592) магистралью — только санитарный/экспериментальный хвост при слоте.
- Не открываем детекционный контур (scoreboard / DSP benchmark / «Этап 1.A» / повтор free-v1).
- Не стартуем новый cowork в buffer/media, пока красный test+build media-library / background-media не погашен или не вынесен вердиктом.
- Не разворачиваем oversized #2314/#2316/#2324 как продуктовую тему дня — только точечный bug-pass/санитария.
- Не чиним «только UI» или «только квоту» в обход контракта перехода тарифа.

## Вторично (если останется время)

- Черновик полей манифеста ротации / dry-run резака на фикстуре (горизонт #592) — без смены primary.
- Точечный fix STOP-freeze #2328, если канон переходов уже в стабильном тексте.

## Зависимости и риски

- **Риск:** починить плашку/квоту без контракта upgrade/downgrade → снова дыра на границе сетки при следующем self-переходе.
- **Риск:** молчаливое «буфер должен расти на старшем тарифе» против канона 1 ГБ — конфликт ожиданий оператора; снимать текстом канона, не догадкой в коде.
- **Блокер мягкий:** красные media test+build — не блокируют текст канона, но блокируют новый buffer/media cowork.
- **Зависимость:** носители #2319 (эпизод переполнения), #2323 (знание прибора), сетка `docs/tariffs/tariff-grid.json` и база Tariff должны читаться из одного источника правды.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md)
- [docs/DAY_PLAN.md](./DAY_PLAN.md)
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md)
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json) — `sources[0]` owner-choice 08.09
- GitHub Issue #2329 (канон/переходы); подкрепления #2328, #2314, #2316, #2324, #2319, #2323
- [docs/tariffs/tariff-grid.json](./tariffs/tariff-grid.json)
- [docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — не детект-магистраль