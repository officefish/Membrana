<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-25
  archived-at: 2026-09-25T13:26:08.479Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-25T06:20:50.479Z (yarn main-day-issue@7027890f) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"0c061a47a6b71233baa5df2364e5437091a53ce9","digest":"13b422ba847684892f093db96c468738b31ec6a86fa07b49d8deb4de79bf2306"},"DAILY_STANDUP":{"version":"0c061a47a6b71233baa5df2364e5437091a53ce9","digest":"1ec52c08e06d9cde689aa96fbed8e5b2ab79b81d9272dc3a291da40df043d5e2"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE · 2026-09-25

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Выкатка кабинета регистрации — день 3: получить лог отказа образа офиса и поднять второй кабинет на free-v1 |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` |
| `сгенерировано` | 2026-09-25 |

---

## Магистраль

Магистраль дня — `cabinet-registration-rollout`, третий день подряд по выбору владельца (owner-choice 24.09, ответ «1» на замороженный снимок). Выкатка остановлена на шаге 1 по правилу fail-closed: новый образ офиса не поднялся из-за несовместимости `RunRecord.mountTarget` для дома `background-cabinet/journal`; старый офис жив и healthy, прод не тронут.

Сегодняшний мандат: получить дословный лог отказа сборки образа, подтвердить или опровергнуть класс поломки «stale image packages» (`verify:image-workspace-deps`), пересобрать образ и поднять второй кабинет. Параллельно — довнести пару `OFFICE_URL`/`OFFICE_API_TOKEN` и флаг `ALLOW_REGISTRATION=true` в `/etc/membrana/cabinet.env` на VDS (точка руки владельца, не автоматизируется).

**Критерий успеха к вечеру:** второй кабинет владельца живёт на проде на free-v1, Issue #2369 и контейнер заседания закрыты; внешний смоук нового образа даёт ≥ 5 ok / 0 fail / 0 skip; `/health` 200; пишущий смоук панели (шаг 6) прогнан.

---

## Подкрепление

- **Починить `sequence`-контракт trail-агрегатора** (S) — третий день P1: пока `runId`-уникальность и глобальная монотонность в merge не гарантированы, счётчики манифеста ротации ненадёжны, гейт `secret-parser-built` технически непроходим; выполняется параллельно rollout после разблокирования класса поломки образа.
- **Патч paths `office-image-smoke.yml`** (S) — без `packages/background-cabinet/**` и `apps/panel/**` в триггере CI молча пропускает регрессы образа; именно эта дыра позволила поломке 22.09 пройти незамеченной; патч < 30 мин, снимает целый класс «тихих блокеров» выкатки.

---

## Перспективные

- Закрытие DoD `cabinet-registration-rollout` день 3 открывает движение к вехе `secret-parser-built`: второй кабинет становится стендом для проверки резака секретов и датированного прохода манифеста ротации.
- Починка `sequence`-контракта снимает последний технический блок на вехе — trail станет надёжным вещдоком для прохождения гейта `secret-parser-built`, после чего амнистия архива снимается предикатом.
- После стабилизации выкатки открывается старт `angelina-hostess-impl` (L) параллельной полосой — живой исполнитель на контуре хостинга, кандидат магистрали следующего дня.

---

## Экспериментальные

- **Проверить класс «stale image packages» экспериментально:** запустить `yarn verify:image-workspace-deps` на упавшем образе офиса, снять digest пакетов — узнаем, является ли stale-образ единственной причиной отказа шага 1 или есть иной класс поломки (рецидив 21.08 и 27.08 подтверждает, что класс реальный и повторяющийся).
- **Проверить `sequence`-контракт на синтетике:** создать два параллельных `runId` с намеренно пересекающимися `sequence`, прогнать merge — узнаем, достаточно ли локального уникального счётчика или нужна глобальная монотонность для надёжного вещдока вехи.
- **Добавить `friction`-запись в `docs/procedure-runs/trail/2026-09-24.jsonl`** (вручную, до первого коммита) — иначе агрегатор прочтёт день 24.09 как безупречный; кристалл-факт по итогу дня записать в граф правды.

---

## Санитарные

- `sequence`-контракт trail-агрегатора не починен третий день — блокирует веху `secret-parser-built` (гейт читает trail как вещдок); P1.
- `office-image-smoke.yml` не сторожит `packages/background-cabinet/**` и `apps/panel/**` — молчаливые регрессы образа открыты; именно через эту дыру прошла поломка 22.09.
- Lint `titleOf` (`react-hooks/exhaustive-deps`) в `apps/cabinet` — XS, третий день без правки.
- `CURRENT_TASK.md` указывает на неактуальный эпик `detector-scoreboard` — дезориентирует холодную сессию.
- Стендап-генератор `_daily-standup.mjs` читал магистраль из синтеза вместо `sources[0]` три дня подряд — патч #2410 влит 24.09, сегодня проверить предикатом что фикс жив.
- `docs/tasks/main-day-assertions.json` → `assertions[]` пуст третий день, `sources[0]` несёт дату 24.09: перечеканка под сегодняшний день не сделана — расхождение зафиксировано, перечеканить после подтверждения owner-choice.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Владелец выбрал `cabinet-registration-rollout` ответом «1» на замороженный снимок топ-3 | `sources[0].claim` в `docs/tasks/main-day-assertions.json` | owner-choice@chat/magistral-24-09 (реплика владельца) | 2026-09-24 |
| Выкатка остановлена на шаге 1: новый образ не поднялся, старый healthy | сессия / отчёт исполнителя | замер утра 24.09 в `sources[0]` | 2026-09-24 |
| `turbo run typecheck build --filter=@membrana/background-office` — зелёный дважды (кеш и --force) | код / CI | замер ведущей против отчёта, зафиксирован в `sources[0]` | 2026-09-24 |
| Класс поломки «stale image packages» — рецидив 21.08 и 27.08 | план / `sources[0]` | 1 источник, 2 отражения (21.08, 27.08) | 2026-09-24 |
| `cabinet.env` без пары `OFFICE_URL`/`OFFICE_API_TOKEN` и `ALLOW_REGISTRATION=false` | сессия | отчёт исполнителя выкатки, зафиксирован в `sources[0]` | 2026-09-24 |
| **Расхождение источников: `sources[0]` несёт дату 24.09, сегодня 25.09; перечеканка `main-day-assertions.json` каноном предписана и не сделана** | `docs/tasks/main-day-assertions.json` | сам файл | 2026-09-25 |
| Магистраль взята с `sources[0]` (`main-day-assertions.json`); `morning-gates-state.json` на сегодня не проверялся — при наличии `magistral.day == 2026-09-25` приоритет у гейта по норме У1 31.07 | `docs/tasks/main-day-assertions.json` | правило У1 / канон | 2026-07-31 |

> Синтезировать магистраль запрещено. Выбор владелец сделал 24.09 — `sources[0].claim`. Сегодняшний стендап фокус не назначал (патч #2410 работает). Расхождение дат `sources[0]` (24.09) и текущего дня (25.09) — наблюдение нормы У1, не нарушение посылки; перечеканка предписана и вынесена в санитарные.

---

## Посылки (фокус держится на «работа не завершена»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| Новый образ офиса не поднят: контейнер с новым образом не в состоянии `running healthy` | `file:docs/evidence/cabinet-rollout-day3-image-up.txt` (артефакт приёмки, не существует) | `holds` — файла нет, образ не поднят |
| Второй кабинет на free-v1 не живёт: Issue #2369 открыт | `file:docs/evidence/registry.jsonl` → запись `cabinet-registration-rollout` со статусом `done` отсутствует | `holds` — запись не закрыта |
| `cabinet.env` не содержит пары `OFFICE_URL`/`OFFICE_API_TOKEN` | `file:/etc/membrana/cabinet.env` (VDS, не в репо; подтверждено отчётом исполнителя 24.09) | `holds` — пара отсутствует по замеру |
| `office-image-smoke.yml` не сторожит `packages/background-cabinet/**` | `symbol:packages/background-cabinet` в `.github/workflows/office-image-smoke.yml` | `holds` — пути нет в триггере |

---

## Сегодня делаем

1. **Получить дословный лог отказа** сборки нового образа офиса (шаг 1 rollout) — скопировать `docker build` stderr в `docs/procedure-runs/cabinet-rollout/2026-09-25-build-fail.log`.
2. **Запустить `yarn verify:image-workspace-deps`** на упавшем образе — подтвердить или опровергнуть класс «stale image packages»; результат зафиксировать в лог выше.
3. **Пересобрать образ офиса** с устранённым классом поломки; прогнать внешний смоук ≥ 5 ok / 0 fail / 0 skip и `/health` 200.
4. **Довнести пару и флаг в `cabinet.env`** на VDS вручную (`OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`) — точка руки владельца.
5. **Прогнать пишущий смоук панели (шаг 6)** — живая дверь; зафиксировать результат.
6. **Патч `office-image-smoke.yml`**: добавить `packages/background-cabinet/**` и `apps/panel/**` в триггер `pull_request`; PR с тестом.
7. **Починить `sequence`-контракт trail-агрегатора** — синтетический тест двух пересекающихся `runId`; PR.

---

## Definition of Done (фокус)

- [ ] Дословный лог отказа образа офиса получен и сохранён в `docs/procedure-runs/cabinet-rollout/2026-09-25-build-fail.log`
- [ ] Класс поломки подтверждён или опровергнут `yarn verify:image-workspace-deps` с зафиксированным digest
- [ ] Новый образ офиса пересобран и поднят: контейнер `running healthy`, внешний смоук ≥ 5 ok / 0 fail
- [ ] `/etc/membrana/cabinet.env` содержит `OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`
- [ ] Пишущий смоук панели (шаг 6) прогнан без ошибок
- [ ] Issue #2369 закрыт, контейнер заседания закрыт
- [ ] `friction`-запись за 24.09 добавлена в `docs/procedure-runs/trail/2026-09-24.jsonl`

---

## Сознательно не делаем сегодня

- **Не стартуем `angelina-hostess-impl` и `assets-container`** — обе L-задачи конкурируют за внимание с незакрытым rollout; старт без стабильного прода создаёт незакрытые полосы.
- **Не запускаем DSP-бенчмарки** (harmonic / cepstral / spectral-flux / «Этап 1.A») — потолок эшелона 0 зафиксирован, повтор не даст новых чисел (FFT_METRICS_POTENTIAL_AND_LIMITS.md §6).
- **Не чиним типы/контракты в стволе вслепую** — до дословного лога отказа класс поломки `unknown`; лечение по догадке — риск второго потерянного дня.
- **Не открываем амнистию архива и не стартуем `mfcc-compare-sprint`** — оба блокированы до стабилизации выкатки.
- **Не перечеканиваем `main-day-assertions.json`** до подтверждения owner-choice на 25.09 — перечеканка без слова владельца нарушает норму.

---

## Вторично (если останется время)

- Lint `titleOf` (`react-hooks/exhaustive-deps`) в `apps/cabinet` — XS, правка одной строкой.
- Обновить `CURRENT_TASK.md` — убрать ссылку на устаревший эпик `detector-scoreboard`, вписать `cabinet-registration-rollout`.

---

## Зависимости и риски

- **Блокер 1:** дословный лог отказа образа офиса не получен → класс поломки остаётся `unknown` → пересборка наугад → третий потерянный день; первый шаг дня — именно этот лог.
- **Блокер 2:** пара `OFFICE_URL`/`OFFICE_API_TOKEN` в `cabinet.env` — точка руки владельца, не автоматизируется; без неё второй кабинет не поднимется даже при живом образе.
- **Риск:** если класс поломки окажется НЕ «stale packages», а иным (несовместимость схемы `RunRecord.mountTarget` на уровне миграций), потребуется дополнительный шаг миграции данных — заложить час на разведку.
- **Риск:** `office-image-smoke.yml` не защищает `background-cabinet/**` — до влития патча любой коммит в кабинет может снова сломать образ молча; патч приоритизировать в первой половине дня.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-09-25
- [MEETING_ACTIVE.md](docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md) — порядок выкатки и сквозной приёмки
- [GitHub Issue #2369](https://github.com/officefish/Membrana/issues/2369) — эпик регистрации по приглашению
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — источник owner-choice (`sources[0]`)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — почему DSP-бенчмарки сегодня не делаем