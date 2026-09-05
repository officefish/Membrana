<!-- Сгенерировано: 2026-09-05T11:15:47.645Z (yarn main-day-issue@da0207b9) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"da0207b91f75bf1c509b77913c502c2db182e5ea","digest":"91225bc9dcec7043419d740d030ce0dc009e74b4c28054cbdba3e6e9f6f10bdc"},"DAILY_STANDUP":{"version":"da0207b91f75bf1c509b77913c502c2db182e5ea","digest":"788abc9a9620c7e8d7311e748fe73aafb1bc0e86bc628e64822c59b90abc3a74"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-05

## Метаданные
| Поле | Значение |
|------|----------|
| `primaryFocusId` | `cabinet-hotfix-2287` |
| `primaryTitle` | Hotfix кабинета: сетка тарифов в образе + mediaFetch без пустого JSON-тела |
| `githubIssue` | #2287 |
| `size` | M |
| `promptPath` | — (фокус по owner-choice; карточка/промпт сверять по реестру) |
| `сгенерировано` | 2026-09-05 |

## Магистраль
**cabinet-hotfix-2287** — закрыть два прод-облома кабинета, зафиксированных замером 04.09: (1) `GET /v1/tariffs → 503 tariff grid unavailable`, потому что `docs/tariffs/tariff-grid.json` есть в git с 29.07, но **не копируется в образ** (Dockerfile берёт только `packages/*`), `TARIFF_GRID_MODE` не задан — промо-путь мёртв по той же причине; (2) `POST /v1/pair → 503 ← media 400 Body cannot be empty`: `mediaHeaders()` ставит `Content-Type: application/json` на **каждый** запрос, включая шесть вызовов без тела (POST/DELETE client-key, POST ensure-reserved + три GET латентно); Fastify 5.10.0 отвечает 400 до гвардов (латентно с 22.08 / #2074, выкатка 04.09 ни при чём).

**Делать:** `COPY docs/tariffs` в образ + зуб «образ несёт сетку» (кандидат-носитель `verify-image-workspace-deps.mjs`, проверить чтением); правило «нет тела → нет Content-Type» **одним местом** в `mediaFetch` + тест; PR с ревью; мердж по слову владельца Б напрямую; выкатка кабинета ведущей по слову (метки отката `rollback-2026-09-04` стоят). **До касания настоящего прибора** — удар по дверям живьём: `GET /v1/tariffs` с сессией → 200 и список; `POST` на несуществующий прибор с JSON-заголовком → 401/404, **не** 400. **Не делать:** fallback на БД без сетки (спрячет отсутствие файла).

**Критерий успеха к вечеру:** образ кабинета отдаёт сетку тарифов (200 + список); pair/media-вызовы без тела не получают 400 от Fastify; зуб на сетку в образе зелёный или явный follow-up; PR влит/готов к слову на выкатку; письменный след «двери живьём» (ok или явный блокер). Ключ узла (истёк 03.09) и дежурство #2284 — **после** хотфикса, руками владельца, не подмена магистрали.

## Подкрепление
- **node-duty-2284** — после хотфикса: ключ узла руками владельца + живое дежурство; без рабочих дверей кабинета дежурство снова упрётся в 503/400.
- **deploy-smoke-tooth-2288** — смоук, который судит **двери** (`/v1/tariffs`, pair-контур), а не только `/health`; иначе «влито и выкачено ≠ работает у человека» повторится.

## Перспективные
- `secret-parser-built` (резак + датированный проход с манифестом ротации) — снять амнистию правки архива и открыть безопасный бэкап сессий с redaction до выгрузки; сегодня **не** primary.
- Живое подтверждение fanout/квоты self-select на узле после вчерашней поставки #2286 — полевая приёмка тарифа на дежурстве, не только merge.
- Апгрейд офиса ≥10.09 — контур `sentry-container` (полный self-hosted, не раньше даты).

## Экспериментальные
- Фикстурный прогон `night-triage-secret-scan.mjs` / `secret-redact` на срезе с заведомо ложным ключом: режет ли контур агрессивно (бэкап = архив без чтения кодом/промптом) или снова только детектит.
- Сухой черновик манифеста ротации на одном датированном фейковом токене (без live-revoke) — хватает ли формы как предикату «один проход с ротацией».
- Сверка пути session-backup «сначала redaction → потом archive» на синтетическом транскрипте: не уезжает ли сырой хвост на сервер до выреза.

## Санитарные
- Review-pass oversized `#2286` (`1f8df30c`, +1455) и `aa7d8995` (+625): швы `proof=self` / GET·POST tariffs / journal / fanout — merge в стволе без разворота; вчерашний BLOCK до письменного вердикта по швам.
- Прогон `lint typecheck test` по cabinet/tariff после merge self-select: тесты есть, полный зелёный прогон не зафиксирован как закрытие DoD.
- Fanout-квота: сервис есть; живое «N узлов обновлено» / отсутствие «зелёный кабинет + старая квота на media» — не подтверждено.
- Ритуальный хвост: `morning-care` fail → r2; claims-probe — 6 «не подтверждено» по вечернему фидбеку.
- deps-гигиена: `fast-uri` (high), `fastify`·`qs` (moderate) — апдейт или accept-risk.

## Почему это магистраль (таблица обоснования)
| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `cabinet-hotfix-2287`, выбор №1 из замороженного снимка (cabinet-hotfix-2287 · node-duty-2284 · deploy-smoke-tooth-2288) | сессия | owner-choice@chat/magistral-05-09 → `docs/tasks/main-day-assertions.json` `sources[0]` | 2026-09-05 |
| GET `/v1/tariffs` → 503: `tariff-grid.json` не в образе; Dockerfile копирует `packages/*`, не `docs/tariffs` | код | замер 04.09 (лог контейнера + прод), Dockerfile кабинета; файл сетки в git с 29.07 | 2026-09-04 |
| POST `/v1/pair` → 503 ← media 400 empty body: `mediaHeaders()` всегда шлёт `Content-Type: application/json` | код | mediaFetch / Fastify 5.10.0; латентно с #2074 (22.08) | 2026-09-04 / 2026-08-22 |
| Не делать fallback на БД без сетки — спрячет отсутствие файла в образе | сессия | тот же owner-claim `sources[0]` | 2026-09-05 |
| До прибора — живой удар по дверям (tariffs 200; pair без тела → 401/404, не 400) | сессия | owner-claim `sources[0]` | 2026-09-05 |
| Урок: «влито и выкачено» ≠ «работает у человека» | сессия | owner-claim 05.09 + выкатка 04.09 | 2026-09-05 |
| Стендап зовёт review-pass `tariff-self-select` (#2286) как «одно главное» | план | `docs/DAILY_STANDUP.md` 2026-09-05 | 2026-09-05 |
| Вчерашняя магистраль владельца была `tariff-self-select` (#2281) | сессия | `sources[1]` owner-choice@chat/magistral-04-09 | 2026-09-04 |
| DAY_PLAN top-3 (angelina-hostess / assets-container / batch-collection) — **кандидаты без owner-choice** | план | `docs/DAY_PLAN.md`; явно «выбор — слово владельца» | 2026-09-05 |
| Горизонт-веха `secret-parser-built` (#592) — approaching, не ствол дня | план | `docs/STRATEGY_DAY.md` / day-horizon | 2026-09-05 |

**Голоса по различным первоисточникам:**  
1. **Owner 05.09 (`sources[0]`)** — единственный голос назначения магистрали → **cabinet-hotfix-2287**.  
2. **Прод-замер 04.09 (код/логи)** — независимый факт поломки дверей; усиливает *содержание* хотфикса, не спорит с выбором.  
3. **Стендап/ревью self-select** — другой предмет (приёмка влитой поставки); **не** перебивает owner-source.  
4. **DAY_PLAN top-3** — снимок кандидатов **без** выбора; коррелирован с генератором плана, **не** с owner-choice 05.09.  

**Итог:** 1 источник назначения (owner 05.09). Отражения стендапа/DAY_PLAN/горизонта **не** синтезируют другую магистраль. Синтез из top-3 или review-pass self-select **запрещён**, пока задан `sources[0]`.

> Расхождение со стендапом **не замалчивается:** стендап держит review-pass #2286 как фокус утра; владельческий `sources[0]` на **сегодня** назначил **cabinet-hotfix-2287**. Магистраль взята из assertions/owner-choice 05.09. Review self-select и fanout — в **Санитарные** / подкрепление после дверей, не primary. Про `morning-gates-state.json` в этом входе данных нет — свежее владельческое слово дня: `sources[0]` от 2026-09-05.

## Посылки
| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Образ кабинета при сборке **не** включает `docs/tariffs/tariff-grid.json` (отсюда 503 grid unavailable) | `file:docs/tariffs/tariff-grid.json` (в git есть) + проверка Dockerfile/`COPY` на отсутствие `docs/tariffs` в контексте образа | `holds` (по замеру 04.09; перепроверить чтением Dockerfile при старте) |
| `mediaHeaders()` / mediaFetch выставляет `Content-Type: application/json` даже без body | `symbol:mediaHeaders` (или фактический символ mediaFetch в cabinet→media client) | `holds` (замер 04.09; подтвердить `git grep` при старте) |
| Fallback «БД без файла сетки» **не** должен маскировать дыру образа | — (норма owner, не code-absence) | норма дня; маркером не опровергается |

Развилка A/B «строить self-select vs hotfix» **снята владельцем 05.09**: primary = hotfix дверей. Посылки «self-select ещё нет» **не** используются — поставка #2286 уже в стволе; остаток = санитарный review, не магистраль.

## Сегодня делаем
1. Прочитать Dockerfile/контекст образа кабинета и путь загрузки `tariff-grid.json`; зафиксировать минимальный `COPY docs/tariffs` (или эквивалент) так, чтобы рантайм видел сетку без fallback-на-пустую-БД.
2. Ввести/починить зуб «образ несёт сетку» (проверить `verify-image-workspace-deps.mjs` как носитель или соседний verify) — failing→green на отсутствии файла.
3. В mediaFetch: **одним местом** — нет body ⇒ нет `Content-Type: application/json`; unit/integration тест на шесть безтелых вызовов (client-key POST/DELETE, ensure-reserved, GET-латентные).
4. PR с ревью швов (grid in image + mediaFetch content-type); мердж — по слову владельца Б.
5. До выкатки на живой прибор: удар по дверям — `GET /v1/tariffs` + session → **200 + список**; POST pair-контура без тела / на несуществующий прибор → **401/404, не 400**.
6. Выкатка кабинета ведущей по слову; откат по меткам `rollback-2026-09-04` если двери красные.
7. Письменный хвост: вердикт дверей ok/follow-up; sanitariy — заметка по review-pass #2286 (швы self/fanout), **без** подмены магистрали.

## Definition of Done (фокус)
- [ ] Образ кабинета содержит тарифную сетку; `GET /v1/tariffs` с сессией → 200 и непустый список (не 503 grid unavailable).
- [ ] Нет fallback-а, который отдаёт тарифы из БД при отсутствии файла сетки в образе.
- [ ] mediaFetch: запросы без body не шлют `Content-Type: application/json`; тест зафиксировал правило.
- [ ] Pair/media-контур на безтелом запросе не падает в Fastify 400 empty body; живая или стендовая проверка → 401/404 на несуществующий прибор, не 400.
- [ ] Зуб/verify «образ несёт сетку» зелёный или заведён явный follow-up-issue с маркером.
- [ ] PR смержен по слову владельца; выкатка — по слову; след отката понятен.
- [ ] Короткий письменный вердикт дня по дверям (ok / block + issue).

## Сознательно не делаем сегодня
- Не стартуем L-кандидаты `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового owner-choice.
- Не делаем `secret-parser-built` (#592) primary — максимум фикстура/черновик манифеста во вторичке.
- Не открываем детекционную магистраль (scoreboard / «Этап 1.A» / benchmark harmonic+cepstral+flux / повтор free-v1).
- Не тащим `library-open-api-door` снова как primary.
- Не размазываем ворота оплаты/промо и не смешиваем приёмку self-select с полевым `node-duty-ready` как **заменой** хотфикса дверей.
- Не трогаем настоящий прибор/дежурство до зелёных дверей; ключ узла — руками владельца **после** хотфикса (#2284 не подменяет #2287).
- Не назначаем primary review-only merge #2286 вопреки `sources[0]`.

## Вторично (если останется время)
1. Письменный mini-verdict по швам #2286 (`proof=self`, fanout/sync квоты) + `lint typecheck test` cabinet/tariff — закрыть вчерашний BLOCK как санитарию.
2. Фикстура detector vs redact **или** черновик строк манифеста ротации под гейт `secret-parser-built` — без претензии на веху дня.

## Зависимости и риски
- **Блокер продукта:** без сетки в образе и без фикса mediaFetch кабинет/pair остаются 503/400 — self-select и дежурство бесполезны «у человека».
- **Ключ узла истёк 03.09** — дежурство 04.09 не состоялось; после хотфикса нужен ручной ключ владельца (#2284), иначе полевая проверка fanout снова откладывается.
- **Риск ложного зелёного:** смоук только на `/health` (см. пробел deploy-smoke-tooth-2288) — двери должны входить в приёмку выкатки.
- **Откат:** метки `rollback-2026-09-04` есть; выкатка только по слову, с путём назад.

## Ссылки
- `docs/DAILY_STANDUP.md` — стендап 2026-09-05 (контекст; primary перебит owner-choice)
- `docs/tasks/main-day-assertions.json` — `sources[0]` cabinet-hotfix-2287
- `docs/DAY_PLAN.md` — top-3 без выбора; санитария/подкрепления
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built` (не ствол)
- GitHub #2287 (hotfix) · #2284 (duty, после) · #2288 (smoke tooth) · #2286 (self-select review, санитария)