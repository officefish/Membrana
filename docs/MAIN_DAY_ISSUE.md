<!-- Сгенерировано: 2026-09-29T11:14:32.018Z (yarn main-day-issue@b2908615) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"e6b5bd6c13fae395994262a893f20b3a80006b33","digest":"ef5c58bcb0447746319bbee61f3ac1c46a021eb12d28fb6ad26dc0837d359a39","versionAt":"2026-09-29T14:06:37+03:00"},"DAILY_STANDUP":{"version":"e6b5bd6c13fae395994262a893f20b3a80006b33","digest":"842cd1bff93ecf7bd88c7d489ed5d77e054fa7075d5a244e0607c29d555cc382","versionAt":"2026-09-29T14:06:37+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-29

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `pagination-sample-library` |
| `primaryTitle` | Пагинация библиотеки сэмплов |
| `githubIssue` | #2476 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-29 |

## Магистраль

Владелец выбрал **pagination-sample-library** (28.09, owner-choice из замороженного снимка топ-3: three-roads-experiment · pagination-sample-library · batch-collection-run-contour). Дословно: «формально выбираем пагинацию, но первую тоже сделаем» — опыт трёх дорог идёт вторым путём того же дня, тогда как пагинация ведётся сессиями агента.

Без пагинации библиотека открывает все 1057 проб разом и замерзает (#2476). Пагинация — не улучшение UX, а минимальный инфраструктурный барьер, без которого библиотека непригодна к работе при любом объёме буфера. Текущий буфер 1727 проб / 797 МБ уже за пороговым значением — это давление на квоту и источник фризов.

**Критерий успеха к вечеру:** библиотека сэмплов открывается без фриза на 1057 пробах; прокрутка или переключение страниц загружает следующий срез — поведение воспроизводимо вручную и зафиксировано одним абзацем smoke-замера в задаче #2476.

## Подкрепление

- **Smoke-замер пагинации (#2476):** после влития зафиксировать один абзац — закрыла ли реализация фриз или причина в другом. Без замера кристалл «пагинация закрыла #2476» остаётся открытой гипотезой. Связь прямая: замер — приёмочный артефакт магистрали, не отдельная задача.
- **Вынести `PERSONAS` в `scripts/lib/personas.mjs`** (#2503/#2502): единственный источник правды по персонам снимает риск рассинхронизации `ask-persona.mjs` / `consilium.mjs` / `review-lead.mjs`. Консилиум читает граф правды и хендоф, питающие выбор магистрали; рассинхронизация персон в консилиуме — скрытый риск неверного выбора на следующий день. Размер XS, снимается в одном слоте.

## Перспективные

- Закрытие ревью-долга P1 (#2488 → #2489 → #2499) — пятый день в стволе без архитектурного разбора; без LGTM любой следующий L-эпик стартует с незаверённым фундаментом.
- Прохождение гейта `secret-parser-built` (резак в `night-triage-secret-scan.mjs` + датированный проход с манифестом ротации) — снимает амнестию архива и открывает правку исторических записей; веха вплотную, `angelina-hostess-impl` ждёт её прохождения.
- `batch-collection-run-contour` после консилиум-гейта по модели исполнения — буфер 1727 проб / 797 МБ давит на квоту; батч-контур разблокирует регулярную разгрузку, но без гейта в код не идём.

## Экспериментальные

- **Прогнать `night-triage-secret-scan.mjs` в режиме «только вывод» на одном тестовом файле с подставным ключом** — проверить, достаточно ли текущий детектор идентифицирует границы секрета для будущего резака; стоимость — один терминальный запуск.
- **Собрать вручную одну строку манифеста ротации** (имя ключа, дата засвечивания, статус) на любом известном засвеченном секрете — выяснить минимальный формат манифеста, который работает без автоматизации.
- **Прогнать предпуш-хук (#2507) на ветке с намеренно добавленным фейк-токеном** — проверить, стоит ли секрет-скан первым и блокирует ли пуш до CI; стоимость — один коммит в тестовой ветке.

## Санитарные

- **Ревью-долг P1** — архитектурный разбор #2488 → #2489 → #2499 пятый день в стволе без верификации; разобрать до любого нового кода.
- **`core.hooksPath` абсолютный (#2509)** — починка #2507 не действует ни в одном worktree, пока главное дерево не несёт коммит с ней; размер XS, снимает скрытый риск при любом push из worktree.
- **Перечеканить `main-day-assertions.json`** под `pagination-sample-library`; обновить `CURRENT_TASK.md` — сейчас оба ссылаются на снимок 26.09 (`cabinet-registration-rollout`), `yarn main-day-probe` даёт ложный вердикт.
- **Typecheck + lint по раскрытым PR** — `yarn turbo run typecheck test lint --filter=@membrana/tooling`; oversized PR (#2505, #2506, #2507) требуют выделенного слота, не попутного просмотра.
- **Проверить статус засвеченного токена бота `@MembranaWatchdog_bot`** (дважды попадал в переписку) — перевыпуск руками владельца.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Владелец выбрал `pagination-sample-library` из замороженного снимка топ-3 | сессия | owner-choice@chat/magistral-28-09 (`main-day-assertions.json`, `sources[0]`) | 2026-09-28 |
| Фриз библиотеки на 1057 пробах зафиксирован как открытая проблема | issue | GitHub Issue #2476 | актуален |
| Буфер 1727 проб / 797 МБ давит на квоту — давление реально | снимок | `DAILY_STANDUP.md` (роутинг персон, блокеры) | 2026-09-29 |
| Пагинация в топ-3 кандидатов плана дня | план | `DAY_PLAN.md` (детерминированный ранг, генератор #592) | 2026-09-29 |
| **Расхождение: `main-day-assertions.json` (`sources[0]`) называет `pagination-sample-library` (28.09), а `CURRENT_TASK.md` и assertions[] ссылаются на снимок 26.09 (`cabinet-registration-rollout`)** | снимок-хардкод | `main-day-assertions.json` + `CURRENT_TASK.md` | 2026-09-26 (устарел) |
| **Магистраль взята с `sources[0]` (`main-day-assertions.json`); `assertions` не перечеканены под неё — расхождение есть находка, перечеканка предписана каноном и не сделана** | сессия | `main-day-assertions.json` (`//date`, норма recut) | 2026-09-24 |

> **Голоса по различным первоисточникам:** (1) owner-choice 28.09 — независимый; (2) Issue #2476 — независимый; (3) `DAY_PLAN.md` + `DAILY_STANDUP.md` — один генератор #592, два отражения, вес одного. Итого: 3 независимых источника указывают на `pagination-sample-library`. Расхождение assertions/CURRENT_TASK — не контраргумент, а технический долг (перечеканка); зафиксировано отдельной строкой.

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| В библиотеке сэмплов отсутствует постраничная загрузка (все пробы рендерятся разом) | `symbol:useSampleLibraryPagination` в `apps/client/src/` | `unknown` — требует проверки `yarn main-day-probe`; если символ найден → ПОСЫЛКА НАРУШЕНА, день превращается из «построить» в «принять и задокументировать» |
| Фриз (#2476) воспроизводится при открытии библиотеки на 1057 пробах без пагинации | `file:docs/issues/2476-pagination-freeze-confirmed.md` или аналогичный артефакт замера | `unknown` — артефакт замера не зафиксирован в репо; smoke-замер — первое действие дня |

> Если `symbol:useSampleLibraryPagination` найден `git grep`-ом — объявить **ПОСЫЛКА НАРУШЕНА**, переключить день в режим приёмки: верифицировать поведение вручную, закрыть #2476, зафиксировать артефакт.

## Сегодня делаем

1. Перечеканить `main-day-assertions.json` под `pagination-sample-library` и обновить `CURRENT_TASK.md` — устранить ложный вердикт `yarn main-day-probe`. *(XS, первым делом)*
2. Прогнать `git grep` на `useSampleLibraryPagination` и смежные символы — установить, есть ли пагинация в коде, или работа стартует с нуля.
3. Если символа нет: реализовать постраничную загрузку в библиотеке сэмплов (срез N проб на страницу, кнопка/прокрутка), не задевая логику детекции.
4. Если символ есть: верифицировать поведение вручную на 1057 пробах, зафиксировать smoke-замер одним абзацем в #2476, закрыть issue.
5. Вынести `PERSONAS` в `scripts/lib/personas.mjs`, обновить импорты в `ask-persona.mjs` / `consilium.mjs` / `review-lead.mjs`. *(XS, подкрепление)*
6. Smoke-замер пагинации: один абзац — закрыла ли реализация фриз #2476 или нужен дополнительный разбор.
7. Зафиксировать `core.hooksPath` (#2509) — коммит с абсолютным путём в главном дереве, проверить хук в worktree. *(XS санитарное)*

## Definition of Done (фокус)

- [ ] `main-day-assertions.json` перечеканен под `pagination-sample-library`; `yarn main-day-probe` даёт зелёный вердикт.
- [ ] Пагинация реализована (или подтверждено существование): библиотека открывается без фриза на 1057 пробах.
- [ ] Smoke-замер зафиксирован в #2476 одним абзацем (воспроизводимость / причина / статус).
- [ ] Issue #2476 закрыт или содержит явный следующий шаг с обоснованием.
- [ ] `PERSONAS` вынесен в `scripts/lib/personas.mjs`; три скрипта импортируют из единого источника.
- [ ] `core.hooksPath` (#2509) зафиксирован коммитом в главном дереве; хук работает в worktree.
- [ ] `CURRENT_TASK.md` обновлён и не ссылается на снимок 26.09.

## Сознательно не делаем сегодня

- **`cabinet-registration-rollout` #2369** — статус OPEN пятый день; без явного слова владельца (магистраль или фон) в код не идём.
- **`angelina-hostess-impl`** — стендап 23.09 самоназначил её фокусом; owner-choice 28.09 явно выбрал пагинацию; хостес — в перспективных после прохождения гейта `secret-parser-built`.
- **`batch-collection-run-contour`** — в код без консилиум-гейта по модели исполнения не идём; буфер давит, но канон важнее скорости.
- **Ревью-долг P1 (#2488 → #2489 → #2499)** — разобрать до нового кода, но не вместо магистрали: выделить отдельный слот после перечеканки assertions.
- **DSP-бенчмарки / Этап 1.A / повтор free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); тема закрыта без смены датасета или fusion.
- **Эшелон 2 (yamnet) «в разведку»** — де-факто в prod-бенчмарке (F1 0.803); повторная разведка без новой задачи реестра — трата слота.

## Вторично (если останется время)

- Архитектурный разбор ревью-долга P1 (#2488 → #2489 → #2499) — один слот, без написания нового кода.
- Проверить статус токена `@MembranaWatchdog_bot` и инициировать перевыпуск у владельца.

## Зависимости и риски

- **Блокер 1:** если `useSampleLibraryPagination` уже существует в коде — день переключается в режим приёмки; не назначать реализацию до проверки маркера (`git grep`).
- **Блокер 2:** `core.hooksPath` (#2509) — любой push из worktree до коммита с правкой исполняет старый хук; риск скрытого CI-сбоя при доставке пагинации.
- **Риск:** smoke-замер может показать, что фриз #2476 вызван не отсутствием пагинации, а другой причиной (трейс-вкладка, тяжёлый рендер). В этом случае замер — находка, не провал; следующий шаг формулируется по результату.
- **Риск:** `assertions[]` в `main-day-assertions.json` пуст (сознательно, по `//link-16-08`-паттерну) — если посылка `useSampleLibraryPagination` невыразима текущими маркерами, зафиксировать это явно в `//` комментарии, не выдумывать суррогат.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-09-29
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня, кандидаты магистрали
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — owner-choice 28.09, `sources[0]`
- [GitHub Issue #2476](https://github.com/officefish/Membrana/issues/2476) — фриз библиотеки на 1057 пробах