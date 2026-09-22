<!-- Сгенерировано: 2026-09-22T11:28:21.935Z (yarn main-day-issue@93cc7963) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"13e8ccea0ad9e89d567488f04dfa87868a64e05c","digest":"1bc9c211546699af47249f72ae0f7f9c5408df4f5817fb64121b293da8ee1d5c"},"DAILY_STANDUP":{"version":"13e8ccea0ad9e89d567488f04dfa87868a64e05c","digest":"775d4cbf669eb146745130af6d596d6f834168fe65d3da7db2466dd42e52879b"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-22

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-transitions-live-day2` |
| `primaryTitle` | Живой замер тарифных переходов: выкатка кабинета + замер предела на приборе |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-22 |

---

## Магистраль

**Магистраль дня — `tariff-transitions-live-day2`** (слово владельца 21.09, ответ «1» на замороженный снимок топ-3; `sources[0].claim` в `main-day-assertions.json`).

Суть задачи: разведка 21.09 установила, что цепочка «матрица → сетка → кабинет → `GET /v1/devices/:id/quota` → прибор» цела по коду, но рвётся на проде — таблица `Tariff` в базе кабинета не наполнена актуальными данными (сетка с растущим буфером влита 09.09, кабинет развёрнут 07.09, проекция не прошла). Задача дня: выкатить кабинет с актуальным образом, прогнать `yarn tariff:project-cabinet --check`, снять три живых числа `GET /v1/devices/:id/quota` по трём тарифам (free-v1 / checkpoint-v1 / observatory-v1) и зафиксировать их на приборе. Это закрывает разрыв «слово владельца о буфере 1 ГБ на старшем тарифе» и открывает сценарий M4 (понижение + холод), который ждёт живых данных.

**Критерий успеха к вечеру:** прибор показывает три различных числа `limitBytes` (512 MiB / 2 GiB / 4 GiB), соответствующих матрице тарифов (ratifiedAt 2026-09-08); в лог зафиксирован результат `--check`; расхождение с ожиданием, если есть, — описано одним абзацем с причиной.

---

## Подкрепление

- **Диагностика красного CI** (`@membrana/media-library-service` + `@membrana/background-media`, #2345): воспроизвести локально, зафиксировать причину одним абзацем — не чинить, только диагноз. Разблокирует следующий спринт с этими пакетами; сигнал трижды зафиксирован командой без разбора.
- **Влить PR из rescue-ветки** (`rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917`, материалы M0–M4): кладёт документальный фундамент под сценарии M3/M4/M5; без него повестка заседаний живёт вне ствола и недоступна агентам ритуала.

---

## Перспективные

- После живого замера предела — созвать M5 (наборы звуков / observatory-v1): повестка готова, созыв за владельцем; не открывать сегодня без слова владельца.
- Слово владельца о статусе `cabinet-registration-promo` (новая магистраль или параллельный контур) — откроет заведение карточки реестра и планирование сессий A/B/C/D.
- Пусковик охоты не отрабатывал расписание 19.09 и 21.09 при живом планировщике GitHub (workflow active, cron не менялся) — диагноз #2350 (три мёртвых каталога в `.worktrees`) как блокер стоит до починки; вектор для отдельного дня.

---

## Экспериментальные

- **Проба: `night-triage-secret-scan.mjs` — датированный проход с флагом `--dry-run` на архиве сессий**, чтобы узнать реальный объём засвеченных строк и нужен ли генератор манифеста или достаточно ручного. Гейт `secret-parser-built` остаётся открытым; проба не закрывает его, но даёт данные для решения.
- **Проба: вставить в CI один зуб, падающий при отсутствии экспорта функции резки в `scripts/lib/secret-redact.mjs`** — узнать, удержит ли автоматический предикат гейт от регрессии после следующего мерджа.
- **Проба: `yarn tariff:project-cabinet --check` в режиме diff-only** (без применения) — до выкатки, чтобы увидеть расхождение между текущей базой и матрицей и принять решение о способе проекции (пересев vs патч-скрипт).

---

## Санитарные

- **Хвост магистрали 21.09:** `yarn tariff:project-cabinet --check` на проде не прогонялся — три числа `GET /v1/devices/:id/quota` по тарифам не сняты; пункты DoD не закрыты (переходит в магистраль сегодня).
- **Красный CI** `@membrana/media-library-service` + `@membrana/background-media` (#2345): воспроизвести локально, зафиксировать диагноз одним абзацем (не чинить) — P1, трижды зафиксирован без разбора.
- **PR из rescue-ветки** `rescue/angelina/docs/meeting-tariff-single-truth-…` (материалы M0–M4): не влит; ревью-долг, пункт 5 DoD магистрали 21.09 открыт.
- **Вечерняя ласточка 18.09** не отправлена (ключ офиса ротирован 18.09, локальный `.env` был от 11.09); перенесена в утреннюю 21.09 — зафиксировать закрытие долга в журнале.
- **Lint-warning `react-hooks/exhaustive-deps`** в `@membrana/cabinet` (`titleOf` в `useCallback`) — одна строка, P2, не разобран.
- **Гейт `secret-parser-built`:** резак существует (`scripts/lib/secret-redact.mjs`, коммит 211243df, 26.07); остаётся только предикат `amnestyLifted`, отложенный словом владельца — статус не изменился, зафиксировать явно в конце дня.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `tariff-transitions-live-day2`; ответ владельца «1» на замороженный снимок топ-3 | `sources[0]` в `main-day-assertions.json` | Слово владельца, сессия `chat/magistral-21-09` | 2026-09-21 |
| Разрыв: таблица `Tariff` на проде не наполнена актуальной сеткой (кабинет 07.09, матрица влита 09.09) | разведка #2358, коммит bf1938e6 | `deploy/generate-cabinet-env.sh`, `scripts/_ssh-cabinet-post-smoke.mjs` | 2026-09-21 |
| Сетка с растущим буфером (512/2048/4096 MiB) ратифицирована 08.09, влита 09.09 (PR, f5dcc7f4) | код / `docs/tariffs/tariff-grid.json` | `docs/containers/strategic-docs/granules/tariff-buffer/resource.json` | 2026-09-08 |
| M4 (понижение + холод) ждёт живых данных; прогон 2 отложен (панельная цепочка LLM исчерпана) | план / протокол заседания M4 | Rescue-ветка, `MEETING_ACTIVE.md` (в стволе с 7f6c2875, #2359) | 2026-09-18 |
| Стендап 22.09 называет трёх кандидатов магистрали, все за гейтом; тарифный контур — прямой продолжатель вчерашнего слова | план | `docs/DAILY_STANDUP.md` (1 источник, отражение стендапа) | 2026-09-22 |
| **Расхождение:** `main-day-assertions.json` несёт `sources[0]` с датой 21.09 (`tariff-transitions-live-day2`); `morning-gates-state.json` не проверен на сегодняшнюю дату — расхождение не обнаружено, магистраль взята с `sources[0]` как единственного владельческого источника; перечеканка `main-day-assertions.json` под 22.09 не сделана (канон предписывает, факт фиксируется) | `main-day-assertions.json` vs `morning-gates-state.json` | оба документа | 2026-09-21 / н/д |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Таблица `Tariff` на проде содержит старые данные (буфер одинаков, не соответствует матрице 08.09) | `file:docs/containers/strategic-docs/granules/tariff-buffer/resource.json` (ratifiedAt 2026-09-08) vs живой `GET /v1/devices/:id/quota` на проде | `holds` — разведка #2358 подтвердила расхождение |
| Шаг проекции матрицы в базу кабинета отсутствует в деплой-скрипте (только сид при первом развёртывании) | `file:deploy/generate-cabinet-env.sh` (строка 35: `CABINET_RUN_SEED=true`) + `file:scripts/_ssh-cabinet-post-smoke.mjs` (строка 14: переводит в false) | `holds` |
| `yarn tariff:project-cabinet` в режиме `--check` только сравнивает, не применяет | `file:scripts/tariff-project-cabinet.mjs` (режим `--check`) | `holds` |

---

## Сегодня делаем

1. Запустить `yarn tariff:project-cabinet --check` (diff-only) до выкатки — зафиксировать расхождение между текущей базой кабинета и матрицей тарифов в одном абзаце.
2. Выкатить кабинет с актуальным образом (матрица 08.09 в базе) — способ проекции выбрать по результату п. 1 (пересев vs патч-скрипт).
3. Прогнать `yarn tariff:project-cabinet --check` после выкатки — убедиться, что расхождение снято.
4. Снять три живых числа `GET /v1/devices/:id/quota` по тарифам free-v1 / checkpoint-v1 / observatory-v1; зафиксировать на приборе и в лог-файле.
5. Воспроизвести красный CI `@membrana/media-library-service` + `@membrana/background-media` локально; записать диагноз одним абзацем (не чинить).
6. Запросить ревью и влить PR из rescue-ветки (материалы M0–M4) — только документальный контент, не код.
7. Зафиксировать итог дня: три числа на приборе, статус гейта `secret-parser-built` (предикат `amnestyLifted`), диагноз CI.

---

## Definition of Done (фокус)

- [ ] `yarn tariff:project-cabinet --check` до выкатки выполнен, расхождение описано одним абзацем.
- [ ] Кабинет выкачен с актуальным образом; таблица `Tariff` содержит данные матрицы (ratifiedAt 2026-09-08).
- [ ] `yarn tariff:project-cabinet --check` после выкатки показывает нулевое расхождение (или расхождение объяснено).
- [ ] Три числа `limitBytes` сняты с прода (`GET /v1/devices/:id/quota`): 536 870 912 / 2 147 483 648 / 4 294 967 296 (512 MiB / 2 GiB / 4 GiB) или иные — с объяснением отклонения.
- [ ] Числа зафиксированы на приборе и в журнале сессии.
- [ ] PR из rescue-ветки (M0–M4) просмотрен и влит (или заблокирован с явной причиной).
- [ ] Диагноз красного CI (`@membrana/media-library-service` + `@membrana/background-media`) записан одним абзацем.
- [ ] Вечерний итог: статус гейта `secret-parser-built` и предикат `amnestyLifted` зафиксированы явно.

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`** — в код не идём: первые два заблокированы гейтом `secret-parser-built` и красным CI; третий требует консилиум-гейта по модели исполнения.
- **Чинить красный CI** — только диагноз; починка требует отдельного PR и отвлекает от магистрали.
- **Созывать M5** — повестка готова, созыв за словом владельца; не открывать без него.
- **DSP-бенчмарки, trends-калибровку на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS §6`), повтор без смены датасета или алгоритма не даёт нового знания.
- **Гейт `secret-parser-built` закрывать полностью** — резак существует, остаток (`amnestyLifted`) отложен словом владельца; не трогать без его снятия.
- **Перечеканку `main-day-assertions.json` под 22.09** — канон предписывает, но это не магистраль дня; фиксируется как долг.

---

## Вторично (если останется время)

- Lint-warning `react-hooks/exhaustive-deps` в `@membrana/cabinet` (`titleOf` в `useCallback`) — одна строка, P2.
- Проба `--dry-run` `night-triage-secret-scan.mjs` на архиве сессий: узнать объём засвеченных строк для решения по манифесту ротации.

---

## Зависимости и риски

- **Блокер:** доступ к проду (SSH / deploy-ключи) — ротация ключей офиса 18.09 уже решена (локальный `.env` обновлён 21.09); проверить до начала выкатки.
- **Риск:** способ проекции матрицы в базу не определён заранее — если пересев невозможен без даунтайма, день уходит на проектирование патч-скрипта; решение принимается по результату п. 1 (`--check` diff).
- **Риск:** PR из rescue-ветки может содержать конфликты с текущим стволом (39 файлов, три ночи без синка); ревью может занять больше одного слота.
- **Наблюдение:** `main-day-assertions.json` не перечеканен под 22.09 (содержит `sources[0]` от 21.09 с магистралью `tariff-transitions-live-day2`) — расхождение не критично для сегодняшнего дня (магистраль та же), но перечеканка остаётся долгом канона.

---

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-09-22
- [DAY_PLAN.md](../docs/DAY_PLAN.md) — план дня, 5 слотов
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json) — `sources[0]`, слово владельца 21.09
- [tariff-grid.json](../docs/tariffs/tariff-grid.json) — матрица тарифов (ratifiedAt 2026-09-08)
- [deploy/generate-cabinet-env.sh](../deploy/generate-cabinet-env.sh) — деплой-скрипт кабинета
- [scripts/tariff-project-cabinet.mjs](../scripts/tariff-project-cabinet.mjs) — проекция тарифов