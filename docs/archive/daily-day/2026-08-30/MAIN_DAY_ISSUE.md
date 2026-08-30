<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-30
  archived-at: 2026-08-30T17:29:13.453Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-30T09:14:51.621Z (yarn main-day-issue@65bd50ff) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"78e913a002fdb216b2a2063238bf3376d55d2410","digest":"bb2dc0d9c2cd12542e9851f231146843dce9b495eb264e197842709f4d92ecc7"},"DAILY_STANDUP":{"version":"78e913a002fdb216b2a2063238bf3376d55d2410","digest":"8f2d907ec70a6ef924718b842b44bb5507c0b3b191db48c62aaf0e4da6db32cd"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-30

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `night-procedure-frames` |
| `primaryTitle` | Ночная процедура во фреймах: n1+n2 одним PR, затем n4/n5 |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — (карточка/промпт по id `night-procedure-frames`; claims-probe: в реестре карточки может не быть — фокус владельческий) |
| `сгенерировано` | 2026-08-30 |

## Магистраль

**night-procedure-frames** — продолжение вчерашнего выбора владельца: ночь становится отдельной процедурой со своим набором фреймов (как утро и вечер). Вчера доехали 2 из 5 блоков (n1 контейнер, n3 preflight) — PR #2239 OPEN с LGTM, в ствол не влит; красный зуб на неполном ядре **прав**. Ключевое изменение нарезки на сегодня: контракт корпуса считает процедуру построенной только целиком (`listBuiltProcedureIds` — папка под `docs/procedures/` с `MANIFEST.json`; ядро `trigger+steps+gates` — «все три или ни одного»; `steps.ref` обязан резолвиться) → **n1 и n2 обязаны уехать одним PR**, не «сначала n2». Остаток дня после слияния/доводки ядра: **n4** — сводка ночи одним файлом; **n5** — утренний читатель читает сводку сверх отчёта тестов. Критерий к вечеру: в стволе (или в одном готовом к merge PR) лежит целая ночная процедура с резолвящимся ядром; сводка ночи пишется одним артефактом; утро имеет читателя сводки, а не только test-report.

## Подкрепление

- **Довести/влить PR #2239 (n1+n3) в составе единого n1+n2** — красный зуб на неполном ядре не маскировать: либо дописать недостающие `trigger`/`steps`/`gates` и refs, либо пересобрать PR так, чтобы контракт корпуса видел процедуру целиком.
- **n4 сводка ночи одним файлом + n5 утренний читатель сверх test-report** — без читателя ночные прогоны снова «врали optional» и утро останавливалось на одном test-отчёте; это прямое продолжение обоснования владельца 29–30.08.

## Перспективные

- Прохождение контракта «процедура целиком» откроет честный предикат ночной охоты и снимет optional-маскировку ночных шагов.
- Оформленный утренний читатель сводки ночи развяжет гейт «отчёт сегодняшней даты» от единственного test-report и даст топливо ritual:day без ручного разбора логов.
- Манифест/предикат `secret-parser-built` (амнистия архива как предикат, не дата) — соседний горизонт #592; не ствол, но после ночной процедуры бэкапы сессий снова в фокусе безопасности.

## Экспериментальные

- Прогнать `listBuiltProcedureIds` / контракт ядра на черновике `docs/procedures/<night>/` с заведомо битым `steps.ref` → убедиться, что «все три или ни одного» реально режет неполные папки.
- Сверить один цикл «ночь → один файл сводки → утренний reader» на фикстуре без сети → узнать, хватает ли полей сводки, чтобы утро не падало на schedule drift 10–12 ч одним только test-report.
- Черновануть границу n4/n5: что в сводке обязательно (статус шагов, optional vs hard-fail, дата), а что остаётся в сыром journal.

## Санитарные

- Красный `@membrana/background-media#test` с 27.08 — **диагноз или issue**, не повторный ритуал и не primary.
- Schedule drift GitHub 10–12 ч — закрыть числом или явно загейтить (фон к n5, не ствол).
- `#2204` / media — только санитария; риск подмены `night-procedure-frames` держать явным отказом.
- Неразвёрнутый хвост `53b60caf` (~932 строки) / #2238 worktree — не разворачивать в feature-день.
- Claims-probe: в реестре нет карточек `night-procedure-frames` / `declared-imports` / `workspace-dirs` / `ritual-artifacts` / `buffer-delete-modal-2218` @53b60caf — зафиксировать пробел реестра, не назначать работу «создать карточку» вместо кода процедуры.
- Oversized / whitelist / secret-gate leftover (amnestyLifted) — отдельно от магистрали; резак уже существует (`scripts/lib/secret-redact.mjs`, retired-посылка 03.08).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `night-procedure-frames`, выбор №1 из замороженного топ-3 (night-procedure-frames · labels-export-partial-2237 · assets-container) | сессия | owner-choice@chat/magistral-30-08 (`sources[0]`, author: human) | 2026-08-30 |
| Продолжение вчера: та же магистраль; сделано 2/5 (n1, n3), PR #2239 OPEN + LGTM, красный зуб на неполном ядре верен | сессия | owner-choice@chat/magistral-30-08 + owner-choice@chat/magistral-29-08 | 2026-08-29…30 |
| Нарезка: n1+n2 одним PR — контракт корпуса (MANIFEST + trigger/steps/gates «все три или ни одного», steps.ref резолвится) | сессия | слово владельца в `sources[0].claim` 30.08 | 2026-08-30 |
| Ночь — отдельная процедура во фреймах, как утро/вечер; корень боли — нет читателя ночи (утро читает только test-report) | сессия | owner-choice@chat/magistral-29-08 | 2026-08-29 |
| DAY_PLAN top-3 (angelina-hostess-impl · assets-container · batch-collection-run-contour) — **не** магистраль: «выбор словом владельца (Q1)» | план | `docs/DAY_PLAN.md` + норма Q1 | 2026-08-30 |
| Стендап/горизонт #592 акцентируют `secret-parser-built` | план | `docs/DAILY_STANDUP.md`, `docs/STRATEGY_DAY.md` (gate approaching) | 2026-08-30 |
| **Расхождение:** стендап/горизонт тянут secret-parser; assertions `sources[0]` — night-procedure-frames. Магистраль взята с owner sources[0] (свежий выбор 30.08). Гейт `morning-gates-state.json` / magistral в контексте не передан → У1 «магистраль с гейта» не сработал. Стендап **не** перечеканен под owner-choice — находка ритуала | сессия + план | `main-day-assertions.json` sources[0] vs standup/strategy-day | 2026-08-30 |
| Резак секретов **уже есть** с 26.07 (`secret-redact.mjs`); посылка «сканер = только детектор» retired 03.08 — нельзя снова ставить primary «написать резак» | код / issue | retired-redact-wrong-address-03-08; #1240 / PR #1252 | 2026-07-26…2026-08-03 |

**Голоса по различным первоисточникам:** 1 источник (owner-choice 30.08) задаёт магистраль; 1 источник (owner-choice 29.08) — то же направление, коррелированное продолжение. Стендап + STRATEGY_DAY + кристаллы secret-* = **1 коррелированный снимок горизонта #592** (отражения вехи, не выбор ствола дня). DAY_PLAN top-3 = генератор без owner-choice. **Итог: 1 владельческий голос за night-procedure-frames; отражения secret-parser не перебивают sources[0].**

## Посылки

Развилки «работы ещё нет» в смысле «символа резака/fusion нет» для этой магистрали нет: предмет — процедура и контракт корпуса, не отсутствующий DSP-символ.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Ночная процедура ещё не принята корпусом как **целая** (ядро trigger+steps+gates неполно / PR не в стволе) | `file:docs/procedures/` (night) + состояние PR #2239; sym/контракт `listBuiltProcedureIds` | `unknown` на момент генерации (проверять в работе; красный зуб #2239 — сигнал «неполно», не «отсутствует идея») |
| Утро не читает сводку ночи сверх test-report | reader/gate path утреннего ритуала (файл/символ — уточнить при n5) | `unknown` → работа n5 осмысленна, пока маркер не violated |

Развилки A/B «назначить secret-parser primary» нет: owner sources[0] уже выбрал; retired-посылка запрещает фантом «написать redact в scanner».

## Сегодня делаем

1. Зафиксировать контракт: что именно должно лежать в `docs/procedures/<night>/` (MANIFEST.json + trigger + steps + gates; каждый `steps.ref` резолвится).
2. Собрать **один** PR: n1 (контейнер) + n2 (недостающее ядро/шаги), включив/переработав #2239 так, чтобы зуб на неполном ядре стал зелёным честно.
3. Прогнать проверку «процедура целиком» (`listBuiltProcedureIds` / эквивалент) на этой папке — ожидание: built=true только при полном ядре.
4. n4: один датированный файл-сводка ночи (статусы шагов, hard vs optional, без сырых секретов).
5. n5: утренний путь чтения сводки **сверх** test-report (хотя бы минимальный reader/preflight-хук).
6. Санитарно фоном: завести/уточнить issue по красному `@membrana/background-media#test` (без «ещё раз ритуал»).
7. Не трогать labels-export-partial-2237 / assets-container как ствол.

## Definition of Done (фокус)

- [ ] Единый PR (или влитый ствол) содержит n1+n2: ночная процедура как целый пакет под `docs/procedures/`
- [ ] `MANIFEST.json` + ядро `trigger` + `steps` + `gates` присутствуют совместно; нет «двух из трёх»
- [ ] Все `steps.ref` резолвятся; `listBuiltProcedureIds` (или канонический эквивалент) видит процедуру built
- [ ] Красный зуб #2239 на неполном ядре снят честным ядром, не skip/optional-маской
- [ ] n4: существует один файл сводки ночи с проверяемой схемой полей
- [ ] n5: утро/preflight читает сводку сверх test-report (след в коде или скрипте ритуала)
- [ ] LGTM по форме решения (Teamlead): ночь = процедура во фреймах, не россыпь cron-шагов
- [ ] Реестр/claims: если карточки `night-procedure-frames` нет — зафиксирован пробел; работа не подменена «созданием пустой карточки»

## Сознательно не делаем сегодня

- L-кандидаты генератора: `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour` — нет слова владельца на них сегодня
- Primary из горизонта `secret-parser-built` / «написать резак в night-triage-secret-scan.mjs» — противоречит owner 30.08 и retired-redact-03.08 (резак уже в `secret-redact.mjs`)
- `#2204` / красный media как ствол дня
- `detector-scoreboard`, FFT «Этап 1.A», повтор free-v1 DSP-бенчмарков
- `labels-export-partial-2237` как primary (был в топ-3 снимка, не выбран)
- Разворот oversized `53b60caf` / #2238 worktree в feature-день
- Недельная стратегия (кристалл `weekly-strategy-frozen`)

## Вторично (если останется время)

1. Диагноз или issue на `@membrana/background-media#test` (с 27.08) + одна строка в гигиене.
2. Число/гейт по schedule drift GitHub 10–12 ч — только если n4/n5 уже держатся.

## Зависимости и риски

- **Блокер:** контракт «все три или ни одного» — частичный merge n1 без n2 снова даст красный зуб и ложный «built».
- **Риск подмены ствола:** стендап/STRATEGY_DAY давят на secret-parser; DAY_PLAN — на L-тройку генератора. Держать sources[0].
- **PR #2239 OPEN:** не влит — координация с review/LGTM, не плодить второй параллельный PR без переноса diff.
- **Реестр:** отсутствие карточки `night-procedure-frames` в registry @claims-probe — риск «фокус вне реестра» без promptPath; не останавливает owner-мандат, но мешает archive/ритуалу.

## Ссылки

- `docs/DAILY_STANDUP.md` (2026-08-30) — широкий контекст; фокус стендапа **расходится** с owner magistral
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built` (approaching), горизонт #592
- `docs/DAY_PLAN.md` — top-3 без owner-choice
- `docs/tasks/main-day-assertions.json` — `sources[0]`: owner-choice@chat/magistral-30-08 → **night-procedure-frames**
- PR #2239 — n1/n3, OPEN, LGTM, неполный core
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — не primary; DSP 1.A запрещён как магистраль
- Кристаллы: `session-backup-requires-secret-redaction`, `secret-parser-cuts-aggressively`, `credential-rotation-biweekly` — контекст горизонта, не ствол дня