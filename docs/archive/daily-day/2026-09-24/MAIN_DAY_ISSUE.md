<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-24
  archived-at: 2026-09-24T17:06:44.145Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-24T10:56:03.699Z (yarn main-day-issue@0c061a47) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"0c061a47a6b71233baa5df2364e5437091a53ce9","digest":"063e099df5e08d5de5a0612ad6fd154dd6bec07a7bc7cdb7b99a69aa182e3995"},"DAILY_STANDUP":{"version":"0c061a47a6b71233baa5df2364e5437091a53ce9","digest":"7879e4e522288ff2036d76b3e02ea5f8a356e35ddd5263a93edf138e2ab1875c"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-24

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Выкатка регистрации кабинета на прод (день 2): образ офиса → env → смоук → второй кабинет на free-v1 |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` (раздел «Выкатка и сквозная приёмка») |
| `сгенерировано` | 2026-09-24 |

## Магистраль

**cabinet-registration-rollout** (L, #2369) — второй день выкатки регистрации по приглашению. Вчера код эпика (A–D + лендинг) целиком в стволе; выкатка остановлена fail-closed на шаге 1: сборка нового образа офиса упала до `up` с несовместимостью `RunRecord.mountTarget` для дома `background-cabinet/journal`. Прод не тронут: образ `4af378da42f5` healthy, внешний смоук 5 ok / 0 fail / 1 skip, `/health` 200; пишущий смоук панели (шаг 6) не гонялся; `/etc/membrana/cabinet.env` без `OFFICE_URL`/`OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=false`.

Утро 24.09: на стволе `turbo run typecheck build --filter=@membrana/background-office` зелёный дважды (кеш и `--force`) — исходники целы; расхождение контракта, скорее всего, внутри образа (класс «устаревшие собранные пакеты соседей», рецидив 21.08/27.08). Системная дыра: `office-image-smoke.yml` не слушает `packages/background-cabinet/**`.

**Критерий успеха к вечеру:** получен дословный вывод отказа исполнителя; подтверждён или опровергнут класс «устаревшие пакеты в образе»; образ офиса собирается и поднимается; пара и флаг в `cabinet.env` выставлены рукой владельца; сквозная приёмка по MEETING_ACTIVE — второй кабинет владельца живёт на проде на free-v1; путь к закрытию #2369 и контейнера `cabinet-registration-promo` открыт.

## Подкрепление

- **Дыра сторожа образа офиса** — добавить `packages/background-cabinet/**` (и согласованные пути) в paths `office-image-smoke.yml`, завести тикет; без этого кабинетные правки снова сломают образ молча и заблокируют любую следующую выкатку.
- **Хвост двух `runId` с пересекающимися `sequence` в trail-агрегаторе** (P1 ревью) — счётчики trail ненадёжны; веха `secret-parser-built` требует датированного прохода именно в trail; размер S, не конкурирует с L-выкаткой, расчищает вещдок гейта.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак есть с 26.07; остаток — датированный проход с манифестом ротации + снятие амнистии предиката) — после стабилизации выкатки.
- `batch-collection-run-contour` (L) — контур прогона с манифестом ротации; прямая связь с критерием вехи, не стартовать параллельно незакрытому rollout.
- Живой хост-слой `angelina-hostess-impl` (L) — интерфейс приёма сессий; косвенно нужен контуру исполнения, не сегодняшняя магистраль.

## Экспериментальные

- **Friction-запись как триггер резака** — одна JSONL-строка `friction` в trail вручную → прогон `night-triage-secret-scan.mjs`; видим ли friction или пропускаем как «безопасное».
- **Пустой слот DAY_PLAN как B6** — план-генератор с заведомо пустым каналом insights → exit-код: ненуль или тихая заглушка.
- **Класс «образ vs ствол»** — после получения лога отказа сверить digest пакетов внутри упавшего образа с `verify:image-workspace-deps` (зуб рецидивов 21.08/27.08), не чиня типы вслепую.

## Санитарные

- Пересекающиеся `sequence` двух `runId` в trail-агрегаторе (P1, с 22.09).
- Lint-warning `react-hooks/exhaustive-deps` (`titleOf` в `useCallback`) в `apps/cabinet` — одна строка, третий день.
- Диагноз плавающего `journal/selection/chain-rehearsal.test.ts` (#2399) — корневая причина или `.skip`; не основная работа.
- Добавить `friction`-запись в trail за 22–23.09 — одна строка JSONL.
- Открытый хвост инструментов (не магистраль): #2418 (четыре вечерних шага), #2413, #2412, #2420; порог доставки вечера без причины — третий вечер.
- Патч стендапа `#2410` (7b5b4679) **уже влит** — `DAILY_STANDUP` больше не самоназначает фокус; перечеканка `main-day-assertions` каноном при расхождении с гейтом — если гейт утра нёс иной `magistral`, зафиксировать отдельно (см. таблицу обоснования).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = `cabinet-registration-rollout`, второй день | сессия | `docs/tasks/main-day-assertions.json` → `sources[0].claim` (owner-choice@chat/magistral-24-09, ответ «1» на freeze: rollout · tooling-guards-day · tariff-transitions-live-day3) | 2026-09-24 |
| Выкатка остановлена на шаге 1 fail-closed; прод не тронут; образ office healthy `4af378da42f5`; cabinet.env без пары/флага | сессия + код | замер утра 24.09 в `sources[0].claim` (ствол fcb0fdc2 → 0c061a47); отчёт исполнителя выкатки | 2026-09-24 |
| Ствол typecheck/build office зелёный ×2; класс поломки — образ (устаревшие пакеты соседей), не исходники | код | замер ведущей в `sources[0]`; прецеденты verify:image-workspace-deps 21.08 / 27.08 | 2026-09-24 |
| CI smoke образа не слушает `background-cabinet/**` — поломка могла пройти молча после правок 22.09 | код | `.github/workflows/office-image-smoke.yml` paths (цитата в sources[0]) | 2026-09-24 |
| Порядок дня и две точки руки владельца — MEETING_ACTIVE «Выкатка и сквозная приёмка»; успех = второй кабинет на free-v1, закрытие #2369 | сессия / issue | `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md`; GitHub #2369 | 2026-09-23…24 |
| Эпик A–D + лендинг в стволе; выкатка — оставшаяся работа | код / issue | PR #2393, #2396, #2397, #2398, #2401; sources[1] замер 23.09 | 2026-09-23 |
| Стендап 24.09 **не** назначает фокус (патч #2410); кандидаты в STANDUP/DAY_PLAN — контекст, не выбор | код | PR #2410 / 7b5b4679; `DAILY_STANDUP.md` 2026-09-24 | 2026-09-24 |
| Веха горизонта `secret-parser-built` — фон дня, не primary; резак уже есть (secret-redact с 26.07) | план / код | `docs/STRATEGY_DAY.md` (gate); retired-redact-wrong-address-03-08 | 2026-09-24 / 2026-08-03 |
| **Расхождение:** STANDUP/DAY_PLAN пишут «магистраль не выбрана» и топ-3 кандидатов, тогда как `sources[0]` — owner-choice rollout. Магистраль взята из **assertions `sources[0]`** (прямое слово владельца). Если `morning-gates-state.json` нёс `magistral` на 2026-09-24 — он был бы свежее; в этом прогоне содержимое гейта во входах не приложено → assertions не перечеканены относительно гейта, расхождение стендап↔assertions = находка (перечеканка каноном предписана) | снимок-хардкод / план | STANDUP «Источник фокуса: нет»; DAY_PLAN top-3; vs sources[0] | 2026-09-24 |

**Голоса по различным первоисточникам:** (1) owner-choice 24.09 в sources[0] — **решающий**; (2) замер прода/образа 24.09; (3) MEETING_ACTIVE + #2369; (4) факт CI paths. Отражения STANDUP/DAY_PLAN top-3 (`angelina-hostess-impl` · `assets-container` · `batch-collection-run-contour`) — **1 источник-ранг реестра, 2 отражения**, **не** владельческий выбор; синтез магистрали из них **запрещён** при непустом `sources[]`.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Выкатка на прод **не** завершена: второй кабинет владельца на free-v1 ещё не живёт как принятый результат | эксплуатационный контур: `ALLOW_REGISTRATION=false`, нет `OFFICE_URL`/`OFFICE_API_TOKEN` в cabinet.env; шаг 6 смоука не прогонялся (sources[0]) | `holds` — работа выкатки/приёмки остаётся |
| Сборка **нового** образа офиса для выкатки сейчас ломается (не «типа нет в стволе») | факт отказа шага 1 + зелёный `turbo` typecheck/build на стволе (sources[0]); маркер символа `RunRecord.mountTarget` в isolation без лога отказа — `unknown` до вывода исполнителя | `holds` на «выкатка блокирована образом»; точный класс (stale packages vs иной) — **unknown**, первый шаг дня |
| «Кода регистрации ещё нет» | symbols/PR A–D в стволе (#2393…#2401) | **`violated` — ПОСЫЛКА НАРУШЕНА**; день = выкатка и приёмка, не повторная реализация двери/формы |

Развилка «писать код регистрации vs выкатывать» снята: код в стволе. Развилка «чинить типы вслепую vs сначала лог отказа / класс образа» — идём во второе.

## Сегодня делаем

1. **Получить дословный вывод отказа** сборки/up образа офиса от исполнителя выкатки (не чинить по догадке).
2. **Подтвердить или опровергнуть** класс «образ несёт устаревшие собранные пакеты соседей» (сверка с `verify:image-workspace-deps` / составом image).
3. **Починить сборку образа** по подтверждённому классу → новый образ собирается, контейнер office up healthy на целевом контуре.
4. **Рука владельца (точка 1):** пара `OFFICE_URL` / `OFFICE_API_TOKEN` и `ALLOW_REGISTRATION` в `/etc/membrana/cabinet.env` по MEETING_ACTIVE.
5. **Прогнать цепочку смоука** включая пишущий шаг 6 (живая дверь), зафиксировать evidence.
6. **Рука владельца (точка 2) + приёмка:** второй кабинет на free-v1; чеканка кода/критерия закрытия #2369 / контейнера заседания.
7. **Параллельно S (не блокируя rollout):** paths в `office-image-smoke.yml` + диагноз/фикс пересечения `sequence` в trail **или** явный тикет с владельцем.

## Definition of Done (фокус)

- [ ] Дословный лог/вывод отказа шага 1 получен и сохранён в evidence дня
- [ ] Класс поломки (stale image packages / иной) подтверждён или опровергнут записью
- [ ] Новый образ office собирается; контейнер healthy; `/health` 200 на выкатанной версии
- [ ] `cabinet.env`: `OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION` согласованы с MEETING_ACTIVE (рука владельца)
- [ ] Смоук выкатки включая шаг 6 (живая дверь) — прогнан, результат в evidence
- [ ] Второй кабинет владельца создаётся/живёт на проде на тарифе free-v1
- [ ] Путь закрытия #2369 и снятие контейнера `cabinet-registration-promo` сформулирован фактами приёмки (или issue закрыт, если критерии уже метятся)
- [ ] Прод не откатили в худшее состояние: fail-closed соблюдён при любом новом отказе

## Сознательно не делаем сегодня

- Не открываем новую сессию по уже влитому коду A–D «с нуля» и не переписываем дверь/форму без факта регресса на проде
- Не назначаем магистралью `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` — это freeze-кандидаты без owner-choice 24.09
- Не запускаем DSP-бенчмарки harmonic/cepstral/spectral-flux / «Этап 1.A» на free-v1 (потолок эшелона 0 зафиксирован)
- Не делаем основной работой плавающий `chain-rehearsal.test.ts` (#2399) — только диагноз абзацем или `.skip`
- Не тянем `mfcc-compare-sprint` параллельной полосой против незакрытого rollout
- Не трогаем амнистию архива / полный gейт `secret-parser-built` как primary, пока выкатка не стабилизирована
- Не чиним «типы mountTarget» в стволе вслепую до лога отказа исполнителя

## Вторично (если останется время)

1. Завести/закрыть тикет на paths `office-image-smoke.yml` (+ `background-cabinet/**`).
2. Lint `react-hooks/exhaustive-deps` в `apps/cabinet` (`titleOf`) — одна строка.

## Зависимости и риски

- **Блокер:** нет дословного вывода отказа → риск «лечения» не того слоя (ствол vs image).
- **Блокер:** две точки руки владельца (env + приёмка); без них DoD выкатки не закрывается.
- **Риск:** повторный fail на up после «зелёной» сборки — только fail-closed, старый healthy-образ не сносить.
- **Риск:** CI по-прежнему не сторожит cabinet-пути — регресс образа после мерджа соседей возможен до патча workflow.

## Ссылки

- `docs/DAILY_STANDUP.md` — 2026-09-24
- `docs/DAY_PLAN.md` — 2026-09-24
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built`
- `docs/tasks/main-day-assertions.json` — `sources[0].claim` (owner-choice magistral-24-09)
- `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` — выкатка и сквозная приёмка
- GitHub #2369 — cabinet registration / free-v1
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — почему не DSP-benchmark primary