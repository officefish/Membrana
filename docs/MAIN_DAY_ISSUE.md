<!-- Сгенерировано: 2026-09-04T11:28:40.445Z (yarn main-day-issue@1392fdda) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"e4fe6e3cd711c6c980dfad8c37382ec80eb5cd88","digest":"a5a42e34ba7a7e803c8198b867707371dea8638e3d31125f63966878895ea074"},"DAILY_STANDUP":{"version":"e4fe6e3cd711c6c980dfad8c37382ec80eb5cd88","digest":"4c99c628ee72f725f752d083232908162f4c6207d5d8780c5661c090e2c1fa11"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-04

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `library-open-api-door` |
| `primaryTitle` | Дверь открытого API библиотеки: три ручки + ключ + TTL в кабинете |
| `githubIssue` | #2267 (MERGED, review-debt) · #2271 (OPEN, смежный) |
| `size` | L |
| `promptPath` | docs/meeting/library-open-api/EPIC.md |
| `сгенерировано` | 2026-09-04 |

## Магистраль

**library-open-api-door** — закрыть разрыв, зафиксированный владельцем 03.09: коворк ownership/contract/key-ttl уже в стволе (PR #2267 MERGED, ~6k строк, 7 адаптеров, смоук 6/6), но **снаружи API по-прежнему не отвечает** — без контроллеров/маршрутов дверь остаётся обещанием координатора, а не носителем. Сегодняшний мандат — три ручки из вердикта M2 без слоя трансляции: `GET /v1/devices/:deviceId/collections`, `…/:collectionId/samples`, `…/:sampleId/blob`; ключ пробы = `sampleId`; обёртка `items/total/page/limit` **без** `hasMore`; отказы 404 нет / 403 закрыто; credential-bearing ответы — `Cache-Control: no-store`, не в логи. Параллельно: Prisma-модель хранения ключа (миграция, уникальность на `membraneId`) и блок настроек срока ключа в кабинете (масштаб выключателя — мембрана). M4-квоты и `node-duty-ready` / `archive-quota-direction` — вне ствола по слову владельца.

**Критерий успеха к вечеру:** снаружи отвечают три ручки по контракту M2; смоук кабинета на `items/total/page/limit` без скрытой зависимости от `hasMore`; ключ пишется/читается через Prisma с уникальностью на мембрану; review-pass по телу #2267 хотя бы по швам двери (не полный разворот 6k в тот же diff).

## Подкрепление

- **`open-api-contract-seam-cabinet`** — сверить обёртку `items/total/page/limit` с реальным потребителем кабинета: нет ли скрытого `hasMore`/иного поля; зафиксировать вердикт до выкатки двери (иначе регрессия «зелёный контракт / красный UI»).
- **`#2267-door-review-pass`** — точечный review-pass по MERGED #2267 в зоне ownership → route handlers → blob/no-store: не разворачивать весь oversized-ритуал, а закрыть долг на швах, по которым сегодня строится дверь; OPEN #2271 (blob/no-store) — только как блокер/пара к blob-ручке, без расползания в полный merge-drive.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак до бэкапа + один датированный манифест ротации) снимет амнистию на правку архива и откроет безопасный контур бэкапа сессий — горизонт #592 в фазе approaching, не конкурирует с дверью API как owner-магистраль, но остаётся ближайшей вехой графа.
- Вердикт «помеха vs pre-existing» по красным `#2266` / `#2256` разблокирует product-merge очередь на следующие дни.
- Слово владельца на уверенную выкатку двери библиотеки после смоука кабинета и review-pass — без скрытых регрессий open-API.

## Экспериментальные

- Прогнать `night-triage-secret-scan.mjs` на синтетической фикстуре с тремя заведомо ложными ключами (разные формы) и сравнить выход детектора vs резака (`scripts/lib/secret-redact.mjs`): вырезает ли спаны целиком на пути до бэкапа или только помечает совпадения.
- Набросать однострочную запись манифеста ротации для одного fake-ключа без касания архива: машиночитаем ли формат до датированного прохода.
- Сверить один ответ open-API `items/total/page/limit` с реальным вызовом кабинета (без правки контракта): есть ли скрытая зависимость потребителя от `hasMore`.

## Санитарные

- вердикт «помеха vs pre-existing» по красным `#2266` (порог 5 с vs 5,4–5,6 с) и `#2256` (false red без `dist`) — разблокировать product-merge
- review-debt: развернуть смысл `#2267` (MERGED, ~6021 строка без прохода) на швах двери; OPEN `#2271` (1559 строк, blob/no-store) — статус блокера blob-ручки
- шов «обёртка `items/total/page/limit` vs потребитель кабинета» — нет скрытой зависимости от `hasMore`
- `EXPECTED_PATHS` в `verify-swagger.mjs`: добить scenario edit-lease и node-ручки
- deps-watch 03.09: всплеск `fast-uri` high / `fastify`·`qs` moderate — security-гигиена, не регресс дня

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = `library-open-api-door` (выбор №1 из замороженного снимка library-open-api-door · node-duty-ready · archive-quota-direction) | сессия | owner-choice@chat/magistral-03-09 → `docs/tasks/main-day-assertions.json` `sources[0].claim` | 2026-09-03 |
| Коворк ownership/contract/key-ttl влит; снаружи API не отвечает без контроллеров/маршрутов — дверь = отдельная вещь (порядок 404/403, no-store, обёртка без hasMore) | сессия + код | owner-choice 03.09 + факт ветки (только `library-ownership.module.ts` без handlers на момент выбора) | 2026-09-03 |
| #2267 MERGED (~6k, без разворота review); #2271 OPEN — долг review, не отмена двери | issue | GitHub #2267 / #2271; стендап 04.09 | 2026-09-04 |
| M4-квоты, node-duty-ready, archive-quota-direction — вне ствола | сессия | owner-choice 03.09 (и 02.09) | 2026-09-03 |
| Горизонт дня #592 = веха `secret-parser-built` (approaching), не owner-магистраль | план | `docs/strategy/day-horizon.json` → `STRATEGY_DAY.md` | 2026-09-04 |
| DAY_PLAN 04.09: «магистраль НЕ назначена» + top-3 L (angelina-hostess / assets-container / batch-collection) — **без нового слова владельца** | план | `docs/DAY_PLAN.md` (llm-кандидаты, не freeze→choose) | 2026-09-04 |
| **Расхождение: магистраль взята с `sources[0]` (03.09), assertions не перечеканены под 04.09; morning-gates magistral на сегодня во входах отсутствует; стендап/горизонт тянут `secret-parser-built`, DAY_PLAN — «не назначена».** Оба владельческих контура (источник vs отсутствие свежего choose) спорят свежестью: действующий `sources[0]` остаётся каноном генератора, пока гейт/перечеканка не скажут иначе. Синтез top-3 DAY_PLAN **запрещён**. | план + сессия | У1 31.07; probe freshness; `main-day-assertions.json` vs `DAY_PLAN`/`DAILY_STANDUP` | 2026-09-04 |

**Голоса по различным первоисточникам:** 1 источник owner-choice 03.09 (N отражений в claim/EPIC/встрече — коррелированы); 1 источник горизонта #592 (`secret-parser-built`, не перебивает owner-sources); 1 источник состояния PR 04.09 (#2267 MERGED). **Итог:** primary = `library-open-api-door` по `sources[0]`. «1 источник owner, 1 отражение в assertions; горизонт #592 — отдельный голос вехи, не замена магистрали».

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Снаружи нет живых route handler'ов двери M2 (collections / samples / blob) как публичного open-API | `symbol:collections` / route files media-library open-api **или** отсутствие handlers рядом с `library-ownership.module.ts` | `unknown` — на 03.09 owner зафиксировал «ни одного контроллера»; после merge #2267 **перепроверить маркером до кодирования ручек**. Если handlers уже есть под другими именами — **ПОСЫЛКА НАРУШЕНА**, день = приёмка/шов, не «построить с нуля» (класс marker-fix-17-07). |
| Контракт обёртки без `hasMore` соблюдён в спецификации/типах ответа | `symbol:hasMore` в open-api/media-library contract surface | `unknown` → проверить; при `violated` (hasMore торчит наружу) — вырезать до смоука кабинета |
| Резак секретов «не существует» как работа | `symbol:redactSecrets` в `scripts/lib/secret-redact.mjs` | `violated` (работа с 26.07, #1240/PR #1252) — **не назначать «написать резак» магистралью**; остаток гейта `secret-parser-built` — путь до бэкапа + манифест/amnesty, санитарно/горизонт |

Развилка A/B «строить дверь vs secret-parser как primary»: **нет** — owner-sources задают дверь; secret-parser не подменяет primary. Посылка «ручки отсутствуют» требует утренней перепроверки маркером после #2267.

## Сегодня делаем

1. **Маркер-проверка:** есть ли уже HTTP handlers/collections/samples/blob после merge #2267; результат — в дневной след (holds → строим; violated → приёмка + шов).
2. **Три ручки M2** (если holds): paths без трансляции, `sampleId` как ключ пробы, 404/403, `items/total/page/limit` без `hasMore`, blob/credential-bearing → `no-store`.
3. **Prisma-модель ключа:** миграция + уникальность на `membraneId`; fail-closed к TTL-константе по вердикту M/key-ttl.
4. **Кабинет:** блок настроек срока ключа (масштаб — мембрана), без расползания в M4-квоты.
5. **Смоук шва:** один реальный вызов кабинета против ответа двери — нет зависимости от `hasMore`.
6. **Review-pass точечно** по швам #2267, нужным ручкам; #2271 — только статус к blob.
7. **Не primary:** зафиксировать статус гейта `secret-parser-built` (резак-на-пути vs только детектор; есть ли датированный манифест) — одной строкой в вечерний след, без увода дня.

## Definition of Done (фокус)

- [ ] Маркер «нет handlers двери» перепрогнан после #2267; вердикт holds/violated записан
- [ ] `GET …/collections`, `…/samples`, `…/blob` отвечают по контракту M2 (или приёмка существующих под тем же контрактом)
- [ ] Обёртка списка = `items` + `total` + `page` + `limit`, **без** `hasMore` в публичном JSON
- [ ] 404 vs 403 разведены; нет «угадывания» владельца на приборе без мембраны
- [ ] Credential-bearing / blob: `Cache-Control: no-store`, секреты ключа не пишутся в логи
- [ ] Prisma-модель ключа + миграция + unique(`membraneId`) в стволе или в PR дня
- [ ] Смоук кабинета на список/пробы проходит без скрытого `hasMore`
- [ ] M4-квоты, node-duty-ready, archive-quota-direction **не** открыты в diff дня

## Сознательно не делаем сегодня

- L-кандидаты DAY_PLAN без owner-choose: `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`
- `node-duty-ready`, `archive-quota-direction` как код-спринт; M4-квоты Open API
- DSP-магистраль «Этап 1.A» / benchmark harmonic+cepstral+flux / stage-gate free-v1; `detector-scoreboard` из CURRENT_TASK
- Полный разворот oversized `#2268` / `#2270`; полный рефактор media-library в том же diff, что дверь
- Назначение primary «дописать резак с нуля» — модуль `secret-redact.mjs` уже есть (retired-redact-wrong-address-03-08); гейт #592 — горизонт, не подмена owner-магистрали
- Merge-drive `#2271` без review-pass; амнистия архива «снять датой» вместо предиката гейта

## Вторично (если останется время)

1. Синтетическая фикстура: детектор vs резак на трёх fake-ключах + черновик строки манифеста ротации (подготовка к `secret-parser-built`, без снятия амнистии вручную).
2. Вердикт «помеха vs pre-existing» по `#2266` / `#2256` — одна запись, не рефактор.

## Зависимости и риски

- **Блокер:** если #2267 уже принёс handlers под другими именами, а план дня строит «с нуля» — класс marker-fix; сначала сверка, иначе дубль.
- **Риск шва:** кабинет ждёт `hasMore` или иной формы — зелёный сервис, красный UI; смоук обязателен до слова на выкатку.
- **Риск долга:** #2267 ~6k без разворота — точечный pass по двери, не «весь PR в голове».
- **Расхождение assertions 03.09 vs DAY_PLAN 04.09 «не назначена»:** пока assertions не перечеканены/гейт не выбрал иное — primary остаётся `library-open-api-door`; молчаливый синтез top-3 = ошибка probe.

## Ссылки

- `docs/DAILY_STANDUP.md` — стендап 2026-09-04
- `docs/STRATEGY_DAY.md` — горизонт `secret-parser-built` (#592)
- `docs/DAY_PLAN.md` — 5 слотов; магистраль планом не назначена
- `docs/tasks/main-day-assertions.json` — `sources[0]` owner-choice 03.09 → library-open-api-door
- `docs/meeting/library-open-api/EPIC.md` — заседание / контракт M2
- GitHub #2267 (MERGED), #2271 (OPEN)
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — DSP не магистраль