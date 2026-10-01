<!-- Сгенерировано: 2026-10-01T07:42:03.897Z (yarn main-day-issue@d364ef64) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"d364ef644d2c9be841ad57ecad431239507cda00","digest":"4c9fe704297fc36d1ca16f96b20159d6b1b6e8cdc587f1cc8b47e40d9d3ce05e","versionAt":"2026-10-01T10:34:03+03:00"},"DAILY_STANDUP":{"version":"d364ef644d2c9be841ad57ecad431239507cda00","digest":"0c9671033ae63a3c153393f5ec1b6fa93f607f546d3a1b66eadb61ca745f069d","versionAt":"2026-10-01T10:34:03+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-01: Ведущая как автономный агент (`angelina-hostess-impl`)

<!-- Сгенерировано: 2026-10-01 (yarn main-day-issue) -->
<!-- Магистраль: owner-choice@chat/magistral-01-10 · sources[0].claim · перечеканено сегодня -->

---

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `angelina-hostess-impl` |
| `primaryTitle` | Ведущая как автономный агент — снять ручные операции модерации |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — (фокус вне реестра с task-промптом; зафиксировано в assertions 01.10) |
| `сгенерировано` | 2026-10-01 |

---

## Магистраль

**`angelina-hostess-impl`** — слово владельца 01.10, выбор из топ-3 (`angelina-hostess-impl` · `assets-container` · `chart-list-plugin`), источник `owner-choice@chat/magistral-01-10`.

Сейчас роль «ведущей» держится на ручных операциях: раздача заданий, проверка по факту, приёмка/мердж по результату, запуск ритуалов — всё это делает владелец вручную. Имплементация хостесс-агента снимает этот операционный долг и переводит контур исполнения на автономный цикл. Первый инструментальный день после закрытия продуктовых дней 30.09: окно без конкурирующих L открыто именно сейчас, откладывать — значит держать весь контур на ручном управлении ещё один день.

Главный риск дня: без зафиксированного контракта (`docs/procedures/angelina-hostess-contract.md`) реализуется «что-то», а не то, что снимает операционный долг. Контракт — до кода, не после.

**Критерий успеха к вечеру:** хотя бы один полный автономный цикл (выдача задания → проверка по факту → приёмка) выполнен и записан в `docs/procedures/` с `acceptedBy=angelina`, `isValid=true` — без вмешательства владельца.

---

## Подкрепление

- **PR-ревью #2529** (7627 строк, `fuseDetectorConfidences`, T2-скоуп, P1-блокер) — первым действием утром, до любой правки в `@membrana/core` / benchmark-пути; без снятого блокера правка вслепую. `yarn code-review:pr 2529`, вердикт в комментарий к PR.
- **Запланировано: закрыть #2503** (`PERSONAS` → `scripts/lib/personas.mjs`, XS, пятый день без движения) — дублирующая константа в трёх скриптах; ровно класс мест, где засвеченный ключ живёт невидимо и резак парсера не знает точных границ обрабатываемых файлов.

---

## Перспективные

- Закрытие вехи `secret-parser-built` разблокирует амнистию на правку архива сессий и откроет плановую двухнедельную ротацию ключей (`credential-rotation-biweekly`); сегодня — только разведочный сухой прогон как экспериментальный слот, не магистраль.
- Автономный цикл Ангелины как референс для будущей процедурной оркестрации: если цикл зафиксирован документально (`docs/procedures/`), он становится шаблоном для других процедурных запусков через `background-office`.
- `assets-container` и `chart-list-plugin` — следующие кандидаты в магистраль после owner-choice; оба L, оба ждут освобождения фокуса.

---

## Экспериментальные

- **Прогнать `night-triage-secret-scan.mjs` в режиме сухого прогона на архиве сессий** — узнать, сколько реальных секретных паттернов найдено до написания резака; входные данные для `secret-parser-built`.
- **Взять один session-бэкап из `docs/seanses/` и вручную разметить границы «вырезать»** — проверить, достаточно ли регулярных выражений или нужен контекстный парсер; стоимость ошибки до реализации — нулевая.
- **Проверить, перехватывает ли текущий детектор ротируемые ключи media-VPS** (формат из `disk-watchdog-calibration`, #2148) — нет ли слепого пятна на этом классе секретов до выкатки резака.

---

## Санитарные

- Закрыть trail-прогон `ritual-day-2026-09-29-r2`: `yarn turbo run typecheck test lint --filter=@membrana/tooling` (Дынин, четвёртый перенос; при пятом — drift tooling заблокирует цепочку).
- Запланировано: закрыть #2503 `PERSONAS` → `scripts/lib/personas.mjs` (Ожегов, пятый день XS без движения).
- PR-ревью #2529 (7627 строк, `fuseDetectorConfidences`, T2-скоуп) — P1, до следующей правки benchmark-пути.
- PR-ревью #2534 (826 строк, `OverflowWindow`, aria-семантика плашки «буфер полон») — по остатку дня, Верстальщик + Музыкант.
- Диагностика красного `@membrana/background-cabinet` (`yarn turbo run test --filter=@membrana/background-cabinet`): корень назвать, issue открыть или закрыть до мержа в затронутый пакет.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `angelina-hostess-impl`, выбор владельца из топ-3 | `sources[0].claim` в `main-day-assertions.json` | `owner-choice@chat/magistral-01-10` (реплика владельца в чате) | 2026-10-01 |
| Тот же выбор подтверждён гейтом утра | `morning-gates-state.json`, поле `magistral` | снимок гейта (`magistralAuthor=snapshot`) | 2026-10-01 |
| **Расхождение: магистраль взята с гейта, assertions не перечеканены** — `morning-gates-state.json` несёт `magistral=angelina-hostess-impl` с `day=2026-10-01`, что позднее или одновременно с `sources[0]`; оба владельческие, спор решается свежестью. `assertions[]` пуст (0 посылок), перечеканка `main-day-assertions.json` каноном предписана и не сделана — это находка, не ошибка дня | `morning-gates-state.json` vs `main-day-assertions.json` | оба файла 01.10 | 2026-10-01 |
| Стендап подтверждает: владелец 01.10 выбрал `angelina-hostess-impl` словом из топ-3 | `DAILY_STANDUP.md` § «Фокус дня» | `owner-choice@chat/magistral-01-10` (тот же первоисточник) | 2026-10-01 · **1 источник, 2 отражения** (assertions + стендап) |
| План дня (`DAY_PLAN.md`) фиксирует ту же магистраль, объясняет L-размер и системообразующую роль | `DAY_PLAN.md` § «Магистраль» | `owner-choice@chat/magistral-01-10` (то же слово владельца) | 2026-10-01 · **1 источник, 3-е отражение** |
| Контур исполнения держится на ручных операциях (задания, приёмка, ритуалы — вручную) | `DAILY_STANDUP.md` § «Фокус дня», описание операционного долга | наблюдение команды / стендап | 2026-10-01 |
| Первый инструментальный день после закрытия продуктовых дней 30.09: окно без конкурирующих L | `DAY_PLAN.md`, `DAILY_STANDUP.md` § «Что не делаем» | вчерашний ритуал, архив 30.09 | 2026-09-30 |
| `assets-container` и `chart-list-plugin` — тоже L; расщепление фокуса между тремя L разрушает все три | `DAY_PLAN.md` § «Что не делаем», `DAILY_STANDUP.md` | `owner-choice@chat/magistral-01-10` + план | 2026-10-01 |

**Итог подсчёта голосов:** единственный независимый первоисточник — реплика владельца `owner-choice@chat/magistral-01-10` от 01.10; assertions, стендап и план — три отражения одного источника (вес = 1). Гейт утра (`morning-gates-state.json`) — второй независимый источник, тот же выбор, тот же день. Два независимых источника согласны → магистраль однозначна. Синтез запрещён, он и не потребовался.

---

## Посылки (фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| Автономный цикл Ангелины не реализован: ни один полный цикл (задание → проверка → приёмка) не записан в `docs/procedures/` с `isValid=true` | `file:docs/procedures/angelina-hostess-contract.md` — файл отсутствует | `holds` (файла нет, контракт не зафиксирован) |
| Контракт (`angelina-hostess-contract.md`) до кода отсутствует — реализация без него = «что-то», а не снятие операционного долга | `file:docs/procedures/angelina-hostess-contract.md` | `holds` |
| Ведущая сейчас не является автономным агентом: модерация, раздача заданий и ритуалы делаются вручную владельцем | наблюдение стендапа; `file:docs/procedures/` — нет записей автономного цикла за 01.10 | `holds` |

Развилки нет — все три посылки выполняются, назначение работы корректно.

---

## Сегодня делаем

1. **Зафиксировать контракт** `docs/procedures/angelina-hostess-contract.md`: входные события (триггер задания) → выходные артефакты (протокол приёмки), граница модуля — до написания кода. Ответственный: Архитектор (Веснин).
2. **Спроектировать обработчик автономного цикла** (хук/фасад, слабая связанность, без прямых зависимостей между плагинами) — Структурщик (Ожегов). Артефакт: скелет модуля с явными точками входа/выхода.
3. **Выполнить один полный цикл** (выдача задания → проверка по факту → приёмка) и записать протокол в `docs/procedures/` с `acceptedBy=angelina`, `isValid=true` — без вмешательства владельца.
4. **Закрыть P1-блокер**: `yarn code-review:pr 2529` (7627 строк, `fuseDetectorConfidences`) — вердикт в комментарий к PR до любой правки в `@membrana/core`.
5. **Диагностировать `@membrana/background-cabinet`**: `yarn turbo run test --filter=@membrana/background-cabinet` → корень назван, issue открыт или закрыт.
6. **Запланировано: закрыть #2503** (`PERSONAS` → `scripts/lib/personas.mjs`) — Ожегов, XS, пятый день.
7. **Закрыть trail-прогон** `ritual-day-2026-09-29-r2`: `yarn turbo run typecheck test lint --filter=@membrana/tooling` — Дынин; при следующем переносе ставить P1.

---

## Definition of Done (фокус)

- [ ] `docs/procedures/angelina-hostess-contract.md` создан и содержит: входные события, выходные артефакты, границу модуля, критерии приёмки — до написания продуктового кода.
- [ ] Обработчик автономного цикла спроектирован: хук/фасад с явными точками входа/выхода, без прямых зависимостей между плагинами — зафиксирован в коде или ADR.
- [ ] Один полный автономный цикл (задание → проверка → приёмка) выполнен и записан в `docs/procedures/` с `acceptedBy=angelina`, `isValid=true`.
- [ ] Владелец не вмешивался в цикл вручную — подтверждено записью протокола.
- [ ] PR-ревью #2529 завершено: вердикт (LGTM / не LGTM + список замечаний) опубликован в комментарий к PR.
- [ ] `@membrana/background-cabinet` тест: корень диагностирован, issue открыт или закрыт — не «красный без объяснения».
- [ ] Запланировано: #2503 закрыт, `PERSONAS` вынесена в `scripts/lib/personas.mjs`, три скрипта импортируют из одного источника.

---

## Сознательно не делаем сегодня

- **`assets-container`** — L, конкурирует с магистралью; уходит в следующий owner-choice.
- **`chart-list-plugin`** — L, та же причина; очередь после `assets-container`.
- **Benchmark harmonic+cepstral+flux на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); повтор без смены датасета или fusion-слоя не даёт новых данных.
- **`secret-parser-built` как магистраль** — веха `approaching`, но требует owner-choice; сухой прогон `night-triage-secret-scan.mjs` — только в экспериментальный слот.
- **Правку benchmark-пути в `@membrana/core`** — до завершения pr-ревью #2529 (P1-блокер не снят).
- **Запуск `ritual:evening` / архивацию** без закрытого критерия DoD по магистрали.

---

## Вторично (если останется время)

- PR-ревью #2534 (826 строк, `OverflowWindow`, aria-семантика плашки «буфер полон») — Верстальщик + Музыкант.
- Сухой прогон `night-triage-secret-scan.mjs` на одном session-бэкапе из `docs/seanses/` — разведка для `secret-parser-built` (экспериментальный слот, не магистраль).

---

## Зависимости и риски

- **P1-блокер (явный):** PR #2529 (7627 строк, `fuseDetectorConfidences`) влит без развёрнутого ревью; любая правка в `@membrana/core` / benchmark-путь до ревью — вслепую. Снимается `yarn code-review:pr 2529` первым действием утра.
- **P1-блокер (неявный):** `@membrana/background-cabinet` тест красный; мердж в затронутый пакет до диагноза — риск регрессии без корня.
- **Риск контракта:** если `angelina-hostess-contract.md` не зафиксирован до кода — Структурщик реализует форму без критериев приёмки; обнаружится только при попытке записать `isValid=true`.
- **Риск перечеканки:** `assertions[]` в `main-day-assertions.json` пуст (0 посылок); канон предписывает перечеканку при смене магистрали — не сделана. Это не блокер дня, но drift реестра накапливается; рекомендуется перечеканить assertions по итогам дня.

---

## Ссылки

- [DAILY_STANDUP.md](../DAILY_STANDUP.md) — стендап 2026-10-01, § «Фокус дня»
- [DAY_PLAN.md](../DAY_PLAN.md) — план дня, § «Магистраль» и § «Что не делаем»
- [morning-gates-state.json](../tasks/morning-gates-state.json) — гейт утра, `magistral=angelina-hostess-impl`, `day=2026-10-01`
- [main-day-assertions.json](../tasks/main-day-assertions.json) — sources[0].claim, origin `owner-choice@chat/magistral-01-10`
- [DAILY_CODE_REVIEW.md](../DAILY_CODE_REVIEW.md) — вечернее ревью 30.09, P1-риски по #2529 и `background-cabinet`
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](../prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0 §6 (почему benchmark DSP сегодня не магистраль)
- [VIRTUAL_TEAM_PROMPT.md](../virtual-team/VIRTUAL_TEAM_PROMPT.md) — роли и зоны ответственности
