<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-23
  archived-at: 2026-09-23T16:47:50.682Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-23T12:20:45.645Z (yarn main-day-issue@cff2a664) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"cff2a664b07119d97625fca6886f23d478a0a2e2","digest":"a841de5027aeeaa8e4d47a7aa80a760b6ff986faf7339436615175a1df9389fd"},"DAILY_STANDUP":{"version":"cff2a664b07119d97625fca6886f23d478a0a2e2","digest":"5cc9c4c80202dee9183009cb3ce99b6a8246ec80f6afd9feee47882870e0ecc8"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-23

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Выкатить регистрацию по промокоду в прод: офис → кабинет → лендинг → сквозная приёмка |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md |
| `сгенерировано` | 2026-09-23 |

## Магистраль

**Магистраль взята из `sources[0].claim` (`main-day-assertions.json`, owner-choice 23.09) — ответ владельца «1» на замороженный снимок топ-3 (cabinet-registration-rollout · morning-truth-fixes · tariff-transitions-live-day3). Стендап 23.09 назначил фокусом `angelina-hostess-impl` самостоятельно — это выбор скрипта-генератора, не владельца; норма owner-choice его отменяет.**

Эпик регистрации по приглашению (#2369) полностью влит в ствол (двери офиса, клиент офиса в кабинете, регистрация по коду, лендинг, форма — пять PR, все в `main`). Единственное, чего не хватает до закрытия #2369, — это боевая выкатка: офис-стек на VDS через туннель, переменные `OFFICE_URL` / `OFFICE_API_TOKEN` / `ALLOW_REGISTRATION=true` в `/etc/membrana/cabinet.env`, деплой образа кабинета, обновление лендинга на `membrana.space` и сквозная ручная приёмка владельцем (промокод в панели → форма «Создать учётную запись» → 201 + вход на free-v1 → повтор кода → 409 → отзыв → «Регистрация не принята»).

**Критерий успеха к вечеру:** второй аккаунт владельца живёт на проде на free-v1; Issue #2369 и контейнер заседания `cabinet-registration-promo` закрыты.

## Подкрепление

- **Генератор стендапа — источник магистрали.** Переключить `scripts/_daily-standup.mjs` на чтение магистрали из `docs/tasks/main-day-assertions.json` (`sources[0].claim`), а не из собственного синтеза. Третий день подряд стендап-генератор самостоятельно назначает иную магистраль (`secret-parser-built`, `angelina-hostess-impl`, сегодня снова не то) — это P1-расхождение, лечится одним патчем в скрипте. Результат: завтра утром стендап и MAIN_DAY_ISSUE называют одну магистраль.
- **`friction`-запись в trail 22–23.09.** Добавить запись в `docs/procedure-runs/trail` за период 22–23.09: B10 из code-review — «ноль трений при реальном сбое `morning-care` / панели». Без записи следующий аудитор прочтёт «ноль трений» и сочтёт дни безупречными. Одна строка JSONL, не работа.

## Перспективные

- **ADR по контуру регистрации** («панель → офис → кабинет»): четыре модуля, три границы, один внутренний ключ — после приёмки боевой выкатки оформить как архитектурное решение, чтобы следующая сессия не переоткрывала границы.
- **CI-предикат периметра сессии.** Добавить в CI проверку `git diff --name-only` против `allowed-paths` сессии — автоматически ловит дрейф PR без ручного контроля архитектора; кандидат в подкрепление следующего дня.
- **`cabinet-registration-rollout` → разблокировка `tariff-transitions-live-day3`.** После закрытия #2369 и подтверждённого прода тарифный переход получает живую базу пользователей; следующая магистраль — слово владельца из нового замороженного снимка.

## Экспериментальные

- **Проба: `friction` как инвариант trail-агрегатора.** Если trail-агрегатор получает пустой `friction[]`, но последнее code-review несёт B-находки — pipeline кладёт `warn`. Узнаем: можно ли machine-readable способом отловить «ноль трений при реальном гапе» до следующей сессии, не дожидаясь аудитора.
- **Проба: смоук панели шаг 6 как gate перед деплоем кабинета.** В скрипте `_ssh-panel-smoke.mjs` шаг 6 (`mint cabinet-register → 401 → check → redeem → 409 → 400 → revoke`) при красном результате блокирует деплой образа кабинета. Узнаем: достаточно ли это простое условие, чтобы никогда не выкатывать кабинет без живого офиса.
- **Проба: `main-day-probe` печатает вердикт сверки sources[0] vs стендап-магистраль.** Добавить в пробник строку сравнения: если `sources[0].claim` не совпадает с магистралью в `DAILY_STANDUP.md` — печатать `WARN: magistral drift` (зелёный не ломать). Узнаем: ловится ли расхождение автоматически каждое утро до того, как его заметит человек.

## Санитарные

- Добавить `friction`-запись в `docs/procedure-runs/trail` за 22–23.09 (B10: `morning-care` / панель — гап без диагноза, «ноль трений» ложное)
- Разобрать lint-warning `react-hooks/exhaustive-deps` (`titleOf` в `useCallback`) в `apps/cabinet` — одна строка
- Диагноз красного CI по `@membrana/media-library-service` / `@membrana/background-media` — один абзац (ствол и ночи зелёные, вероятно призрак #2345; подтвердить и закрыть тему)
- Плавающий тест `journal/selection/chain-rehearsal.test.ts` (#2399) — стабилизировать или изолировать; висит без диагноза второй день
- Перечеканить `scripts/_daily-standup.mjs`: источник магистрали → `main-day-assertions.json` `sources[0]`, не синтез (подкрепление дня, P1-риск)

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `cabinet-registration-rollout`; ответ владельца «1» на замороженный снимок топ-3 | owner-choice | `docs/tasks/main-day-assertions.json` `sources[0]`, реплика владельца `chat/magistral-23-09` | 2026-09-23 |
| Эпик #2369 целиком в стволе (пять PR влиты: `ad9abd13`, `03e61bb5`, `2dbc1ae2`, `b5a6a147`, `3f338b21`) | код | `git log main` / замер ствола `271e9164` (утро 23.09, `sources[0]`) | 2026-09-23 |
| Прод не выкатан: `/etc/membrana/cabinet.env` не содержит `OFFICE_URL` / `ALLOW_REGISTRATION`; лендинг старый | код / сессия | замер ствола и смоук-факт в `sources[0]` | 2026-09-23 |
| Стендап 23.09 назначил `angelina-hostess-impl` — это синтез генератора, не owner-choice | план | `docs/DAILY_STANDUP.md` (генератор, не владелец) | 2026-09-23 |
| **Расхождение: стендап ≠ `sources[0]`** — магистраль взята с `main-day-assertions.json` (`sources[0]`); `assertions.json` не перечеканен под `angelina-hostess-impl`; норма У1 предписывает назвать расхождение явно | owner-choice vs план | `main-day-assertions.json` `sources[0]` (owner) vs `DAILY_STANDUP.md` (генератор) | 2026-09-23 |
| `angelina-hostess-impl` — кандидат в подкрепление / следующую магистраль, но выбор не подтверждён owner-choice | план | `DAILY_STANDUP.md` / `DAY_PLAN.md` | 2026-09-23 |

*1 независимый владельческий источник (`sources[0]`), остальные строки — подтверждения и контекст из него же или производные.*

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Офис-стек не выкатан на VDS: `OFFICE_URL` отсутствует в `/etc/membrana/cabinet.env` | `file:deploy/generate-cabinet-env.sh` (строка 34: `OFFICE_URL` не задан по умолчанию) + смоук-факт `sources[0]` | holds |
| `ALLOW_REGISTRATION=false` в кабинете: регистрация выключена по умолчанию, флаг не проставлен в проде | `file:deploy/generate-cabinet-env.sh` (строка 34) | holds |
| Лендинг `membrana.space` не обновлён под новую регистрацию | `file:scripts/_ssh-root-site-setup.mjs` (скрипт есть, не прогонялся — смоук-факт `sources[0]`) | holds |

Все три посылки — holds; работа не выполнена, магистраль действительна.

## Сегодня делаем

1. Поднять офис-стек на VDS через туннель: `office-stack` → `/health` → смоук панели `node scripts/_ssh-panel-smoke.mjs` шаг 6 (зелёный = офис жив и кабинетный регистрационный эндпоинт отвечает корректно).
2. Внести в `/etc/membrana/cabinet.env` пару `OFFICE_URL=https://office.mmbrn.tech`, `OFFICE_API_TOKEN=<API_INTERNAL_TOKEN>`, `ALLOW_REGISTRATION=true` (по M3: регистрация включена только при флаге И паре).
3. Задеплоить образ кабинета: `CABINET_IMAGE_TAG=main node scripts/_ssh-cabinet-deploy-image.mjs` (DR0/DR1); проверить `GET /health/deep` → `office_registration: ok`.
4. Обновить лендинг: `node scripts/_ssh-root-site-setup.mjs`.
5. Провести сквозную приёмку владельцем: промокод в панели → форма «Создать учётную запись» → 201 + вход → квота `536870912` → повтор кода → 409 → отзыв → «Регистрация не принята».
6. Закрыть Issue #2369 и контейнер заседания `cabinet-registration-promo`.
7. Добавить `friction`-запись в trail 22–23.09 (санитарный хвост, не блокирует выкатку).

## Definition of Done (фокус)

- [ ] Офис-стек на VDS отвечает `/health`; смоук панели шаг 6 — зелёный
- [ ] `/etc/membrana/cabinet.env` содержит `OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`; `GET /health/deep` → `office_registration: ok`
- [ ] Лендинг `membrana.space` обновлён (`_ssh-root-site-setup.mjs` прогнан)
- [ ] Сквозная приёмка пройдена: второй аккаунт владельца создан через промокод, квота `536870912`, повтор кода → 409, отзыв → «Регистрация не принята»
- [ ] Issue #2369 закрыт; контейнер заседания `cabinet-registration-promo` закрыт
- [ ] `friction`-запись добавлена в trail 22–23.09

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — стендап назначил её магистралью самостоятельно (третий день подряд); owner-choice 23.09 выбрал `cabinet-registration-rollout`; `angelina-hostess-impl` — кандидат на следующий день, не сегодня
- **`batch-collection-run-contour`** — кандидат из снимка топ-3, не выбран владельцем; держим в перспективных
- **`tariff-transitions-live-day3`** — кандидат из снимка топ-3; разблокируется после закрытия #2369
- **`secret-parser-built`** / `amnestyLifted` — вещдок: резак существует (`scripts/lib/secret-redact.mjs`, 18/18 зубов, архивирован 29.07); предикат `amnestyLifted` — отдельный гейт, не сегодняшняя работа
- **DSP-бенчмарки / FFT-калибровка** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); повтор без смены датасета не даёт нового знания
- **`mfcc-compare-sprint`** — ведёт Teamlead, но не магистраль дня; не открывать параллельно
- **Сессии A/B/C/D `cabinet-registration-exec`** (вчерашняя магистраль) — влиты, закрыты; новых сессий не открываем

## Вторично (если останется время)

- Патч `scripts/_daily-standup.mjs`: источник магистрали → `sources[0]` из `main-day-assertions.json` (устраняет P1-расхождение для следующих дней)
- Диагноз плавающего теста `journal/selection/chain-rehearsal.test.ts` (#2399): один абзац с корневой причиной или изоляция `.skip`

## Зависимости и риски

- **Блокер 1:** смоук панели шаг 6 красный → деплой кабинета не производить до зелёного офиса (явное правило из `sources[0]`).
- **Блокер 2:** `OFFICE_API_TOKEN` вносит владелец руками — агент не знает значение токена; без него `/health/deep` → `office_registration` не `ok`.
- **Риск:** стендап-генератор снова синтезирует иную магистраль завтра утром, если патч скрипта не будет сделан сегодня — P1-расхождение продолжится четвёртый день подряд.
- **Риск:** `_ssh-root-site-setup.mjs` меняет лендинг — убедиться, что скрипт не трогает prod-конфиги за пределами своего периметра (CI-предикат периметра сессии пока не поставлен).

## Ссылки

- [`docs/DAILY_STANDUP.md`](../DAILY_STANDUP.md) — стендап 2026-09-23
- [`docs/tasks/main-day-assertions.json`](../tasks/main-day-assertions.json) — owner-choice (`sources[0]`)
- [`docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md`](../meeting/cabinet-registration-promo/MEETING_ACTIVE.md) — порядок выкатки, разъяснения Р1–Р7
- [GitHub Issue #2369](https://github.com/officefish/Membrana/issues/2369) — эпик регистрации по приглашению