<!-- Сгенерировано: 2026-09-24T10:43:39.452Z (yarn main-day-issue@2e4387b7) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"cff2a664b07119d97625fca6886f23d478a0a2e2","digest":"063e099df5e08d5de5a0612ad6fd154dd6bec07a7bc7cdb7b99a69aa182e3995"},"DAILY_STANDUP":{"version":"cff2a664b07119d97625fca6886f23d478a0a2e2","digest":"7879e4e522288ff2036d76b3e02ea5f8a356e35ddd5263a93edf138e2ab1875c"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-24

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Выкатка кабинета с регистрацией по промокоду на прод |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md |
| `сгенерировано` | 2026-09-24 |

## Магистраль

**cabinet-registration-rollout** — выкатить на прод полный стек регистрации по промокоду: офис-стек (смоук шага 6 панели → зелёный), инъекция env-пары `OFFICE_URL`/`OFFICE_API_TOKEN`/`ALLOW_REGISTRATION=true` в кабинет, деплой образа кабинета, обновление лендинга membrana.space, сквозная приёмка владельцем (промокод из панели → форма «Создать учётную запись» → вход → free-v1 квота 536870912 → повтор кода → «Регистрация не принята.»).

Весь код в стволе (`cff2a664`): дверь офиса `ad9abd13` (#2393), клиент офиса `03e61bb5` (#2396), регистрация по коду `2dbc1ae2` (#2397), лендинг `b5a6a147` (#2398), форма `3f338b21` (#2401) — пять PR слиты, продуктовые границы четырёх сессий не нарушены. Сегодня — только эксплуатация, не разработка.

**Критерий успеха к вечеру:** второй кабинет владельца живёт на проде на free-v1; Issue #2369 закрыт; контейнер заседания `cabinet-registration-promo` закрыт.

> **Расхождение — находка (норма У1):** `docs/tasks/main-day-assertions.json` несёт `sources[0].claim` с датой `2026-09-23`, магистраль взята оттуда (`cabinet-registration-rollout`). Стендап 2026-09-24 сам назначил фокусом `angelina-hostess-impl` — это синтез скрипта, не owner-choice. Магистраль взята с `sources[0]` (владелец 23.09), а не из стендапа. `morning-gates-state.json` на сегодняшнюю дату не приходил, поэтому коллизии «гейт vs sources» нет. **`_daily-standup.mjs` снова синтезировал магистраль вопреки `sources[0]` — четвёртый день подряд; перечеканка `main-day-assertions.json` не выполнена; это расхождение само есть находка и вынесено в подкрепление.**

## Подкрепление

- **Патч `_daily-standup.mjs`** — жёстко читать магистраль из `main-day-assertions.json → sources[0].claim`, синтез запретить. Размер S, одна строка. Четвёртый день подряд скрипт назначает магистраль сам (16.09 secret-parser-built → 17.09 angelina-hostess-impl → 18.09 angelina-hostess-impl → 24.09 angelina-hostess-impl) вопреки owner-choice в sources[0]. Снимает P1-расхождение стендап↔owner-choice раз и навсегда; без патча завтра снова получим фантомную магистраль.
- **Закрыть два `runId` с пересекающимися `sequence` в trail-агрегаторе** — пересекающиеся sequence делают trail ненадёжным вещдоком; гейт `secret-parser-built` (следующая веха) требует датированного прохода именно в trail. Размер S, диагноз + правка счётчика.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) откроет снятие амнестии на правку архива — следующая большая веха после закрытия #2369 сегодня.
- `batch-collection-run-contour` (L) — контур пакетного прогона детекторов с манифестом ротации; прямая связь с вехой `secret-parser-built`; кандидат магистрали следующего дня после закрытия rollout.
- ADR по контуру регистрации «панель → офис → кабинет» (четыре модуля, три границы) — принято владельцем 23.09 как подкрепление; оформить до конца спринта.

## Экспериментальные

- **Проба: CI-предикат файлового периметра сессии.** Добавить linting-шаг, проверяющий, что PR не выходит за объявленный файловый периметр сессии — метаданные сессии уже есть в карточках; узнаем, даёт ли это автоматический гейт без ревью-пинга.
- **Проба: `friction`-запись как триггер резака.** Добавить одну JSONL-строку `friction` в trail вручную и прогнать `night-triage-secret-scan.mjs` — проверить, видит ли резак friction-записи или пропускает как безопасные; нужно для валидации trail-агрегатора перед вехой.
- **Проба: смоук панели `_ssh-panel-smoke.mjs` шаг 6 как gate-условие деплоя кабинета.** Проверить, блокируется ли деплой кабинета при красном шаге 6 автоматически или требует ручного решения оператора — результат определит, нужен ли дополнительный CI-шаг.

## Санитарные

- Закрыть P1-расхождение стендап↔`sources[0]` — патч `_daily-standup.mjs`, источник магистрали строго из `main-day-assertions.json`, синтез запретить (четвёртый день)
- Добавить `friction`-запись в trail за 22–23.09 — одна строка JSONL, второй день висит (B10: «ноль трений» при реальном сбое morning-care/панели)
- Закрыть хвост двух `runId` с пересекающимися `sequence` в trail-агрегаторе (P1 из ревью 22.09)
- Lint-warning `react-hooks/exhaustive-deps` (`titleOf` в `useCallback`) в `apps/cabinet` — одна строка, третий день
- Диагноз плавающего теста `journal/selection/chain-rehearsal.test.ts` (#2399) — корневая причина или `.skip`; висит третий день, блокирует CI-доверие
- Убрать дубль `fetchMe` (#2402) — найден при ревью PR серии регистрации

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `cabinet-registration-rollout`; ответ владельца «1» на замороженный снимок топ-3 | сессия | `main-day-assertions.json → sources[0]`, owner-choice@chat/magistral-23-09 | 2026-09-23 |
| Весь код в стволе (`cff2a664`): пять PR слиты (#2393 #2396 #2397 #2398 #2401) | код | git log / PR list | 2026-09-23 |
| Прод не выкатан: OFFICE_URL/OFFICE_API_TOKEN/ALLOW_REGISTRATION отсутствуют в /etc/membrana/cabinet.env; смоук шаг 6 не гонялся | код + сессия | `sources[0].claim` (вещдок факта прода) | 2026-09-23 |
| Стендап 24.09 назначил фокусом `angelina-hostess-impl` — это синтез скрипта, не owner-choice | план | `docs/DAILY_STANDUP.md` (2026-09-24) | 2026-09-24 |
| **Расхождение: магистраль взята с `sources[0]`, assertions не перечеканены** | сессия | `main-day-assertions.json` (//date: перечеканено 23.09) + стендап 24.09 | 2026-09-23 / 2026-09-24 |
| Веха `secret-parser-built` в фазе approaching; rollout не блокирует и не конкурирует с ней | план | `docs/STRATEGY_DAY.md` → `docs/strategy/day-horizon.json` | 2026-09-24 |
| 1 источник (owner-choice 23.09), 1 отражение (стендап цитирует тот же выбор косвенно) | — | — | — |

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Образ кабинета с регистрацией не выкачен на прод — `/etc/membrana/cabinet.env` не содержит `ALLOW_REGISTRATION=true` | `file:deploy/generate-cabinet-env.sh` (строка 34: ALLOW_REGISTRATION=false по умолчанию) + факт из sources[0]: «смоук шаг 6 не гонялся» | holds |
| Лендинг membrana.space не обновлён — старая версия без формы регистрации | `file:apps/landing` + вещдок из sources[0]: «лендинг на membrana.space старый» | holds |
| Смоук панели шаг 6 (`mint cabinet-register → ... → revoke`) не проходился после слияния | вещдок из sources[0] (явное «смоук шаг 6 не гонялся») | holds |

## Сегодня делаем

1. Поднять офис-стек на VDS: туннель → `yarn office:up` → `GET /health` → зелёный.
2. Прогнать смоук панели `node scripts/_ssh-panel-smoke.mjs` шаг 6 (`mint cabinet-register` → 401 → check → redeem → 409 exhausted → 400 иной mode → revoke) — красный шаг 6 = кабинет не деплоить.
3. При зелёном шаге 6: владелец вносит в `/etc/membrana/cabinet.env` три переменные (`OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`); запустить `CABINET_IMAGE_TAG=main node scripts/_ssh-cabinet-deploy-image.mjs` (DR0/DR1).
4. Проверить `GET /health/deep` кабинета → `office_registration: ok`.
5. Выкатить лендинг: `node scripts/_ssh-root-site-setup.mjs`.
6. Сквозная приёмка владельцем: промокод из панели → форма «Создать учётную запись» → 201 + вход → проверить free-v1 квоту 536870912 → повтор кода → «Регистрация не принята.» → отзыв кода.
7. Закрыть Issue #2369; закрыть контейнер заседания `cabinet-registration-promo`.

## Definition of Done (фокус)

- [ ] `GET /health` офис-стека возвращает 200 на VDS
- [ ] Смоук панели шаг 6 — зелёный (все шесть под-шагов прошли)
- [ ] `GET /health/deep` кабинета содержит `office_registration: ok`
- [ ] Лендинг membrana.space обновлён (форма регистрации доступна)
- [ ] Сквозная приёмка пройдена: новый аккаунт создан → free-v1 → повтор/отзыв кода работают
- [ ] Issue #2369 закрыт
- [ ] Контейнер заседания `cabinet-registration-promo` закрыт

## Сознательно не делаем сегодня

- `angelina-hostess-impl` — синтез стендапа, не owner-choice; откладываем до смены магистрали владельцем
- `assets-container` — нет прямой связи с вехой и не выбрана владельцем
- DSP-бенчмарки (harmonic/cepstral/spectral-flux на free-v1) — потолок зафиксирован, повтор без смены датасета/алгоритма не даёт знания
- `mfcc-compare-sprint` — открывать параллельную полосу при незакрытом P1 преждевременно
- `chain-rehearsal.test.ts` как основная работа — только диагноз одной строкой или `.skip`

## Вторично (если останется время)

- Патч `_daily-standup.mjs`: жёстко читать магистраль из `sources[0].claim`, синтез запретить (размер S, одна строка).
- Диагноз `journal/selection/chain-rehearsal.test.ts` (#2399): найти корневую причину или поставить `.skip` с комментарием.

## Зависимости и риски

- **Блокер:** красный смоук шаг 6 панели = кабинет не деплоить; если офис-стек не поднимется — магистраль дня заморожена до восстановления офиса.
- **Риск:** владелец вносит env-переменные вручную — ошибка в `OFFICE_API_TOKEN` даст `office_registration: error` на `/health/deep`; митигация: проверить токен через `GET /v1/internal/cabinet/registration-codes` до деплоя кабинета.
- **Риск:** `_ssh-root-site-setup.mjs` может затронуть prod-роутинг не только лендинга; проверить scope скрипта до запуска.
- **Открыто (не блокер):** стендап упал на `panel_unreachable` разово — повтор прошёл; держать в уме при смоуке.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-09-24
- [MEETING_ACTIVE.md](docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md) — порядок выкатки и сквозной приёмки (Р1–Р7)
- [GitHub Issue #2369](https://github.com/officefish/Membrana/issues/2369) — эпик регистрации по промокоду
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0]: owner-choice 23.09