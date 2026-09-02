<!-- Сгенерировано: 2026-09-02T11:31:22.973Z (yarn main-day-issue@78718d6a) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"caf5208d93874268eb7477f8448c2f3a1a262994","digest":"38560ffe1036c5075b91046d506134143dc5a33de14cc79bd98a34d07e162df2"},"DAILY_STANDUP":{"version":"caf5208d93874268eb7477f8448c2f3a1a262994","digest":"664cd9ee3d078eea79dd3a45cbd55845997ac4b17fb548878d3c37ed2ca42842"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-02

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `sample-move-between-collections` |
| `primaryTitle` | Перенос проб набор→набор в обоих домах (Studio + кабинет) |
| `githubIssue` | — |
| `size` | M |
| `promptPath` | — (карточка реестра / живой дефект владельца) |
| `сгенерировано` | 2026-09-02 |

## Магистраль

**sample-move-between-collections** — единственный обязательный мандат дня по прямому слову владельца (31.08, `sources[0]`): на живой работе нельзя перенести пробы из одного пользовательского набора в другой. Причина уже установлена до гейта: в обоих домах UI показывает перенос только при `selectedId === BUFFER_COLLECTION_ID` (`SampleLibraryModule.tsx` ~689 и ~757, `canMutate` у панели чарт-листа) — дверь нарисована лишь в буфере. `moveTargets` уже корректен (исключает текущий, буфер и системные); сервер (`samples.service.ts`) блокирует только тарифный набор и перенос «в тот же» — набор→набор он не запрещает. Исторически условие писали под разбор буфера; когда наборы стали архивом, ограничение потеряло смысл и осталось. Чинить **в обоих домах** (Studio и кабинет). Две оговорки проверить, не додумать: (1) набор→набор говорит «переносится… перенесено в X», как буфер→набор; (2) ценность «разобрано руками» у записи, уехавшей из именованного набора, не ломается.

**Критерий успеха к вечеру:** в Studio и в кабинете оператор переносит пробу(ы) из набора A в набор B без захода в буфер; тост/статус как у буфер→набор; регрессии ценности и buffer-only пути нет; merge только после зелёных фильтров тестов или явного диагноза красных (см. санитарные).

## Подкрепление

- **Диагноз и закрытие красных** `@membrana/media-library-service` + `@membrana/background-cabinet` (и классификация false red `#2256` / `background-media#test`) — без зелёного или issue с воспроизводимым вердиктом «помеха vs pre-existing» merge магистрали и очереди PR блокирован; не принять false red за регресс от `isReadOnlyCollection`.
- **Не сломать соседний контур переноса:** смоук buffer→набор и copy/move targets после снятия `BUFFER_COLLECTION_ID`-двери; при необходимости узкий diff-контроль `canMutate` / panel chart-list в обоих фасадах.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) — снятие амнистии на правку архива и безопасные бэкапы сессий.
- Узкое доведение очереди после разблока ствола: oversized (`caf5208d`, `f70b9064`, `9f49a1c0`), PR #2244 — только когда красные не держат merge.
- Три L-кандидата горизонта (`angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`) — ждут **нового** слова владельца; сегодня не стартуем параллельно магистрали.

## Экспериментальные

- Dry-run `night-triage-secret-scan.mjs` на одном датированном срезе: «что бы вырезал» рядом с «что нашёл» — резак уже режет или только детектит.
- Сверка 3–5 засвеченных ключей последнего скана со статусом ротации (жив/отозван/заменён) без правок — хватает ли сигнала для манифеста.
- На одном бэкапе сессии сравнение «до парсера» vs «после» по объёму/secret-подобным токенам (без чтения содержимого в промпт) — инвариант «сырое на сервер не уходит».

## Санитарные

