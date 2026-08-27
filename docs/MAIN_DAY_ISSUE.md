<!-- Сгенерировано: 2026-08-27T12:18:55.791Z (yarn main-day-issue@1fb41e9d) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"553d03938e9e0632a0df06eca1ce907c5e978a24","digest":"8797fc6d2b7267e1da4cf7fff7858201faf5ce016fbb48bfa1991164bbac7181"},"DAILY_STANDUP":{"version":"553d03938e9e0632a0df06eca1ce907c5e978a24","digest":"1c3bdf64ce42aca795978f54e6f09509b3c7ff9f54c0b513fcca738193f01574"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-27

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `none` (фокус вне реестра card-id; мандат — GitHub #2204) |
| `primaryTitle` | Плагин управления буфером: стоп сценария при заполнении + управляемый GC (журнал и библиотека) |
| `githubIssue` | #2204 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-08-27 |

## Магистраль

**#2204 — плагин управления буфером** в обоих домах (журнал и библиотека): стоп сценария при заполнении квоты и **управляемая** сборка мусора, а не только «очистить всё».

Узел: буфер 806/1024 МБ (79 %), 1747 проб; при темпе дежурства остатка хватает ~на 40 минут записи. Без разгрузки к пт 28.08 упрёмся в квоту на живом дежурстве. Главный риск дня — раздуть UI / два разных ядра вместо **общего контракта в `packages/`** и двух креплений, либо зачесть «кнопки есть» без проверяемого стопа сценария и чистки по счёту/порогу.

К вечеру: инкремент или PR по #2204 с (1) общим ядром буфера, (2) явным **remaining** и порогом стопа, (3) сигналом стопа наружу в сценарий, (4) принципами GC (что удаляем, в каком порядке, по какому счётчику) — либо честная **таблица gap**, без словесного зачёта.

**Критерий успеха к вечеру:** mergeable PR / инкремент с общим ядром + dual mount (журнал + библиотека) **или** gap-таблица с проверками; стоп сценария воспроизводим по порогу; remaining виден; GC не равен «wipe all».

## Подкрепление

- Инвентарь засвеченных ключей за 14 дней + черновик манифеста ротации (без выкладки) — чтобы датированный проход гейта `secret-parser-built` не упёрся в пустой список.
- Fail-closed обход `session-backup`: сырой транскрипт не уходит на сервер, пока `night-triage-secret-scan` / резак не отработал — замыкает кристаллы `session-backup-requires-secret-redaction` и `secret-parser-cuts-aggressively` на живой путь до снятия амнистии архива.

## Перспективные

- Прохождение `secret-parser-built` (резак + датированный проход с манифестом) снимает амнистию правки архива и открывает безопасные бэкапы сессий.
- Дежурство пт 28.08 — живой «после»-замер линеаризации журнала (#2113) и калибровка сторожа диска по реальной скорости записи.
- Разгрузка буфера до 28.08 + закрытый play-path выборки → регулярный разбор ночного улова установщиком Studio без гонки с media-квотой.
- Инсайт `insight-storage-as-product-promise` (активен): хранение как продуктовое обещание — буфер живёт сортировкой, не бесконечным накоплением; #2204 — прямой носитель.

## Экспериментальные

- Прогон `night-triage-secret-scan.mjs` на одном фрагменте с фейковым ключом: режет ли резак до архива или только детектит паттерн.
- Одна ручная «ложная» тревога сторожа диска в личный чат: отличима ли активная тревога (`insight-active-alarm-notifications`) от строки журнала без новых каналов.
- Пара дублей из буфера рядом в панели отбора без автоудаления: хватает ли «показать и ждать клика», чтобы разгрузка шла без порогового риска.

## Санитарные

- Ревью-долг oversized без развёрнутого diff: #2184/#2177 (play-path), #2192, #2188, #2201, `e6d298be` — только если блокирует merge #2204.
- **Stale `main-day-assertions.json`:** `sources[0]` от 25.08 (`sample-library-cabinet-chart-list`), не перечеканен под #2204 / сегодня — У1: расхождение гейт/стендап ↔ assertions.
- Play-path «треки из выборки не играют» (#2177): repro→green не закрыт; на проде принято владельцем — не primary.
- Хвост Night Hunt / старые PR: #1831, #1846, #1876, #1939, #1728, #1793 — вне дня.
- Помеха прогонов: `pr:ship` при ручном коммите → 0 без push/PR; сверка только `gh pr view`.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Фокус дня = #2204, плагин управления буфером (стоп + GC) в журнале и библиотеке | `сессия` / стендап | `docs/DAILY_STANDUP.md` «Фокус дня» + «слово владельца на #2204» | 2026-08-27 |
| Буфер 806/1024 МБ (79 %), ~40 мин записи до квоты; к 28.08 без разгрузки — удар по дежурству | `код` / ops-факт узла (через стендап) | замер узла + `DAILY_STANDUP.md` | 2026-08-27 |
| Не синтезировать top-3 DAY_PLAN (`angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour`) | `план` + норма Q1 | `docs/DAY_PLAN.md` + стендап «сознательно не делаем» | 2026-08-27 |
| Горизонт дня = `secret-parser-built` (approaching) — **контекст**, не primary focus | `план` | `docs/STRATEGY_DAY.md` / `day-horizon.json` (#592) | 2026-08-27 |
| Хранение: детекция первична, буфер живёт сортировкой | `снимок-хардкод` (граф) | кристалл/инсайт `insight-storage-as-product-promise` | активен (не stale) |
| **Расхождение У1:** магистраль взята со стендапа/слова владельца на #2204; `sources[0]` assertions **не перечеканены** (всё ещё 25.08: sample-library-cabinet-chart-list) | `сессия` + `снимок-хардкод` | `main-day-assertions.json` sources[0] vs standup #2204 | assertions 2026-08-25 · фокус 2026-08-27 |
| `sources[0]` 25.08 (cabinet-chart-list) — **устаревший owner-choice**, не мандат 27.08 | `сессия` | owner-choice@chat/magistral-25-08 | 2026-08-25 |
| FFT/«Этап 1.A»/benchmark harmonic+cepstral+flux — не магистраль | `код` | `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6 + `detection-planning-priorities.mjs` | 2026-06-14 / канон |
| #2177 play-path не primary: на проде «всё в силе» | `сессия` | стендап «сознательно не делаем» | 2026-08-27 |

**Счёт голосов (различные первоисточники):**

1. **Слово владельца / стендап 27.08 → #2204** — 1 источник (мандат дня).
2. **Замер квоты буфера на узле** — 1 источник (срочность, коррелирует с #2204, не отдельный выбор темы).
3. **DAY_PLAN top-3** — отвергнут нормой «owner-choice»; 0 веса как магистраль.
4. **assertions sources[0] 25.08** — 1 источник, **stale**; отражения в истории sources[] не суммируются. Перечеканка каноном предписана и **не сделана** (находка У1).
5. **Горизонт secret-parser-built** — 1 источник вехи; усиление/санитария, не подмена #2204.
6. **FFT §6** — 1 источник запрета ложной детекционной магистрали.

Итого по выбору primary: **независимый мандат #2204 (стендап/владелец сегодня)** побеждает stale assertions 25.08 и синтез top-3. Отражения одного снимка DAY_PLAN не считались раздельно.

## Посылки

Развилка «работы ещё нет» для ядра буфер-плагина **не закрыта маркером из входа** — явного `symbol:`/file-доказательства готового dual-house buffer governor во входах нет. Назначение #2204 держится на **продуктовом риске квоты** и слове владельца, не на посылке «символа нет ⇒ писать с нуля».

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| На проде/узле нет достаточного управления буфером: только «очистить всё», без стопа сценария по remaining и GC по счёту | проверка UX/кода плагинов журнала и library (конкретный symbol — уточнить при старте PR: governor/stop/threshold в `packages/`) | `unknown` на старте дня — **не** «issue open = работы нет»; перед кодом снять `unknown` grep/чтением |
| Assertions sources[0] отражают сегодняшний выбор | `file:docs/tasks/main-day-assertions.json` (date sources[0] == 2026-08-27 ∧ claim ⊃ #2204) | `violated` — **ПОСЫЛКА НАРУШЕНА** для «assertions свежие»; работа дня = #2204, параллельно нужен recut sources |

**Развилки A/B «писать fusion / Этап 1.A» нет. Посылок вида «fusion не живёт» не требуется.**  
Перед зачётом Done — не принять «кнопки» без маркеров стопа и remaining.

## Сегодня делаем

1. Зафиксировать контракт общего ядра буфера в `packages/` (remaining, порог стопа, сигнал наружу, политика GC) — без двух расходящихся реализаций дом₁/дом₂.
2. Крепление 1: журнал — стоп сценария при пороге + отображение remaining.
3. Крепление 2: библиотека — тот же контракт (симметрия домов).
4. Управляемый GC: критерии отбора на удаление (счёт/возраст/дубли), **не** только wipe-all; проверяемый сценарий.
5. PR/инкремент #2204 **или** gap-таблица «контракт / журнал / библиотека / GC / сигнал» с фактами.
6. (Параллельно, коротко) recut `main-day-assertions.json` sources[0] → claim на #2204 / 2026-08-27, чтобы У1 не ломал следующий ritual:day.
7. Не трогать merge-критический path посторонним oversized-ревью, если не блокер #2204.

## Definition of Done (фокус)

- [ ] Общее ядро буфера в `packages/` (не только UI-кнопки в одном доме)
- [ ] Явный **remaining** и порог стопа задокументированы в коде/API
- [ ] Сигнал стопа сценария наружу — проверяем воспроизводимо (не «на словах»)
- [ ] GC: политика по счёту/правилам; сценарий «частичная разгрузка» ≠ «очистить всё»
- [ ] Два крепления: журнал **и** библиотека на одном контракте
- [ ] PR/инкремент по #2204 **или** gap-таблица без зачёта несуществующего
- [ ] Нет регрессии «кнопка есть — сценарий пишет поверх квоты»
- [ ] (Гигиена) assertions sources[0] перечеканены под сегодняшний мандат **или** явный follow-up в вечернем ритуале

## Сознательно не делаем сегодня

- `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` как магистраль (top-3 DAY_PLAN — кандидаты, не выбор)
- #2177 play-path / симметрия библиотеки как primary (принято на проде; хвост — #2203 + oversized)
- `secret-parser-built` как primary coding-focus (горизонт/подкрепление, не #2204)
- `secret-parser` «написать резак с нуля» — резак в `secret-redact.mjs` с 26.07 (урок retired-redact-wrong-address)
- Ротация ключей с выкладкой; #2113 measure-live как primary
- FFT / «Этап 1.A» / benchmark harmonic+cepstral+flux / detector-scoreboard
- Night Hunt PR (#1831…) и весь oversized-долг как единственный фокус
- Синтез магистрали из горизонта или CURRENT_TASK в обход #2204

## Вторично (если останется время)

1. Черновик инвентаря ключей 14 дней + каркас манифеста ротации (без apply).
2. Точечный fail-closed check: backup-path не принимает сырой транскрипт до redact.

## Зависимости и риски

- **Квота media до 28.08** — жёсткий внешний дедлайн; срыв #2204 = срыв ёмкости дежурства.
- **Риск двойного ядра** (журнал vs библиотека) — нарушение packages-контракта; Структурщик (Ozhegov) на review связанности.
- **Stale assertions** — probe/ритуал завтра снова видит 25.08; recut обязателен.
- **Оversized-хвосты** могут отвлечь от merge #2204 — не поднимать, пока не block.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md) — фокус #2204, слово владельца
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md) — веха `secret-parser-built` (контекст)
- [docs/DAY_PLAN.md](./DAY_PLAN.md) — top-3 не выбран планом; санитария stale assertions
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json) — sources[0] stale 25.08 (У1)
- GitHub Issue **#2204** — плагин управления буфером
- [docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — запрет ложной FFT-магистрали