<!-- Сгенерировано: 2026-09-22T11:44:12.003Z (yarn main-day-issue@6d256f1d) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"6d256f1ddfca21914858c95d0a698ca2722a7d43","digest":"1bc9c211546699af47249f72ae0f7f9c5408df4f5817fb64121b293da8ee1d5c"},"DAILY_STANDUP":{"version":"6d256f1ddfca21914858c95d0a698ca2722a7d43","digest":"775d4cbf669eb146745130af6d596d6f834168fe65d3da7db2466dd42e52879b"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-22

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `cabinet-registration-exec` |
| `primaryTitle` | Реализация регистрации в кабинете по промокоду (сессии A/B/C/D) |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/prompts/SESSION_A_*_2026-09-21.md` · `SESSION_B_*` · `SESSION_C_*` · `SESSION_D_*` |
| `сгенерировано` | 2026-09-22 |

## Магистраль

Магистраль взята из `sources[0].claim` (`docs/tasks/main-day-assertions.json`, owner-choice@chat/magistral-22-09, дата 2026-09-22): владелец ответил «1» на замороженный снимок из трёх кандидатов — выбран **`cabinet-registration-exec`**.

Задача: развернуть условно-открытую регистрацию в кабинете — вход только по промокоду, генерируемому в панели администратора. Заседание `cabinet-registration-promo` прошло полностью 21.09 (комнаты M0–M4, материалы влиты в ствол коммитом #2386, 23 файла). Сегодня исполняются четыре параллельные сессии по утверждённым промптам: **A** (новый контроллер + `panel-users.module.ts` + тесты) и **B** (`config.module.ts`, health-deep, строка imports в `app.module.ts`) стартуют параллельно; **C** (`auth.dto.ts`, `auth.module.ts`, помощник ограничителя) — после B; **D** (`AuthContext.tsx`, два теста, DOM-окружение тестов, лендинг «вход по приглашению») — после C, но лендинг «сейчас» выкатывается немедленно по слову владельца. Ведущая (Angelina) — контрольный модератор: принимает PR по факту (зубы красные до / зелёные после, границы файлов, команды в теле PR), сливает без отдельного слова.

**Критерий успеха к вечеру:** все четыре PR приняты и слиты; `auth.service.ts` больше не отказывает безусловно при `ALLOW_REGISTRATION=false`; `env.schema.ts` несёт `OFFICE_URL` / `OFFICE_API_TOKEN`; форма на странице входа отображает русские фразы по статусу; владелец чеканит промокод в панели, регистрирует второй кабинет и видит мембрану на `free-v1`.

## Подкрепление

- **Живой замер квоты по трём тарифам** (`tariff:project-cabinet --check`, три числа `GET /v1/devices/:id/quota`) — кандидат `tariff-transitions-live-day3` удержан в снимке; сделать при наличии владельца у прибора после приёмки сессии D; разблокирует закрытие тарифного хвоста.
- **Лендинг «вход по приглашению» (D, немедленно)** — слово владельца: выкатить до начала сессий A/B как самостоятельную выкатку; не ждать полного цикла C→D; критерий — страница входа отображает фразу «Доступ по приглашению» без ошибок консоли.

## Перспективные

- Пусковик охоты по расписанию (#2368) — следующий после `cabinet-registration-exec`; зависит от чистого ствола после сегодняшних PR.
- OAuth панели (#2375) — открывается после того, как `OFFICE_URL`/`OFFICE_API_TOKEN` вошли в `env.schema.ts` (сессия B); архитектурный контракт уже в материалах M2.
- Снос деревьев до #2350 — санитарный долг, не требует новых задач; кандидат на вечерний слот или утро 23.09.

## Экспериментальные

- **Проба: запустить `yarn main-day-probe` сразу после слияния сессии A** — проверить, что предикат `amnestyLifted` теперь вычислим (резак в `scripts/lib/secret-redact.mjs` существует с 26.07, гейт `secret-parser-built` держится только на этом предикате; проба покажет, нужен ли отдельный шаг или гейт закроется автоматически).
- **Проба: DOM-окружение тестов кабинета (`vite.config.ts` + `package.json` веб-кабинета)** — сессия D включает этот патч; до слияния проверить, не ломает ли он существующий `vitest` прогон в `background-media` (одна команда `yarn test --filter=@membrana/cabinet` до и после).
- **Проба: ограничитель `10 запросов / 600 000 мс`** (сессия C, helper) — после слияния C сделать один ручной запрос с валидным и одним истёкшим промокодом; зафиксировать коды ответа 401/429/403/503 против карты двери M3.

## Санитарные

- `night-triage-secret-scan.mjs` — резак существует отдельным модулем `scripts/lib/secret-redact.mjs` с 26.07 (#1252); гейт `secret-parser-built` держится на предикате `amnestyLifted` (отложен словом владельца 03.08); датированный проход `rotation-manifest-2026-08-03.md` зафиксирован — не пересобирать сегодня, статус зафиксировать одной строкой в санитарном журнале.
- Lint-warning `react-hooks/exhaustive-deps` в `@membrana/cabinet` (`titleOf` в `useCallback`) — одна строка, P2; исправить в теле сессии D (она трогает `AuthContext.tsx`), не отдельным PR.
- Красный CI `@membrana/media-library-service` / `@membrana/background-media` (#2345) — ночь 21→22.09 зелёная на 23d044bd; петля закрыта, ревью тестов не воспроизводит; зафиксировать как «закрыто наблюдением» в трекере, не чинить отдельно.
- PR из rescue-ветки M0–M4 — влит 18.09 (#2359, 7f6c2875); призрак из вечернего фидбека 21.09 снят; в санитарный список не возвращать.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец выбрал `cabinet-registration-exec` ответом «1» на замороженный снимок топ-3 | `docs/tasks/main-day-assertions.json` → `sources[0]` | Реплика владельца `owner-choice@chat/magistral-22-09` | 2026-09-22 |
| Заседание M0–M4 завершено, материалы в стволе (#2386, 23 файла, коммит 6d256f1d) | код / ствол | PR #2386 + аудиты #2370–#2385 | 2026-09-21 |
| Задания сессий A/B/C/D описаны в промптах на ветке `angelina/docs/session-tasks-20260921` (2717ea61) | план / ветка | `docs/prompts/SESSION_{A,B,C,D}_*_2026-09-21.md` | 2026-09-21 |
| Регистрации в кабинете сегодня нет: `auth.service.ts:16` отказывает при `ALLOW_REGISTRATION=false`; `env.schema.ts` не содержит `OFFICE_*` | код | `auth.service.ts`, `env.schema.ts` | ствол 22.09 |
| Стендап 22.09 называет `secret-parser-built` фокусом — это выбор **скрипта**, не владельца; норма owner-choice запрещает синтезировать магистраль вопреки `sources[0]` | план / стендап | `docs/DAILY_STANDUP.md` (генератор) | 2026-09-22 |
| **Расхождение: стендап назначил `secret-parser-built`, `sources[0]` — `cabinet-registration-exec`** — магистраль взята с `sources[0]` (owner-choice свежее и первичнее генератора); `main-day-assertions.json` не перечеканен под стендап — это находка, перечеканка каноном предписана и не сделана | `main-day-assertions.json` vs `DAILY_STANDUP.md` | оба владельческие; спор решён свежестью `sources[0]` (22.09 > генератор 22.09) | 2026-09-22 |
| Порядок исполнения (лендинг D немедленно; A ∥ B; C после B; форма D после C) зафиксирован словом владельца в `sources[0]` | сессия | реплика владельца 22.09 | 2026-09-22 |

*1 независимый первоисточник (реплика владельца 22.09) + 1 независимый (PR #2386 / ствол 21.09). Стендап и план — производные от одного генератора, их суммарный вес равен весу одного отражения.*

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Регистрация в кабинете не существует: `auth.service.ts` возвращает отказ безусловно при `ALLOW_REGISTRATION=false` | `symbol:ALLOW_REGISTRATION` в `apps/cabinet/src/auth/auth.service.ts` | holds |
| Связь кабинет→офис отсутствует: `env.schema.ts` не содержит `OFFICE_URL` / `OFFICE_API_TOKEN` | `symbol:OFFICE_URL` в `apps/cabinet/src/config/env.schema.ts` | holds |
| Контроллер промокодов в панели не существует | `symbol:RegistrationCodesController` в `apps/panel/src/**` | holds |

---

## Сегодня делаем

1. Выкатить лендинг «вход по приглашению» (сессия D, фрагмент) — страница входа отображает фразу без ошибок консоли; PR создан и принят до начала A/B.
2. Запустить сессии A и B параллельно — A: новый контроллер `RegistrationCodesController` + `panel-users.module.ts` + тесты; B: `config.module.ts`, `health-deep`, строка `imports` в `app.module.ts`.
3. После слияния B — запустить сессию C: `auth.dto.ts`, `auth.module.ts`, helper ограничителя `10/600000`; проверить коды ответа 401/429/403/503.
4. После слияния C — запустить сессию D полностью: `AuthContext.tsx`, два теста, DOM-окружение `vite.config.ts`; прогнать `yarn test --filter=@membrana/cabinet` до и после.
5. Angelina принимает каждый PR по факту (зубы красные до / зелёные после, границы файлов); сливает без отдельного слова владельца.
6. Владелец чеканит промокод в панели → регистрирует второй кабинет → видит мембрану на `free-v1`; фиксируем факт приёмки.
7. Зафиксировать статус предиката `amnestyLifted` одной строкой (не пересобирать резак — он существует с 26.07).

## Definition of Done (фокус)

- [ ] PR сессии D (лендинг) слит до старта A/B; страница входа показывает «Доступ по приглашению».
- [ ] PR сессии A слит: `RegistrationCodesController` присутствует в `apps/panel/src/**`, тесты зелёные.
- [ ] PR сессии B слит: `OFFICE_URL`/`OFFICE_API_TOKEN` появились в `env.schema.ts`, `health-deep` отвечает.
- [ ] PR сессии C слит: `auth.module.ts` импортирует модуль B; helper ограничителя возвращает 429 при превышении лимита.
- [ ] PR сессии D (полный) слит: `AuthContext.tsx` обновлён, два теста зелёные, DOM-окружение не ломает `background-media`.
- [ ] Владелец прошёл сценарий приёмки (промокод → регистрация → мембрана на free-v1) и подтвердил.
- [ ] Lint-warning `react-hooks/exhaustive-deps` устранён в теле сессии D; CI ствола зелёный.

## Сознательно не делаем сегодня

- **`secret-parser-built` как магистраль** — стендап предложил его фокусом, но это выбор генератора; `sources[0]` владельца (22.09) — `cabinet-registration-exec`; резак существует с 26.07, гейт держится только на `amnestyLifted` (отложен словом владельца); не трогаем.
- **`angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`** — явно заблокированы или требуют консилиум-гейта; не открываем.
- **DSP-бенчмарки, trends-калибровка на free-v1** — потолок зафиксирован (`FFT_METRICS §6`); повтор без новых данных не даёт знания.
- **Диагностику CI (#2345) не чиним** — ночь зелёная, петля закрыта наблюдением; фиксируем одной строкой.
- **Тарифный контур (`tariff-transitions-live-day3`, M5)** — только замер у прибора после приёмки D, если останется время; в код не идём.

## Вторично (если останется время)

- Живой замер квоты (`tariff:project-cabinet --check`, три числа по тарифам) — владелец у прибора после приёмки сессии D.
- Снос деревьев до #2350 — санитарный долг без нового кода; один `git` прогон вечером.

## Зависимости и риски

- **Блокер A→C:** сессия C импортирует модуль B (`auth.module.ts`); B должна быть слита раньше C — при задержке B сессия C ждёт, параллелизм A∥B нельзя нарушать в обратную сторону.
- **Риск DOM-окружения (D):** патч `vite.config.ts` кабинета может сломать `vitest` в смежных пакетах; проба до слияния обязательна.
- **Риск: `amnestyLifted` не вычислим автоматически** — если `yarn main-day-probe` не закрывает гейт после слияния A, потребуется ручная фиксация; не блокирует магистраль, но создаёт хвост на 23.09.
- **Зависимость приёмки от владельца:** финальный сценарий (промокод → регистрация → free-v1) требует присутствия владельца у прибора; без этого DoD не закрывается полностью к вечеру.

## Ссылки

- [DAILY_STANDUP.md](../DAILY_STANDUP.md)
- [docs/prompts/SESSION_A_*_2026-09-21.md](../prompts/) · SESSION_B · SESSION_C · SESSION_D
- GitHub Issue #2369 (`cabinet-registration-exec`)
- GitHub PR #2386 (материалы заседания M0–M4, ствол)
- `docs/tasks/main-day-assertions.json` → `sources[0]` (owner-choice@chat/magistral-22-09)