<!-- Сгенерировано: 2026-09-01T08:35:32.916Z (yarn main-day-issue@62e1f1d6) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"47e5a8a6489ff77c124aadc79928fe0af141dc38","digest":"f8a865fe447952016b3ac17b941ec522d9d2f0e269e65ca75b31f313e2bf6baf"},"DAILY_STANDUP":{"version":"47e5a8a6489ff77c124aadc79928fe0af141dc38","digest":"5b8a3b32adb08b27edab1b6ef4b3ced0749305da67759fc7d81b1f75b8a5d3e6"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-01

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `sample-move-between-collections` |
| `primaryTitle` | Перенос проб между пользовательскими наборами (обе точки входа) |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-01 |

## Магистраль

**Магистраль взята из `sources[0].claim` — прямой выбор владельца 31.08; `morning-gates-state.json` не предоставлен, расхождение не обнаружено.**

Дефект найден владельцем на живой работе: пробы нельзя переносить из одного пользовательского набора в другой. Диагноз до гейта установлен: кнопка переноса показывается только при условии `selectedId === BUFFER_COLLECTION_ID` в `apps/client/src/modules/SampleLibraryModule.tsx` (~689 и ~757), то есть дверь нарисована исключительно для буфера. Список целей `moveTargets` уже корректен (исключает текущий набор, буфер и системные), сервер переносить не мешает (`samples.service.ts` блокирует только тарифный набор и перенос в себя). Историческая причина: условие писалось буквально под задачу разбора буфера и потеряло смысл, когда наборы стали архивом.

**Критерий успеха к вечеру:** в обоих домах (Studio и кабинет) кнопка «Перенести» видна для любого пользовательского набора, перенос проходит с сообщением «переносится… перенесено в X» (как уже сделано для буфер→набор), оценка ценности не ломается, зуб `background-media#test` не краснее, чем был.

## Подкрепление

- **Диагностика красного `@membrana/background-media#test`** — `turbo test --filter=@membrana/background-media`; завести issue с диагнозом «помеха vs pre-existing». Без зелёного теста (или явного диагноза) вечерний ритуал остаётся ненадёжным, а merge-gate для любых работ с media-пакетом не проходим.
- **Ревью-дожим PR #2244** (разметка, блокер починен, ждёт ревью) — развернуть diff, дать merge-gate или явно списать в ретро; без решения по нему PR висит как незакрытый долг и занимает полосу внимания.

## Перспективные

- Закрытие `secret-parser-built` снимет мораторий на правку архива и разблокирует очередь работ с историческими файлами; следующий шаг — предикат `amnestyLifted` и датированный проход.
- Owner-choice по проводке `secret-redact` в путь triage→backup откроет планирование ночного дежурства с полной защитой сессионного архива.
- Зелёный `background-media#test` откроет уверенный вечерний ритуал и разблокирует PR-гейт для всех работ, затрагивающих media-пакет.

## Экспериментальные

- **Проба «dry-run резака»:** запустить `night-triage-secret-scan.mjs` на тестовом снимке с подставным секретом без записи — проверить, режет ли уже или только детектирует (один запуск, обратимо).
- **Проба «один засвеченный ключ → манифест ротации»:** вручную пройти форму biweekly-манифеста на реальном ключе из архива — выяснить, покрывает ли `credential-rotation-biweekly` амнистию архива или нужен отдельный предикат.
- **Проба «активная тревога без журнала»:** отправить тестовый алерт в `@MembranaWatchdog_bot` минуя ленту — проверить достаточность текущего канала сторожа для `insight:insight-active-alarm-notifications`.

## Санитарные

- **P1:** `turbo test --filter=@membrana/background-media` → диагноз и issue (красный с 27.08, прямой блокер вечернего ритуала).
- Дожать ревью-долг PR #2244 (oversized): развернуть diff и дать merge-gate или списать в ретро.
- Проверить разъезд близнецов `readOnlyCollection` — Studio (`kind === 'system'`) vs cabinet (`isTariffDataset || system`), убедиться что зуб `deletion-dialog-twins` это покрывает.
- Lint P2: `titleOf` в deps в `CabinetSampleDuplicatesPanel` — мелкий хвост, закрыть до накопления долга.
- Токен бота сторожа диска перевыпустить (дважды попадал в переписку, #2148).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `sample-move-between-collections`; дефект найден владельцем на живой работе | сессия | `owner-choice@chat/magistral-31-08` (слово владельца) | 2026-08-31 |
| Причина установлена ведущей: условие `selectedId === BUFFER_COLLECTION_ID` в `SampleLibraryModule.tsx` ~689 и ~757 | код | `apps/client/src/modules/SampleLibraryModule.tsx` | живой (проверено до гейта) |
| Сервер переносить не мешает: `samples.service.ts` блокирует только тарифный набор и перенос в себя | код | `packages/services/samples/samples.service.ts` | живой |
| `moveTargets` уже корректен — исключает текущий набор, буфер и системные | код | `apps/client/src/modules/SampleLibraryModule.tsx` | живой |
| DAY_PLAN и DAILY_STANDUP называют `angelina-hostess-impl / assets-container / batch-collection-run-contour` кандидатами магистрали | план/снимок | `docs/DAY_PLAN.md`, `docs/DAILY_STANDUP.md` — 1 источник, 2 отражения | 2026-09-01 |
| Выбор владельца 31.08 НОВЕЕ снимка топ-3 из плана → `sources[0].claim` перекрывает план; синтез запрещён | сессия | `docs/tasks/main-day-assertions.json` → `sources[0]` | 2026-08-31 |
| `morning-gates-state.json` не предоставлен → расхождение гейт/assertions проверить невозможно; магистраль взята из `sources[0]` как единственного владельческого источника | — | — | — |

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Кнопка переноса показывается только из буфера (`selectedId === BUFFER_COLLECTION_ID`) — в набор→набор не открыта | `symbol:BUFFER_COLLECTION_ID` в `apps/client/src/modules/SampleLibraryModule.tsx` (строки ~689, ~757) | holds — дефект подтверждён диагнозом ведущей до гейта |
| Серверная логика переноса не блокирует набор→набор (блокирует только тарифный набор и перенос в себя) | `symbol:moveCollection` / `symbol:move` в `packages/services/samples/samples.service.ts` | holds |
| `moveTargets` корректен и уже исключает текущий набор, буфер и системные | `symbol:moveTargets` в `SampleLibraryModule.tsx` | holds — список целей не требует правки |

## Сегодня делаем

1. Открыть `apps/client/src/modules/SampleLibraryModule.tsx`, снять условие `selectedId === BUFFER_COLLECTION_ID` у кнопки переноса (~689 и ~757) — заменить на проверку «не системный и не буфер» для обоих домов (Studio и кабинет).
2. Убедиться, что текст сообщения при переносе набор→набор использует форму «переносится… перенесено в X» (аналогично уже готовому буфер→набор).
3. Проверить, что оценка ценности записи, уехавшей из именованного набора в другой, остаётся «разобранной руками» — не сбрасывается.
4. Запустить `turbo test --filter=@membrana/background-media` → зафиксировать диагноз, открыть issue если pre-existing.
5. Прогнать smoke переноса в обоих домах вручную: выбрать пробу в пользовательском наборе, перенести в другой пользовательский набор, убедиться в корректном сообщении и отсутствии регрессий в буфере.
6. Дать merge-gate или явно списать PR #2244 в ретро.

## Definition of Done (фокус)

- [ ] Условие показа кнопки переноса снято с `BUFFER_COLLECTION_ID` в обоих домах (Studio и кабинет) — код изменён и прошёл lint.
- [ ] Перенос набор→набор работает с текстом «переносится… перенесено в X» (проверено smoke).
- [ ] Оценка ценности записи не сбрасывается при переносе между пользовательскими наборами.
- [ ] Перенос в буфер и системные наборы по-прежнему недоступен (регрессия не введена).
- [ ] `turbo test --filter=@membrana/background-media` → результат зафиксирован (зелёный или issue с диагнозом).
- [ ] PR #2244 получил merge-gate или явно списан в ретро.
- [ ] Токен бота сторожа диска перевыпущен (#2148).

## Сознательно не делаем сегодня

- **`angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour`** — план назвал их топ-3 кандидатами, но выбор владельца 31.08 их перекрыл; возвращаются в очередь.
- **Повторный benchmark harmonic+cepstral+flux на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); нет смены датасета, алгоритма или fusion.
- **Детекционные DSP-работы без смены датасета/алгоритма** — нечего запускать.
- **Ревью oversized PR #2246/`0210aa7e` как ствол утра** — только если background-media закрыт и `sample-move-between-collections` добит.
- **Три L-задачи параллельно** — до завершения магистрали команда не распыляется.

## Вторично (если останется время)

- Проверить разъезд близнецов `readOnlyCollection` — Studio (`kind === 'system'`) vs cabinet (`isTariffDataset || system`), убедиться что зуб `deletion-dialog-twins` это покрывает.
- Lint P2: `titleOf` в deps в `CabinetSampleDuplicatesPanel` — мелкий хвост.

## Зависимости и риски

- **Блокер 1:** красный `@membrana/background-media#test` (с 27.08) — если pre-existing, диагноз фиксируется issue и работа идёт дальше; если помеха от сегодняшних изменений — стоп и откат.
- **Блокер 2:** `morning-gates-state.json` не предоставлен — если гейт несёт свежий `magistral` с сегодняшней датой, он может расходиться с `sources[0]`; расхождение следует зафиксировать по норме У1 и перечеканить `main-day-assertions.json`.
- **Риск:** близнецы Studio/кабинет могут расходиться глубже, чем одна строка условия — необходима проверка обоих путей кода перед PR.
- **Риск:** PR #2244 может нести зависимость от `sample-move-between-collections` — развернуть diff до начала работы.

## Ссылки

- [DAILY_STANDUP](docs/DAILY_STANDUP.md)
- [DAY_PLAN](docs/DAY_PLAN.md)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — `sources[0]`, выбор владельца 31.08
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — §6, потолок эшелона 0