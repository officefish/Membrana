<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-17
  archived-at: 2026-08-17T15:12:20.387Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-17T07:05:45.009Z (yarn main-day-issue@b9f813f5) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"b0295841203cbd0dd70b73486940c8fc0fcc184f","digest":"2cd5a93c45da6a1726ac6270ed8cbfa3c19bc1a7065fc41d33052dccf92ec24d"},"DAILY_STANDUP":{"version":"b0295841203cbd0dd70b73486940c8fc0fcc184f","digest":"8add26aee7c33ccab419a858ea66c935484c7656d6318e1dbe97739f1d1d4254"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-17

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `batch-collection-run-contour` |
| `primaryTitle` | Batch-collection-run-contour: консилиум-гейт по модели исполнения — открыть полевую неделю |
| `githubIssue` | #494 |
| `size` | L |
| `promptPath` | docs/prompts/BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md |
| `сгенерировано` | 2026-08-17 |

---

## Магистраль

**Batch-collection-run-contour (L, #494)** — магистраль дня взята с `sources[0]` в `main-day-assertions.json`: владелец выбрал её 16.08 из замороженного топ-3, при условии что «оборудование приехало и подключено, полевая неделя начинается 17.08».

Первый шаг эпика, предписанный его собственным промптом, — **консилиум-гейт по модели исполнения**: разрешить развилку live-каденс vs batch-итерация, определить границы новых core-контрактов (`SampleCollectionRef`, узел-источник, `for-each-sample`, устройство collection, batch-рантайм) до входа в код. Без этого гейта любой написанный код строится на незафиксированной модели и будет переписан.

**Критерий успеха к вечеру:** проведён консилиум по модели исполнения, зафиксирован артефакт решения (≥ 1 стр., имена контрактов, выбранная модель); Issue #494 несёт комментарий со ссылкой на артефакт; команда готова открыть первую карточку реализации.

---

## Подкрепление

- **Провести развёрнутое ревью PR #1951 (MFCC-измеритель, 632 строки) и PR #1953 (field:capture, 415 строк) до любых работ поверх них.** Оба диффа влиты без ревью и питают калибровочный корпус; недостоверный корпус делает любой будущий замер F1 по batch-контуру бессмысленным. Ревью — предусловие для честного первого прогона.
- **Подключить резак `redactSecrets` к `night-triage-secret-scan.mjs` и создать `rotation-manifest-2026-08-17.md`.** Гейт `secret-parser-built` открыт четвёртый день без технических причин; его закрытие снимает амнестию на правку архива и разблокирует продуктовую полосу (`angelina-hostess-impl`, `assets-container`). Резак существует (`scripts/lib/secret-redact.mjs`, 18/18 тестов), точка сопряжения со сканером требует прогона на грязной фикстуре до правки.

---

## Перспективные

- Закрытие гейта `secret-parser-built` (подключение `redactSecrets` + манифест ротации) разблокирует продуктовую полосу: `angelina-hostess-impl` и `assets-container` перестают быть заблокированными параллельным L-блоком.
- После консилиума-гейта по batch-модели — открыть первую карточку реализации `batch-collection-run-contour` и пройти шаг 2 промпта (SampleCollectionRef, узел-источник).
- Починка красного `@membrana/rag-service#test` (третий день) открывает достоверный статус CI и позволяет опираться на него при планировании продуктовых работ недели.

---

## Экспериментальные

- **Проба:** запустить `night-triage-secret-scan.mjs` поверх одного тестового файла с заглушённым паттерном ДО правки — узнать, достаточно ли текущего API `redactSecrets` для сквозного прогона без переписывания сканера (изолированный экспортируемый вызов по аналогии с `clearNightReportDownloadTargets`).
- **Проба:** создать `rotation-manifest-2026-08-17.md` вручную по минимальному шаблону и прогнать сканер поверх него — проверить, не засвечивает ли детектор собственный манифест.
- **Проба:** запустить `yarn workspace @membrana/rag-service test` изолированно до любых правок — выяснить, воспроизводится ли красный тест детерминированно или был артефактом окружения 16.08.

---

## Санитарные

- `@membrana/rag-service#test` красный третий день — починить до новых прогонов поверх него.
- Ревью-долги PR #1951 (MFCC-измеритель, 632 строки) и PR #1953 (field:capture, 415 строк) не проведены — блокируют достоверность калибровочного корпуса.
- `rotation-manifest-2026-08-17.md` не создан, резак к `night-triage-secret-scan.mjs` не подключён — гейт `secret-parser-built` не закрыт четвёртый день.
- Карточка на orphaned-паттерн `ritual:day` не заведена — три дня подряд, кандидат в preflight-зуб.
- Формула объёма в промптах сессий содержит ошибку: 303 МБ/ч, не 317 (16 бит = 2 байта, не 2.5).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `batch-collection-run-contour` (L, #494); выбор из замороженного топ-3 | `sources[0]` в `main-day-assertions.json` | owner-choice@chat/magistral-16-08 (слово владельца) | 2026-08-16 |
| Гейт старта карточки удовлетворён: оборудование приехало и подключено, полевая неделя начинается 17.08 | `sources[0].claim` | owner-choice@chat/magistral-16-08 | 2026-08-16 |
| Первый шаг эпика — консилиум-гейт по модели исполнения, не код (предмет невыразим маркерами, обоснование в `//link-16-08`) | `main-day-assertions.json` `//link-16-08` | `docs/tasks/main-day-assertions.json` (агент 16.08) | 2026-08-16 |
| Стендап подтверждает: `batch-collection-run-contour` — в «сознательно не делаем» НЕ до гейта, а до закрытия PR-ревью и гейта secret | `docs/DAILY_STANDUP.md` | стендап-генератор b9f813f5 | 2026-08-17 |
| DAY_PLAN называет `batch-collection-run-contour` в магистральных кандидатах с пометкой «берётся после закрытия гейта и ревью» | `docs/DAY_PLAN.md` | plan-генератор #1363 | 2026-08-17 |
| Стендап и DAY_PLAN — **1 источник, 2 отражения** плана; вес равен одному, не двум | группировка по origin | генераторная цепочка того же утра | 2026-08-17 |
| **Расхождение (норма У1, 31.07):** `morning-gates-state.json` в контексте отсутствует → гейт не несёт более позднего волеизъявления; `sources[0]` от 16.08 остаётся актуальным. Расхождение не замолчано — названо явно. | проверка входов | отсутствие `morning-gates-state.json` в контексте | — |

---

## Посылки

Посылки `assertions[]` в `main-day-assertions.json` **сознательно пусты** (`//link-16-08`): предмет эпика — неразведённая модель исполнения, а не отсутствующий символ. Утверждение «модель не определена» невыразимо маркерами `kind:file/test/symbol`. Выдумывать проверяемый суррогат ради непустого списка запрещено нормой реестра.

Гвард старта зафиксирован в промпте эпика шагом 1: **консилиум-гейт по модели исполнения**. Этот гвард — не посылка MAIN_DAY_ISSUE, а условие перехода к коду внутри эпика.

**Развилки нет, посылок не требуется.**

---

## Сегодня делаем

1. Провести консилиум по модели исполнения `batch-collection-run-contour`: выбрать live-каденс vs batch-итерация, зафиксировать имена контрактов (`SampleCollectionRef`, узел-источник, `for-each-sample`).
2. Зафиксировать артефакт решения консилиума (≥ 1 стр.) и оставить комментарий в Issue #494 со ссылкой на него.
3. Прогнать `night-triage-secret-scan.mjs` на грязной фикстуре — убедиться в точке сопряжения с `redactSecrets` до правки сканера.
4. Подключить `redactSecrets` к `night-triage-secret-scan.mjs`; сканер завершается с кодом 0 на фикстуре с засвеченным паттерном.
5. Создать `docs/security/rotation-manifest-2026-08-17.md` с датированным проходом и списком засвеченных ключей.
6. Пометить гейт `secret-parser-built` как `passed` в `morning-gates-state.json`.
7. Провести развёрнутое ревью PR #1951 и PR #1953; оставить письменный вердикт по каждому.

---

## Definition of Done (фокус)

- [ ] Консилиум по модели исполнения проведён; артефакт решения записан в `docs/` или `docs/seanses/`.
- [ ] Issue #494 несёт комментарий со ссылкой на артефакт консилиума.
- [ ] `night-triage-secret-scan.mjs` вызывает `redactSecrets` и завершается с кодом 0 на фикстуре с засвеченным паттерном.
- [ ] `docs/security/rotation-manifest-2026-08-17.md` создан: дата, список засвеченных паттернов, статус ротации.
- [ ] Гейт `secret-parser-built` помечен `passed` в `morning-gates-state.json`.
- [ ] PR #1951 и PR #1953 получили письменный ревью-вердикт.
- [ ] Открыта первая карточка реализации `batch-collection-run-contour` (шаг 2 промпта) — либо зафиксировано письменное обоснование переноса.

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — продуктовая полоса открывается после прохождения гейта `secret-parser-built`; брать её до закрытия гейта — воспроизводить паттерн параллельного L-блока.
- **`assets-container`** — та же причина; разблокируется вместе с `angelina-hostess-impl` после гейта.
- **DSP-бенчмарки (harmonic/cepstral/spectral-flux) на free-v1** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); повтор без смены датасета или fusion информации не добавляет.
- **`mfcc-compare-sprint`** — берётся после закрытия гейта и достоверного ревью #1951/#1953.
- **Preflight-зуб на orphaned-паттерн `ritual:day`** — три дня кандидат в карточку, но не в магистраль; не вытесняет гейт.

---

## Вторично (если останется время)

- Завести карточку на orphaned-паттерн `ritual:day` (preflight-зуб) — три дня подряд, пора.
- Изолированный прогон `yarn workspace @membrana/rag-service test` — проверить воспроизводимость красного теста до назначения исполнителя.

---

## Зависимости и риски

- **Блокер консилиума:** если model-execution-гейт не пройти сегодня, реализация `batch-collection-run-contour` снова сдвигается; полевая неделя 17.08 начнётся без зафиксированной модели — риск переписывания кода.
- **Блокер сканера:** сканер и резак имеют неизвестную точку сопряжения; без прогона на грязной фикстуре подключение упадёт в рантайме, а не в CI — прогон на фикстуре обязателен до правки.
- **Ревью #1951/#1953:** оба диффа oversized и влиты без ревью; скрытая ошибка в них делает любой последующий приёмочный замер F1 недостоверным — ревью должно предшествовать первому batch-прогону.
- **`morning-gates-state.json` отсутствует во входах:** расхождение У1 не может быть разрешено по свежести гейта; `sources[0]` от 16.08 принят как актуальный; при появлении гейта со свежей датой — перечеканить по норме У1.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-08-17
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня, слоты магистрали
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0], owner-choice 16.08
- [BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md](docs/prompts/BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md) — task-промпт эпика
- [GitHub Issue #494](https://github.com/membrana/membrana/issues/494) — карточка эпика
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6