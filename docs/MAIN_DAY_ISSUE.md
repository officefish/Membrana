<!-- Сгенерировано: 2026-09-22T11:56:31.074Z (yarn main-day-issue@705c91e7) -->
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
| `primaryTitle` | Исполнение регистрации кабинета: лендинг «вход по приглашению» + сессии A/B/C/D |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/prompts/SESSION_{A,B,C,D}_*_2026-09-21.md` |
| `сгенерировано` | 2026-09-22 |

---

## Магистраль

**cabinet-registration-exec** — исполнение регистрации кабинета по итогам заседания cabinet-registration-promo (21.09, протоколы M0–M4 в стволе, #2386). Сегодня четыре параллельные сессии: A (новый контроллер кодов + panel-users.module.ts + тесты), B (config.module.ts, health-deep, office-env.schema.ts, строка imports в app.module.ts), C (auth.dto.ts, auth.module.ts, ограничитель 10/600000 мс — после B), D (AuthContext.tsx, лендинг «вход по приглашению», два теста + vite.config.ts). Порядок выкатки: D-лендинг — сразу; A ∥ B; C после B; D-форма после C. Ведущая — контрольный модератор: приёмка PR по факту (зубы красные до / зелёные после, файлы в ратифицированных границах), слияние без отдельного слова.

**Критерий успеха к вечеру:** лендинг «вход по приглашению» в стволе; PR сессий A и B приняты (зубы зелёные, границы файлов соблюдены); C и D — по готовности в порядке B→C→D-форма; auth.service.ts принимает ALLOW_REGISTRATION=true + office≠null и отвечает 401 «Registration is disabled» при любом из отсутствующих.

---

## Подкрепление

- **Живой замер квоты по тарифам** (`tariff:project-cabinet --check`, три числа `GET /v1/devices/:id/quota`) — ждёт владельца у прибора; unblocks кандидат `tariff-transitions-live-day3`, удержанный в замороженном снимке.
- **Диагностика красного CI** (`@membrana/media-library-service` / `@membrana/background-media`, петля #2345) — воспроизвести локально, зафиксировать диагноз одним абзацем; ночь 21→22.09 на 23d044bd зелёная, ревью тестов не запускает; только диагноз, не починка.

---

## Перспективные

- **Пусковик охоты по расписанию** (#2368) — логичный следующий шаг после регистрации, открывает автономный мониторинг.
- **OAuth панели** (#2375) — разблокируется, как только регистрационный контур встанет в ствол и не конфликтует с auth-модулем.
- **Снос деревьев до #2350** — санитарный контур, не зависит от магистрали; кандидат для ближайшей свободной полосы.

---

## Экспериментальные

- **Проба CI-зуба на границы файлов сессий A/B/C/D** — добавить один автоматический проверяемый предикат, что PR не выходит за ратифицированные границы (files-changed diff); узнаем, удержит ли механизм будущие PR от дрейфа без ручной проверки.
- **Проба приёмки D-лендинга владельцем до остальных сессий** — выкатить только страницу «вход по приглашению» отдельным PR; узнаем, достаточно ли это для первого пользовательского отклика до готовности auth-контура.
- **Проба: чеканка нового кристалла `registration-codes-gate-active`** — маркер `symbol:RegistrationCodesController` в `packages/background-cabinet/src`; узнаем, какие downstream-токены подпишутся и не заблокируют ли перечеканку через каскад.

---

## Санитарные

- Lint-warning `react-hooks/exhaustive-deps` в `@membrana/cabinet` (`titleOf` в `useCallback`) — одна строка, P2, не разобран; подходит как попутная правка в PR сессии D.
- Проверить, что три призрака вечернего фидбека 21.09 не всплыли снова: PR rescue M0–M4 (влит 18.09, #2359, 7f6c2875), CI ствола (зелёный на 23d044bd), ласточки 21.09 (sha 4354e861 + d65b1020, sent=true в docs/comms/sent-log.jsonl) — по одной строке верификации, не работа.
- `night-triage-secret-scan.mjs` — резак в `scripts/lib/secret-redact.mjs` существует (18/18 зубов, вещдок 03.08), гейт `secret-parser-built` остаётся за предикатом `amnestyLifted`; в код не идём, статус зафиксировать одной строкой в стендапе вечера.
- Убедиться, что `docs/prompts/SESSION_{A,B,C,D}_*_2026-09-21.md` на ветке `angelina/docs/session-tasks-20260921` (2717ea61) читаются исполнителями без конфликтов с текущим стволом.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец выбрал `cabinet-registration-exec` ответом «1» на замороженный снимок топ-3 (cabinet-registration-exec · tariff-transitions-live-day3 · secret-parser-built) | `docs/tasks/main-day-assertions.json`, `sources[0].claim` | Реплика владельца 22.09 (owner-choice) | 2026-09-22 |
| Заседание cabinet-registration-promo прошло целиком 21.09 — M0–M4 ратифицированы, 23 файла в стволе (#2386) | `код` / `issue` | Коммит 6d256f1d, PR #2386, ствол 22.09 | 2026-09-22 |
| Границы сессий A/B/C/D расширены при ратификации, задания лежат в `docs/prompts/SESSION_{A,B,C,D}_*_2026-09-21.md` на ветке 2717ea61 | `план` | Ратификация M0 заседания cabinet-registration-promo, 21.09 | 2026-09-21 |
| Стендап 22.09 назначил фокусом `secret-parser-built` — это выбор скрипта, не принят: норма owner-choice; магистраль берётся из `sources[0]` | `план` (скрипт стендапа) | `docs/DAILY_STANDUP.md`, генератор 22.09 | 2026-09-22 |
| **Расхождение (норма У1):** `sources[0]` в `main-day-assertions.json` = `cabinet-registration-exec`; `morning-gates-state.json` не представлен во входах с сегодняшней датой — расхождения гейта и assertions нет, магистраль взята из assertions как единственного owner-source | `снимок-хардкод` | `docs/tasks/main-day-assertions.json` | 2026-09-22 |
| auth.service.ts:16 отказывает при ALLOW_REGISTRATION=false (прод: deploy/generate-cabinet-env.sh:34); связи кабинет→офис нет (env.schema.ts без OFFICE_*) — работа реально не сделана | `код` | `packages/background-cabinet/src/auth/auth.service.ts`, `env.schema.ts` | замер утра 22.09 |

**1 владельческий источник, 1 отражение в стендапе** (стендап — производное от того же утреннего замора; вес = один голос).

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `RegistrationCodesController` в `packages/background-cabinet/src` отсутствует | `symbol:RegistrationCodesController` в `packages/background-cabinet/src/**` | **holds** — контроллер не написан (сессия A) |
| `office-env.schema.ts` в `packages/background-cabinet/src/config/` отсутствует | `file:packages/background-cabinet/src/config/office-env.schema.ts` | **holds** — файл не создан (сессия B) |
| Лендинг «вход по приглашению» отсутствует в `apps/cabinet/` | `symbol:InvitationOnlyLanding` в `apps/cabinet/src/**` | **holds** — компонент не написан (сессия D) |
| Связь кабинет→офис (`OFFICE_URL`/`OFFICE_API_TOKEN`) не внесена в конфиг | `symbol:OFFICE_URL` в `packages/background-cabinet/src/config/office-env.schema.ts` | **holds** — файл не существует (см. выше) |

---

## Сегодня делаем

1. Выкатить PR сессии D-лендинг: компонент «вход по приглашению» в `apps/cabinet/src/`, маршрут, русские фразы по статусу; зубы зелёные, слияние по приёмке модератора.
2. Параллельно запустить сессии A и B: A — `RegistrationCodesController` + `panel-users.module.ts` + тесты; B — `office-env.schema.ts` + `config.module.ts` + строка imports в `app.module.ts`; каждый PR — зубы красные до / зелёные после.
3. После приёмки PR B запустить сессию C: `auth.dto.ts` + `auth.module.ts` + ограничитель 10 req / 600 000 мс; файлы строго в ратифицированных границах M2/M3.
4. После приёмки PR C запустить D-форму: форма на странице входа с полем промокода; два теста; `vite.config.ts` веб-кабинета — только на DOM-окружение.
5. Модератор проверяет каждый PR: diff файлов совпадает с ратифицированными границами сессии, зубы зелёные, тело PR содержит команды закрытия issue.
6. Зафиксировать диагноз CI (`@membrana/media-library-service` / `@membrana/background-media`) одним абзацем — параллельно, пока сессии собираются.
7. К вечеру: лендинг в стволе, A + B приняты, C и D — по готовности; записать в стендап вечера статус `secret-parser-built` (одна строка, без работы).

---

## Definition of Done (фокус)

- [ ] Лендинг «вход по приглашению» (`InvitationOnlyLanding`) слит в ствол, зубы зелёные.
- [ ] PR сессии A принят: `RegistrationCodesController` существует, тесты зелёные, файлы в границах ратификации M0/M1.
- [ ] PR сессии B принят: `office-env.schema.ts` с `OFFICE_URL`/`OFFICE_API_TOKEN` существует, `config.module.ts` обновлён, зубы зелёные.
- [ ] PR сессии C принят (после B): `auth.module.ts` импортирует модуль B, ограничитель 10/600000 мс в тестах проходит.
- [ ] PR сессии D-форма принят (после C): форма промокода на странице входа, два теста зелёные, `vite.config.ts` — только DOM-окружение.
- [ ] `auth.service.ts` отвечает 401 «Registration is disabled» при ALLOW_REGISTRATION=false или office=null; при обоих истинных — пропускает.
- [ ] Диагноз красного CI (`@membrana/media-library-service` / `@membrana/background-media`) зафиксирован одним абзацем в стендапе вечера.
- [ ] Lint-warning `react-hooks/exhaustive-deps` в `@membrana/cabinet` устранён попутно в PR D (или отдельной строкой, если D-PR не затрагивает файл).

---

## Сознательно не делаем сегодня

- **`secret-parser-built`** — резак существует (вещдок 03.08, 18/18 зубов); остаток гейта — предикат `amnestyLifted`, отложен словом владельца; стендап назначил его фокусом скриптом, не owner-choice — не берём.
- **`angelina-hostess-impl`** и **`batch-collection-run-contour`** — заблокированы: первая амнистией архива, вторая консилиум-гейтом по модели исполнения; в код не идём.
- **DSP-бенчмарки и trends-калибровку** — потолок эшелона 0 зафиксирован (FFT_METRICS §6); повтор без смены датасета или алгоритма не даёт нового знания.
- **Тарифные работы (tariff-transitions-live-day3)** — живой замер ждёт владельца у прибора; не открываем самостоятельно.
- **OAuth панели** (#2375) и **снос деревьев до #2350** — перспективные векторы, не сегодня.
- **Починка CI** `@membrana/media-library-service` / `@membrana/background-media` — только диагноз, не устранение.

---

## Вторично (если останется время)

- Живой замер квоты (`tariff:project-cabinet --check`, три числа по тарифам) — если владелец окажется у прибора до вечера.
- Чеканка кристалла `registration-codes-gate-active` (маркер `symbol:RegistrationCodesController`) — только если PR A принят и символ в стволе.

---

## Зависимости и риски

- **Блокер C:** сессия C ждёт принятого PR B (`auth.module.ts` импортирует модуль офиса из B); если B затянется, C и D-форма сдвигаются.
- **Блокер D-форма:** ждёт принятого PR C (auth-контур); D-лендинг независим и идёт первым.
- **Риск границ файлов:** ратификация M0–M4 жёстко ограничила файловый периметр каждой сессии; любой выход за него — возврат PR автору без слияния; модератор проверяет diff до слияния.
- **Риск owner-choice vs стендап:** стендап синтезировал `secret-parser-built` как фокус; магистраль взята из `sources[0]` (`main-day-assertions.json`, owner-choice 22.09) — расхождение открытое, зафиксировано в таблице обоснования; `morning-gates-state.json` с сегодняшней датой во входах не представлен, спор нормой У1 не возникает.

---

## Ссылки

- [docs/DAILY_STANDUP.md](../DAILY_STANDUP.md) — стендап 2026-09-22
- [docs/prompts/SESSION_A_*_2026-09-21.md](../prompts/) — задание сессии A
- [docs/prompts/SESSION_B_*_2026-09-21.md](../prompts/) — задание сессии B
- [docs/prompts/SESSION_C_*_2026-09-21.md](../prompts/) — задание сессии C
- [docs/prompts/SESSION_D_*_2026-09-21.md](../prompts/) — задание сессии D
- [GitHub Issue #2369](../../issues/2369) — cabinet-registration-exec
- [GitHub Issue #2386](../../issues/2386) — протоколы M0–M4 в стволе
- [docs/tasks/main-day-assertions.json](../tasks/main-day-assertions.json) — owner-source магистрали