<!-- Сгенерировано: 2026-09-06T08:38:47.571Z (yarn main-day-issue@402417db) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"da0207b91f75bf1c509b77913c502c2db182e5ea","digest":"663e5b30597f2ab8f232cd9d0c774080133ead193ec54871b83212f92b6dcd73"},"DAILY_STANDUP":{"version":"da0207b91f75bf1c509b77913c502c2db182e5ea","digest":"049248207a2f6f04fdafee458bacbad910f25501d298b6514c9ebd84dad0f557"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-06

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `cabinet-hotfix-2287` |
| `primaryTitle` | Приёмка cabinet-hotfix-2287: oversized-швы, зелёные проверки, живой удар по дверям |
| `githubIssue` | #2287 |
| `size` | M |
| `promptPath` | — (фокус вне отдельного task-промпта; носитель — hotfix/приёмка по owner-choice 05.09) |
| `сгенерировано` | 2026-09-06 |

## Магистраль

Довести **приёмку** `cabinet-hotfix-2287` до письменного ok/follow-up и живого доказательства, что кабинет снова отвечает «у человека», а не только «влито в ствол». Вчерашний вечерний review дал **BLOCK** на продуктовую приёмку: hotfix в стволе, но швы oversized-коммитов `aafd9ce0` / `29e71db0` («tariff-grid в образе», `mediaFetch` без `Content-Type` на безтелых вызовах) не развёрнуты, двери не пробиты. Без этого выкатка и `#2284` (ключ/дежурство) снова упрутся в 503/400.

Критерий успеха к вечеру: (1) письменный ok или явный follow-up-issue по двум oversized; (2) зуб «образ несёт сетку» green **или** follow-up с владельцем; (3) след живого удара — `GET /v1/tariffs` → 200+список; pair/без body → 401/404, **не** 400; (4) `lint` / `typecheck` / `test` по cabinet/tariff зелёные; (5) мини-вердикт `#2286` только как санитария, не primary.

## Подкрепление

- `node-duty-2284` — после зелёных дверей: ключ узла руками владельца и контур дежурства; не трогать живой прибор, пока `GET /v1/tariffs` и pair-двери не дают ожидаемые коды.
- `deploy-smoke-tooth-2288` — смоук, который судит двери продукта, а не только `/health`; усиливает приёмку hotfix и не подменяет её.

## Перспективные

- Живой удар по дверям кабинета откроет слово владельца на выкатку, ключ узла (#2284) и полевое дежурство.
- Прохождение гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) снимет амнистию правки архива и разблокирует бэкап сессий без сырых секретов.
- Санитария #2286 (fanout/квота self-select) письменно закроет хвост hotfix и откроет следующий кабинетный контур без BLOCK на приёмку.

## Экспериментальные

- Прогнать `night-triage-secret-scan.mjs` в режиме «только детектор» по 5–10 синтетическим фикстурам (fake keys + ложные паттерны) — где детектор шумит до резака.
- На копии одного архивного транскрипта (не прод) — dry-run вырезания по `secret-parser-cuts-aggressively` и сравнение «до/после» глазами.
- На одном ключе-заглушке набросать черновик манифеста ротации (дата, scope, статус) без реальной ротации — минимальный набор полей для датированного прохода гейта.

## Санитарные

- oversized `aafd9ce0` (#2287) и `29e71db0` — развернуть швы «tariff-grid в образе» / «mediaFetch без Content-Type»; письменный ok или follow-up (BLOCK ревью)
- #2286 fanout/квота self-select — mini-verdict, закрыть вчерашний санитарный BLOCK письменно
- claims-probe 05.09: 3× «не подтверждено» (#2293/#2295/aafd9ce0) + 2 сомнения (карточки hotfix/verify-image в реестре) — сверить утверждения со стволом
- помеха автозабора ритуала: `29e71db0` (+622) всплыл как «Помеха №1» — отделить от топлива дня, не тащить в primary
- хвост coverage mediaFetch: безтелые вызовы (все шесть: POST/DELETE client-key, ensure-reserved, GET-латентные), не только pair-POST

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `cabinet-hotfix-2287` (выбор №1 из снимка cabinet-hotfix-2287 · node-duty-2284 · deploy-smoke-tooth-2288) | сессия | owner-choice@chat/magistral-05-09 → `docs/tasks/main-day-assertions.json` `sources[0].claim` | 2026-09-05 |
| Замер: `GET /v1/tariffs` → 503 (tariff-grid не в образе); `POST /v1/pair` → 503←media 400 (Content-Type на безтелых) | код / сессия | прод-лог + воспроизведение 04.09; Dockerfile без `docs/tariffs`; `mediaFetch`/`mediaHeaders` | 2026-09-04 |
| Вчерашний review: **BLOCK** на продуктовую приёмку — швы не развёрнуты, двери не пробиты | план / сессия | `docs/DAILY_STANDUP.md` (фокус дня 06.09) ← вечерний DAILY_CODE_REVIEW | 2026-09-05/06 |
| Стендап 06.09: одно главное = довести приёмку `cabinet-hotfix-2287` | план | `docs/DAILY_STANDUP.md` | 2026-09-06 |
| DAY_PLAN top-3 (angelina-hostess / assets-container / batch-collection) — **кандидаты**, не выбор; «магистраль НЕ назначена планом» | план | `docs/DAY_PLAN.md` | 2026-09-06 |
| У1: `morning-gates-state.json` с `magistral` на day=сегодня в контексте ритуала **не передан** как более свежий owner-gate → магистраль = `sources[0]` (05.09), не синтез из top-3 L | снимок-хардкод | правило У1 31.07 + отсутствие свежего gate-magistral в поданных входах | 2026-09-06 |
| Горизонт #592 `secret-parser-built` — веха approaching, **не** primary (стендап: max фикстура/черновик во вторичке) | issue / план | `docs/STRATEGY_DAY.md` + standup «что сознательно не делаем» | 2026-09-06 |

**Голоса:** 1 владелецский источник магистрали (`sources[0]`, 05.09) + согласованные отражения замера/BLOCK/standup (1 коррелированная цепочка «hotfix не принят у человека»). Top-3 DAY_PLAN — **другой** снимок без owner-choice; синтезировать магистраль из него **запрещено**. Итог: **cabinet-hotfix-2287**.

## Посылки

развилки нет, посылок не требуется

(Работа hotfix уже в стволе; день = **приёмка и разворот швов**, не «построить с нуля». Маркеры приёмки — живые двери и зубы образа, не assertion «символа нет».)

## Сегодня делаем

1. Зафиксировать статус oversized `aafd9ce0` / `29e71db0`: что влито, что не развёрнуто в образе/рантайме; письменный ok **или** follow-up-issue.
2. Проверить/добить COPY `docs/tariffs` (tariff-grid) в образ кабинета + зуб «образ несёт сетку» (носитель-кандидат: `verify-image-workspace-deps.mjs`) → green или явный follow-up.
3. Правило «нет тела → нет `Content-Type`» в `mediaFetch` одним местом + тест; покрытие всех шести безтелых вызовов.
4. Зелёный контур `lint` / `typecheck` / `test` по cabinet/tariff.
5. Живой удар по дверям: `GET /v1/tariffs` (с сессией) → **200 + список**; pair / запрос без body → **401/404**, не 400; сохранить след (лог/заметку приёмки).
6. Мини-вердикт `#2286` (fanout/квота self-select) — санитария, письменно закрыть BLOCK-хвост.
7. Сверить claims-probe 05.09 (#2293/#2295/aafd9ce0 + карточки hotfix/verify-image) со стволом.

## Definition of Done (фокус)

- [ ] Письменный ok или follow-up-issue по oversized `aafd9ce0` и `29e71db0`
- [ ] Зуб «образ несёт tariff-grid» green **или** заведён явный follow-up с владельцем
- [ ] `mediaFetch`: безтелые запросы не ставят `Content-Type: application/json`; тест(ы) на шесть вызовов
- [ ] `lint` / `typecheck` / `test` cabinet/tariff — green
- [ ] Живой след: `GET /v1/tariffs` → 200 + непустой список тарифов
- [ ] Живой след: pair/без body → 401/404, **не** 400 (не 503 из-за media 400)
- [ ] Нет fallback «БД без сетки», маскирующего отсутствие файла в образе
- [ ] BLOCK продуктовой приёмки снят или заменён датированным follow-up с критерием

## Сознательно не делаем сегодня

- Не стартуем L из top-3: `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового owner-choice
- Не делаем `secret-parser-built` (#592) primary — максимум фикстура резака или черновик манифеста во вторичке
- Не открываем детекционную магистраль (scoreboard / «Этап 1.A» / benchmark harmonic+cepstral+flux / повтор free-v1)
- Не подменяем фокус review-only merge `#2286` и не ставим его primary
- Не трогаем живой прибор и полевое дежурство до зелёных дверей
- Не выкатываем «на авось» и не считаем «влито ≠ работает у человека» закрытием дня

## Вторично (если останется время)

- Фикстура «детектор vs резак» на `night-triage-secret-scan` / `secret-redact` (подкрепление гейта #592, не primary)
- Черновик датированного манифеста ротации засвеченных ключей (без реальной ротации прод-ключей)

## Зависимости и риски

- **Блокер приёмки:** без удара по дверям нельзя честно открыть `#2284` / дежурство — ключ узла истёк 03.09, дежурство 04.09 не состоялось.
- **Риск образа:** tariff-grid в git с 29.07, но Dockerfile копирует только `packages/*` — регресс 503 останется, если зуб образа не зелёный.
- **Риск media/Fastify 5:** `Content-Type` на пустом body → 400 до гвардов; латентно с 22.08 (#2074) — правка должна быть одним местом, иначе partial fix.
- **Риск расползания:** DAY_PLAN top-3 L и горизонт #592 конкурируют за внимание; primary держим на hotfix-приёмке по `sources[0]`.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md)
- [docs/DAY_PLAN.md](./DAY_PLAN.md)
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md)
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json) — `sources[0].claim` (owner 05.09: cabinet-hotfix-2287)
- GitHub Issues: #2287 (hotfix), #2286 (санитария), #2284 (дежурство, после дверей), #2288 (smoke-tooth)