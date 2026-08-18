<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-18
  archived-at: 2026-08-18T16:35:56.049Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-18T05:53:13.308Z (yarn main-day-issue@92212bc7) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"5a54aa472321d4ef0a1c1cf68fad21b948004530","digest":"02f4c4f036c21c601077187e290ecfaa9731943c43532eb871389c6cd2603da5"},"DAILY_STANDUP":{"version":"5a54aa472321d4ef0a1c1cf68fad21b948004530","digest":"71239ce5c8e81b1d779db59b2122812caf2d2473fda0034c1b0f78aa44be7c01"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-18

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `server-plugin-foundation` |
| `primaryTitle` | Плагинная основа сервера — первая карточка реализации под Issue #1961 |
| `githubIssue` | #1961 |
| `size` | L |
| `promptPath` | docs/prompts/SERVER_PLUGIN_FOUNDATION_PROMPT.md |
| `сгенерировано` | 2026-08-18 |

---

## Магистраль

**server-plugin-foundation** (#1961) — плагинная основа сервера: пакет контрактов `packages/plugin-contracts` и первый живой плагин `membrana.handler.mfcc`.

Магистраль взята из `sources[0].claim` (`docs/tasks/main-day-assertions.json`, owner-choice@chat/magistral-17-08, дата 2026-08-17): владелец выбрал `server-plugin-foundation` из замороженного топ-3 словом 17.08. Синтез не производился.

Вердикт консилиума по Issue #1961 ратифицирован 17.08, форма решения зафиксирована Архитектором. Сегодня — первый день, когда реализация не заблокирована ни гейтом `secret-parser-built` (резак `redactSecrets` существует, 18/18 тестов), ни отсутствием вердикта. Гейт `secret-parser-built` остаётся открытым по критерию (в) — предикат `amnestyLifted` отложен словом владельца; это не блокирует `server-plugin-foundation`.

Замысел словом владельца: клиент несёт модульно-плагинную архитектуру — серверу нужна такая же основа, чтобы писать плагины серверного журнала. Полевой сбор отложен (Firebat ждёт монитор + клавиатуру), день отдан фундаменту, на котором встанет разбор будущих записей.

**Критерий успеха к вечеру:** файл `packages/plugin-contracts/package.json` существует в репозитории И символ `PluginExecutor` достижим grep'ом по `packages/**/src/**` — оба маркера из `main-day-assertions.json` дают `violated` (работа сделана), либо один из них остаётся `holds` с письменным диагнозом блокера в карточке.

---

## Подкрепление

- **Ревью PR #1951 (MFCC-измеритель, 632 строки) и PR #1953 (field:capture, 415 строк)** — без этого ревью калибровочный корпус недостоверен, а первый живой плагин `membrana.handler.mfcc` лишён проверенного baseline. Ревью прогнать до первого коммита по `server-plugin-foundation`, не после.
- **Изолированный прогон `yarn workspace @membrana/rag-service test`** — красный третий день; диагностика до назначения исполнителя. Не править поверх красного — только зафиксировать воспроизводимость и передать диагноз.

---

## Перспективные

- После появления `packages/plugin-contracts` открывается вход в `angelina-hostess-impl` и `assets-container` — обе карточки ждут плагинного контракта как фундамента.
- Развёрнутое ревью коммита `66fc8c6a` (862 строки) откроет чистую сдачу следующего PR по `server-plugin-foundation` без хвостов ревью-долга.
- Диагностика `@membrana/rag-service#test` при подтверждении воспроизводимости создаёт задание для исполнителя и разблокирует RAG-контур, стоящий третий день.

---

## Экспериментальные

- **Эксперимент 1.** Создать `packages/plugin-contracts` как пустой пакет с `package.json` и единственным экспортом-заглушкой `PluginExecutor` — узнать, достаточно ли каркаса, чтобы `main-day-probe` перевернул оба маркера в `violated`, и тем самым подтвердить, что посылки `assertions.json` корректно адресованы.
- **Эксперимент 2.** Запустить `yarn workspace @membrana/rag-service test` трижды подряд в чистом окружении tooling-дерева — узнать, флакает ли тест или падает детерминированно; результат определяет приоритет исполнителя.
- **Эксперимент 3.** Прогнать `yarn main-day-probe` до и после создания каркаса `plugin-contracts` — зафиксировать снимок «до» как baseline, сравнить со снимком «после»; расхождение = находка о точности маркеров.

---

## Санитарные

- Ревью-долг: `yarn code-review:pr 1960` (520 строк) и коммит `66fc8c6a` (862 строки) — до любых коммитов поверх `server-plugin-foundation`, иначе ревью будет проводиться поверх незамеченных проблем.
- Ревью PR #1951 (MFCC-измеритель) и PR #1953 (field:capture) — питают калибровочный корпус; без них `membrana.handler.mfcc` лишён достоверного baseline.
- Диагностика `@membrana/rag-service#test` — красный третий день; `yarn workspace @membrana/rag-service test` изолированно, до назначения исполнителя.
- Завести карточку в реестр на orphaned-паттерн `ritual:day` (`r1/r2/r3` в `2026-08-17.jsonl`) — три дня подряд, кандидат в preflight-зуб.
- Расхождение MAIN_DAY_ISSUE: перечеканить `main-day-assertions.json` под актуальную магистраль `server-plugin-foundation` (#1961) — посылки уже несут правильные маркеры (`packages/plugin-contracts/package.json`, symbol:`PluginExecutor`), но дата чеканки и `//date` в комментарии не обновлены до 18.08; обновить до запуска `yarn main-day-probe`.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец назвал `server-plugin-foundation` магистралью из замороженного топ-3 | `docs/tasks/main-day-assertions.json`, sources[0] | owner-choice@chat/magistral-17-08 (слово владельца) | 2026-08-17 |
| Вердикт консилиума Issue #1961 ратифицирован, форма решения зафиксирована Архитектором | issue | GitHub Issue #1961 | 2026-08-17 |
| Реализация сегодня не заблокирована гейтом: резак `redactSecrets` существует (18/18 тестов) | код | `scripts/lib/secret-redact.mjs`, `//retired-redact-wrong-address-03-08` в assertions | 2026-08-03 |
| Полевой сбор отложен (Firebat ждёт монитор+клавиатуру) — день отдан фундаменту | сессия | owner-choice@chat/magistral-17-08 | 2026-08-17 |
| Стендап 18.08 называет `server-plugin-foundation` первым разблокированным фронтом после гейта | план | `docs/DAILY_STANDUP.md` (отражение sources[0]) | 2026-08-18 |
| DAY_PLAN 18.08 подтверждает ту же карточку | план | `docs/DAY_PLAN.md` (отражение sources[0]) | 2026-08-18 |

> Стендап и DAY_PLAN — **1 источник, 2 отражения** sources[0]; их суммарный вес равен весу одного. Независимые источники: owner-choice (17.08), Issue #1961 (17.08), код резака (03.08). Все три независимы и согласны.

> **Расхождение гейта и assertions:** `docs/tasks/morning-gates-state.json` не предоставлен во входах — проверить наличие поля `magistral.day = 2026-08-18` невозможно. Если файл несёт сегодняшнюю дату и иную магистраль — норма У1 предписывает взять выбор гейта как более свежий и зафиксировать расхождение строкой: **«магистраль взята с гейта, assertions не перечеканены»**. В отсутствие файла во входах магистраль берётся из sources[0] — это канон при пустом или недоступном гейте.

---

## Посылки (фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Пакет контрактов серверной плагинности не существует (дом словаря — `packages/plugin-contracts`) | `file:packages/plugin-contracts/package.json` | holds |
| Первый живой плагин `membrana.handler.mfcc` не реализован (вердикт M6-прим: PR-3) | `symbol:PluginExecutor` | holds |

Оба маркера взяты дословно из `docs/tasks/main-day-assertions.json` (assertions[0] и assertions[1], issue 1961). Если при запуске `yarn main-day-probe` один из них даёт `violated` — работа по нему существует; зафиксировать как НАХОДКУ (реестр протух) и скорректировать DoD.

---

## Сегодня делаем

1. Прогнать `yarn main-day-probe` — зафиксировать baseline вердиктов обоих маркеров до первого коммита.
2. Создать пакет `packages/plugin-contracts` с `package.json`, экспортом `PluginExecutor` и минимальным типом контракта плагина — достаточно для прохождения маркера `file:packages/plugin-contracts/package.json`.
3. Реализовать `PluginExecutor` (интерфейс / класс) в `packages/plugin-contracts/src/` — достаточно для прохождения маркера `symbol:PluginExecutor` при grep по `packages/**/src/**`.
4. Прогнать `yarn main-day-probe` повторно — убедиться, что оба маркера дают `violated`.
5. Прогнать `yarn code-review:pr 1960` и ревью коммита `66fc8c6a` — закрыть ревью-долг до следующего коммита.
6. Прогнать `yarn workspace @membrana/rag-service test` изолированно — зафиксировать воспроизводимость или флакание.
7. Обновить дату и `//date` в `docs/tasks/main-day-assertions.json` до 18.08 — закрыть санитарное расхождение.

---

## Definition of Done (фокус)

- [ ] `packages/plugin-contracts/package.json` существует в рабочем дереве
- [ ] Символ `PluginExecutor` достижим `git grep` по `packages/**/src/**`
- [ ] `yarn main-day-probe` печатает `violated` по обоим маркерам assertions[0] и assertions[1]
- [ ] Ревью PR #1960 / коммит `66fc8c6a` проведено и зафиксировано в `DAILY_CODE_REVIEW.md`
- [ ] Ревью PR #1951 и PR #1953 завершено (вердикт LGTM или список блокеров)
- [ ] Диагноз `@membrana/rag-service#test` зафиксирован (воспроизводится / флакает / среда)
- [ ] `docs/tasks/main-day-assertions.json` несёт актуальную дату чеканки 2026-08-18

---

## Сознательно не делаем сегодня

- **Гейт `secret-parser-built` критерий (в) / предикат `amnestyLifted`** — отложен словом владельца; трогать до слова владельца запрещено.
- **`batch-collection-run-contour` (#494)** — консилиум-гейт по модели исполнения не проведён; карточка не получила артефакта решения; входить в код без зафиксированной модели — повторить паттерн.
- **`mfcc-compare-sprint`** — берётся после достоверного ревью PR #1951 и #1953; оба влиты без ревью, калибровочный корпус недостоверен.
- **Повторный benchmark harmonic / cepstral / spectral-flux на free-v1** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); без смены датасета, алгоритма или fusion прогон не добавляет информации.
- **`angelina-hostess-impl`** — ждёт `plugin-contracts` как фундамента; открывается после прохождения сегодняшней магистрали.

---

## Вторично (если останется время)

1. Завести карточку в реестр на orphaned-паттерн `ritual:day` (`r1/r2/r3` в `2026-08-17.jsonl`) — три дня подряд, кандидат в preflight-зуб.
2. Набросать структуру первого плагина `membrana.handler.mfcc` в виде TODO-комментариев поверх `PluginExecutor` — чтобы следующая карточка (PR-3 по вердикту M6-прим) имела точку входа.

---

## Зависимости и риски

- **Блокер 1:** если `yarn main-day-probe` уже даёт `violated` по одному из маркеров — работа по нему существует под другим именем; НАХОДКУ зафиксировать письменно, не тихо обойти.
- **Блокер 2:** ревью PR #1951 и #1953 может выявить блокеры для `membrana.handler.mfcc`; в этом случае DoD по пункту «первый живой плагин» переносится на следующий день с письменным диагнозом.
- **Риск:** `@membrana/rag-service#test` красный третий день — если флакает, исполнитель не назначен и тест не чинится, риск накопления красноты в CI растёт; диагностика сегодня снижает риск.
- **Риск:** `morning-gates-state.json` не предоставлен во входах — если файл несёт сегодняшнюю дату с иной магистралью, расхождение не поймано автоматически; прогнать `yarn main-day-probe` вручную до первого коммита.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-08-18
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня 2026-08-18
- [GitHub Issue #1961](https://github.com/membrana/membrana/issues/1961) — server-plugin-foundation
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — посылки и sources[0]
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6