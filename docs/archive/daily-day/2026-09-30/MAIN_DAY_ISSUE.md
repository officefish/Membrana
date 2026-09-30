<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-30
  archived-at: 2026-09-30T16:06:46.857Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-30T11:45:51.660Z (yarn main-day-issue@a7600ccf) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"a7600ccfbddc25a3a8081bd9289cb2a665d8e372","digest":"32f03030ff82bf137aa1158f2f677c5baf8911270c4a9f0270ced29ffce968d5","versionAt":"2026-09-30T14:36:21+03:00"},"DAILY_STANDUP":{"version":"a7600ccfbddc25a3a8081bd9289cb2a665d8e372","digest":"d4ae4f88c5c5406cb8bb3a920ffb54abc36c5c66d8cd7501b3325c1434a5744f","versionAt":"2026-09-30T14:36:21+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, trace-freeze-dual-candidate-sprint, ritual-reads-done-work-b4, ritual-reads-done-work-b3, ritual-reads-done-work-b2, ritual-reads-done-work-b1, ritual-reads-done-work, batch-collection-run-contour-a1-architecture-gate, batch-collection-run-contour-a2-run-contract, batch-collection-run-contour-a3-detector-runner, batch-collection-run-contour-a4-cabinet-entry, sample-library-paging-a11y, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-30

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `three-roads-experiment` |
| `primaryTitle` | Четвёртая попытка опыта трёх дорог на приборе 9e86ec85 с установщиком 4f0d32d4 |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — (фокус вне реестра task-промптов; living procedure: docs/procedures/duty/2026-09-27.md) |
| `сгенерировано` | 2026-09-30 |

---

## Магистраль

**Опыт трёх дорог — четвёртая попытка.** Сборка на вершине `4f0d32d4` (прогон 36612384318) впервые несёт все четыре починки одновременно: массовый перенос (#2488/#2489/#2499), пагинацию (#2505), доступность листания (#2513) и устранение фризов при выходе (#2508, правка `event.returnValue`). Установщик физически перенесён на съёмный D: как `Membrana-Studio-Setup-0.1.0-4f0d32d4-FULL-30-09.exe` с верифицированным sha256 — физический блокер снят. Прибор 9e86ec85 держит 486.7/512.0 МБ четвёртые сутки без изменений: удержание стабильно, окружение предсказуемо.

**Критерий успеха к вечеру:** файл `docs/procedures/duty/2026-09-27.md` заполнен фактами по всем четырём точкам проверки — (В1) фризы при остановке записи и выходе из доски, (В2) пагинация на 1057 пробах, (В3) первая дорога (массовый перенос с предпросмотром), (В4) доступность листания. Каждому факту выставлен вердикт `holds` / `violated` / новый риск. Предсказания в протоколе не переписывались — только факты рядом с ними.

---

## Подкрепление

- **Закрыть `PERSONAS → scripts/lib/personas.mjs` (#2503, Ozhegov, XS)** — четвёртый день без движения; три скрипта дублируют константу и создают риск расхождения в роутинге именно при холодном запуске перед выездом. Закрытие снимает риск P2 из вчерашнего ревью и гарантирует, что `yarn ask vesnin --no-context "тест"` не упадёт после правки.
- **Закрыть trail-прогон `ritual-day-2026-09-29-r2` (Dynin)** — `runPhase: open` означает, что вечернее ревью сегодняшнего дня объявит вчерашний день незавершённым. Команда: `yarn turbo run typecheck test lint --filter=@membrana/tooling`. Без этого P1-хвост тянется в третий день.

---

## Перспективные

- **Полный разбор #2488–#2499** — по результатам выезда станет ясно, какие из переносов прошли чисто на железе; разбор планируется на завтра, не сегодня.
- **Fusion-контур trends + yamnet как следующий шаг детекции** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6), следующий содержательный шаг только через fusion; открывать задачу в реестре — после сегодняшнего опыта.
- **`batch-collection-run-contour`** — вчерашний задел (#2517–#2519) не горит, контур ждёт завершения магистрали; разблокируется при выполненном протоколе дежурства.

---

## Экспериментальные

- **Fusion-форма на бумаге (Kuryokhin)** — набросать структуру DSP + yamnet без кода: зафиксировать принципиальный разрыв интерфейсов до открытия задачи в реестре. Не обязательство — вопрос, на который хотим знать ответ.
- **Зуб-охранитель на протухание `//date` в ассерциях (Vesnin, P2)** — запустить минимальный скрипт-проверку свежести поля при генерации ассерций; второй случай за неделю, третий станет паттерном. До кода — только если магистраль выполнена.
- **A11y пагинации (#2476, Rodchenko)** — по результатам живого замера зафиксировать три чекбокса (`aria-current` на активной странице, focus trap, Tab/Enter); без трёх зелёных issue не закрывается по DESIGN.md.

---

## Санитарные

- **P1 (Vesnin):** убедиться, что файл `docs/procedures/duty/2026-09-27.md` существует и содержит незаполненные предсказания — до выезда; вчерашнее ревью пометило его как `holds` без подтверждения в диффе.
- **P1 (из ревью Vesnin/Tarasov):** перечеканить строку в `DAY_PLAN.md` раздел «Санитарные» — убрать `pagination-sample-library`, выровнять под `three-roads-experiment`; строка противоречит объявленной магистрали и вводит холодную сессию в заблуждение.
- **P2 (Dynin):** закрыть trail-прогон `ritual-day-2026-09-29-r2` (`runPhase: open`) — `yarn turbo run typecheck test lint --filter=@membrana/tooling`.
- **P2 (Ozhegov):** закрыть `PERSONAS → scripts/lib/personas.mjs` (#2503/#2502) — XS, четвёртый день без движения.
- **P2 (Rodchenko):** a11y пагинации (#2505) не верифицирована; блокирует честное закрытие #2476 по DESIGN.md.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `three-roads-experiment` | `docs/tasks/main-day-assertions.json`, `sources[0].claim`, `author=human` | Слово владельца в чате (owner-choice@chat/magistral-30-09) | 2026-09-30 |
| Гейт утра (`morning-gates-state.json`) несёт `magistral: "three-roads-experiment"`, `day: "2026-09-30"`, `magistralAuthor: "human"` | `docs/tasks/morning-gates-state.json` | Тот же владелец; гейт перечеканен сегодня — ПОЗЖЕ assertions | 2026-09-30 |
| **Расхождения нет:** оба источника называют `three-roads-experiment`; `morning-gates-state.json` несёт выбор более поздний, чем assertions — спор решён свежестью. **Замечание о перечеканке:** `main-day-assertions.json` и `morning-gates-state.json` согласны, однако `DAY_PLAN.md` (коммит `caf73ab5`) в разделе «Санитарные» по-прежнему упоминал `pagination-sample-library` — перечеканка assertions под три-roads зафиксирована в assertions, но DAY_PLAN не синхронизирован. Это P1 из вчерашнего ревью Vesnin; строка «магистраль взята с гейта, assertions не перечеканены» — **неприменима** (оба согласны), но несинхронизированный DAY_PLAN есть отдельная находка. | 1 источник (владелец), 2 отражения | owner-choice@chat/magistral-30-09 | 2026-09-30 |
| Установщик `4f0d32d4` физически перенесён на D:, sha256 сверен — физический блокер снят | Стендап (`DAILY_STANDUP.md`) → снимок замера ведущей 30.09 11:41Z | Замер ведущей (Angelina, 30.09) | 2026-09-30 |
| Прибор 9e86ec85 держит 486.7/512.0 МБ четвёртые сутки — удержание стабильно | Стендап (`DAILY_STANDUP.md`) → снимок прибора | Снимок прибора до опыта (30.09 11:41Z) | 2026-09-30 |
| Протокол `docs/procedures/duty/2026-09-27.md` — носитель предсказаний; предсказания не переписывать | Стендап (`DAILY_STANDUP.md`) / вчерашнее ревью (P1 Vesnin) | Ревью Vesnin (`DAILY_CODE_REVIEW.md` 29.09) | 2026-09-29 |
| `DAY_PLAN.md` называл трёх кандидатов магистрали (`angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`), выбор — слово владельца; план не синтезировал магистраль | `docs/DAY_PLAN.md` | Генератор плана (детерминированный, без LLM) | 2026-09-30 |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Установщик `4f0d32d4` присутствует на съёмном D: с верифицированным sha256 | `file:D:\Membrana-Studio-Setup-0.1.0-4f0d32d4-FULL-30-09.exe` (sha256 сверен по снимку ведущей) | holds |
| Файл протокола предсказаний существует до выезда | `file:docs/procedures/duty/2026-09-27.md` | holds (P1-риск: подтверждение в диффе отсутствует — проверить до выезда) |
| Прибор 9e86ec85 физически доступен | физическое присутствие (не машинный маркер) | unknown — главный риск дня; при недоступности магистраль не выполняется, P1 для Vesnin по архитектуре сборки |
| Trail-прогон `ritual-day-2026-09-29-r2` не закрыт | `file:docs/procedure-runs/trail/ritual-day-2026-09-29-r2-trail.jsonl` (`runPhase: open`) | holds (подтверждено ревью Tarasov) |
| `PERSONAS` дублируется в трёх скриптах | `symbol:PERSONAS` в `scripts/ask-persona.mjs`, `scripts/consilium.mjs`, `scripts/review-lead.mjs` | holds (Ozhegov, ревью 29.09) |

---

## Сегодня делаем

1. **До выезда:** убедиться, что `docs/procedures/duty/2026-09-27.md` существует и содержит незаполненные предсказания (не перезаписаны).
2. **До выезда:** перечеканить строку в `DAY_PLAN.md` раздел «Санитарные» — убрать `pagination-sample-library`, выровнять под `three-roads-experiment` (P1).
3. **Dynin:** закрыть trail-прогон `ritual-day-2026-09-29-r2` — `yarn turbo run typecheck test lint --filter=@membrana/tooling` (`runPhase: open` → `close`).
4. **Ozhegov:** перенести `PERSONAS` в `scripts/lib/personas.mjs`, убедиться, что `yarn ask vesnin --no-context "тест"` не падает (#2503).
5. **Выезд:** установить `4f0d32d4` на прибор 9e86ec85, последовательно пройти четыре точки проверки (В1 фризы / В2 пагинация / В3 массовый перенос / В4 листание).
6. **По возвращении:** заполнить `docs/procedures/duty/2026-09-27.md` фактами, выставить вердикт `holds`/`violated`/новый риск каждому предсказанию.
7. **Kuryokhin (если время):** fusion-форма на бумаге — структура DSP + yamnet, принципиальный разрыв интерфейсов.

---

## Definition of Done (фокус)

- [ ] `docs/procedures/duty/2026-09-27.md` существует до выезда, предсказания не изменены
- [ ] Установщик `4f0d32d4` успешно установлен на прибор 9e86ec85 (нет ошибки инсталлятора)
- [ ] В1 зафиксирован: факт по фризам при остановке записи и выходе из доски + вердикт `holds`/`violated`
- [ ] В2 зафиксирован: факт по пагинации на 1057 пробах + вердикт
- [ ] В3 зафиксирован: факт по массовому переносу с предпросмотром (первая дорога) + вердикт
- [ ] В4 зафиксирован: факт по доступности листания + вердикт
- [ ] Протокол `docs/procedures/duty/2026-09-27.md` сохранён в репо коммитом с датой 2026-09-30

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl` и `assets-container`** — оба L; две L в один день расщепляют фокус; переносятся на завтра как первые в очереди архитектурного долга Vesnin.
- **DSP-бенчмарки на free-v1 (harmonic/cepstral/flux)** — потолок эшелона 0 зафиксирован, одиночные детекторы планку не берут; следующий шаг только через fusion и только задачей реестра.
- **Разворачивать полный разбор #2488–#2499** — только статус абзацем в санитарных по результатам выезда; полный разбор завтра.
- **`batch-collection-run-contour`** — задел #2517–#2519 не горит, контур ждёт выполненного протокола.
- **Повторный DSP-бенчмарк yamnet** — эшелон 2 де-факто открыт (F1 0.803), повтор free-v1 не даёт нового знания.

---

## Вторично (если останется время)

- Rodchenko: зафиксировать статус a11y пагинации (#2476) — три чекбокса (`aria-current`, focus trap, Tab/Enter).
- Vesnin: запустить минимальный скрипт-проверку свежести `//date` при генерации ассерций (зуб-охранитель, P2).

---

## Зависимости и риски

- **Риск P1 — прибор 9e86ec85 физически недоступен:** при любом сценарии недоступности прибора магистраль не выполняется; это немедленный P1 для Vesnin по архитектуре сборки и процедуры дежурства.
- **Риск P1 — установщик не проходит на окружении прибора:** если инсталляция падает, четыре точки проверки недостижимы; фиксируем факт падения в протоколе с подробностью сообщения ошибки.
- **Риск P2 — trail-прогон не закрыт до вечернего ревью:** Dynin должен закрыть до выезда; иначе ревью объявит день незавершённым независимо от результата опыта.
- **Риск P2 — протокол предсказаний отсутствует или перезаписан:** Vesnin проверяет наличие файла и неизменность предсказаний до выезда; без этого вердикты `holds`/`violated` по возвращении не имеют опоры.

---

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-09-30, источник фокуса
- [docs/procedures/duty/2026-09-27.md](../docs/procedures/duty/2026-09-27.md) — протокол предсказаний опыта трёх дорог
- [DAILY_CODE_REVIEW.md](../docs/DAILY_CODE_REVIEW.md) — вчерашнее ревью (Vesnin P1, Tarasov P1/P2)
- [DAY_PLAN.md](../docs/DAY_PLAN.md) — план дня, три кандидата магистрали
- [docs/tasks/main-day-assertions.json](../docs/tasks/main-day-assertions.json) — владельческий источник магистрали
- [docs/tasks/morning-gates-state.json](../docs/tasks/morning-gates-state.json) — гейт утра, подтверждение выбора