- Два красных до любого merge: `@membrana/media-library-service`, `@membrana/background-cabinet` — диагноз «помеха vs pre-existing»; `#2256` — классификация.
- Три oversized над стволом без разворота: `caf5208d` (494), `f70b9064` (1559), `9f49a1c0` (628).
- Ревью-долг PR #2244 — diff / merge-gate или списать в ретро.
- P1 `scripts/lib/repo-links.mjs`: `ISSUE_LINK` с `/g` в модульном скоупе → `lastIndex` между вызовами.
- Токен бота сторожа диска (#2148) — перевыпуск (дважды светился в переписке).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `sample-move-between-collections` (перенос набор→набор, оба дома) | сессия | `main-day-assertions.json` → `sources[0]` (`owner-choice@chat/magistral-31-08`), author: human | 2026-08-31 |
| UI-дверь только в буфере: `selectedId === BUFFER_COLLECTION_ID` (~689, ~757) | код | `apps/client/src/modules/SampleLibraryModule.tsx` (указатель в claim владельца) | 2026-08-31 |
| Сервер набор→набор не блокирует (кроме тарифа и «в тот же») | код | `samples.service.ts` (указатель в claim владельца) | 2026-08-31 |
| Стендап 02.09 ставит P0 красные тесты и **откладывает** sample-move в перспективные; план дня — top-3 L под `secret-parser-built` без owner-choice | план | `docs/DAILY_STANDUP.md`, `docs/DAY_PLAN.md` (генераторы ритуала) | 2026-09-02 |
| **Расхождение:** assertions не перечеканены под 02.09; свежего `morning-gates-state.magistral` на сегодня во входе нет → по канону берём `sources[0]`, не синтез из стендапа/плана | сессия | норма У1 31.07 + probe freshness; gate-файл в контексте задания отсутствует | 2026-09-02 |
| Три L (`angelina-hostess-impl` · `assets-container` · `batch-collection-run-contour`) — кандидаты генератора, не слово владельца | снимок-хардкод | `DAY_PLAN.md` / реестр top-3; Q1 «выбор словом владельца» | 2026-09-02 |
| Веха горизонта `secret-parser-built` — gate стратегии #592, не назначение primary focus | план | `docs/STRATEGY_DAY.md` ← `docs/strategy/day-horizon.json` | 2026-09-02 |
| Красный `background-media#test` / очередь — перенос с 27–30.08, санитарно-блокеры merge, не замена owner-магистрали | issue | claim `sources[0]` + стендап (carry-over) | 2026-08-27…09-02 |

Голоса: **1 владельческий первоисточник** (choice 31.08) задаёт id магистрали. Стендап и DAY_PLAN — **отражения ритуала/генератора** (коррелированы между собой как «день без нового owner-choice»); их вес не перебивает `sources[0]`. Код-указатели в claim — детали раскрытия той же владельческой заявки (**1 источник, 2 отражения-указателя**). Синтезировать магистраль из P0-тестов или top-3 L **запрещено**, пока owner-source задан.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Перенос набор→набор в UI недоступен вне буфера (`canMutate` / условие на `BUFFER_COLLECTION_ID`) | `symbol:BUFFER_COLLECTION_ID` в `apps/client/src/modules/SampleLibraryModule.tsx` (и зеркало кабинета, если отдельный модуль) | `unknown` (подтвердить grep/чтением в начале дня; claim владельца 31.08 утверждает holds) |
| Сервер не является блокиратором набор→набор | `symbol:move` / политика в `samples.service.ts` (запрет только тарифа и same-collection) | `unknown` → проверить до широкого UI-рефактора |
| Работа «ещё не закрыта»: дефект на живой работе владельца | UI-предикат: selected user collection ≠ buffer → control move скрыт/disabled | `unknown` до смоука |

Развилка A/B (писать с нуля vs принять готовое): **нет** — это точечный съём ложного UI-условия в обоих домах, не новый серверный контур. Если маркер `BUFFER_COLLECTION_ID` на ветке move **уже снят** в обоих домах → **ПОСЫЛКА НАРУШЕНА**, день = приёмка/смоук + закрытие хвостов, не повторная «починка».

## Сегодня делаем

1. Подтвердить маркеры: grep/чтение `canMutate` / `BUFFER_COLLECTION_ID` в client (Studio) и кабинетном близнеце; зафиксировать «holds» или «уже снято».
2. Снять ограничение «только буфер» для move набор→набор в **обоих** домах; `moveTargets` не ломать.
3. Проверить копирайт статуса: «переносится… / перенесено в X» для путь набор→набор.
4. Проверить инвариант ценности: запись, уехавшая из именованного набора, остаётся «разобранной руками».
5. Смоук: buffer→набор по-прежнему работает; набор A→B и обратно; запрет тарифа/same на сервере жив.
6. Параллельно (блокер merge): прогон фильтров `turbo test` на media-library-service + background-cabinet; `#2256` — issue с вердиктом false red vs regression.
7. Короткий отчёт в вечерний контур: что смержено / что осталось на PR.

## Definition of Done (фокус)

- [ ] В Studio: перенос пробы(ов) из пользовательского набора A в набор B без selected=buffer
- [ ] В кабинете: то же поведение (близнецы)
- [ ] Статус/тост «переносится… перенесено в X» на пути набор→набор
- [ ] Оценка ценности «разобрано руками» не регрессирует после переноса именованный→именованный
- [ ] Buffer→набор и серверные запреты (тариф, same-collection) без регрессии
- [ ] Нет merge при красных media-library / background-cabinet без issue-диагноза
- [ ] Typecheck затронутых пакетов (media-library + client + cabinet) без новых красных
- [ ] Краткий вещдок/комментарий: до/после условия `canMutate` и список проверенных путей

## Сознательно не делаем сегодня

- Старт L-магистралей `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour` без нового слова владельца
- Повтор DSP/FFT benchmark harmonic+cepstral+flux / stage-gate на free-v1
- Oversized-ревью и PR #2244 как **главная** полоса дня (только после/рядом с диагнозом красных)
- `detector-scoreboard` / содержимое `CURRENT_TASK.md` как канон дня
- Ночные procedure-frames / night-hunt как ствол (история 29–30.08, не sources[0])
- Эшелон-2 «разведка» yamnet / combined benchmark ради бенчмарка

## Вторично (если останется время)

1. Черновик манифеста ротации / фикстурный прогон резака — подготовка к `secret-parser-built`, без смены primary.
2. P1 `repo-links.mjs` (`ISSUE_LINK` + `/g` / `lastIndex`) — узкий санитарный фикс.

## Зависимости и риски

- **Блокер merge:** красные `@membrana/media-library-service` и `@membrana/background-cabinet` (+ `#2256`) — магистраль может быть в коде, но не в стволе.
- **Риск ложного рефакторинга:** принять false red за регресс `isReadOnlyCollection` и раздуть diff.
- **Риск асимметрии домов:** починить только Studio и оставить кабинет — нарушение «близнецы».
- **Риск свежести assertions:** sources[0] от 31.08; если владелец сегодня на гейте выберет иную магистраль — перечеканить `main-day-assertions.json` (канон У1), не молчать.

## Ссылки

- `docs/DAILY_STANDUP.md` (2026-09-02)
- `docs/DAY_PLAN.md` (2026-09-02)
- `docs/STRATEGY_DAY.md` (веха `secret-parser-built`)
- `docs/tasks/main-day-assertions.json` → `sources[0]` (owner-choice 31.08)
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6 (не тянуть DSP benchmark в primary)
- Issue `#2256` (классификация background-media#test); PR `#2244` (долг ревью, не primary)