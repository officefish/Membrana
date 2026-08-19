<!-- Сгенерировано: 2026-08-19T05:51:23.060Z (yarn main-day-issue@5c04d4bf) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"5321dc05ecb84edeb736be7804d69cc6c02c062a","digest":"61855bed6dfa970286565780fd1f829a126eb56357dddfffbfcc7349e7669db1"},"DAILY_STANDUP":{"version":"5321dc05ecb84edeb736be7804d69cc6c02c062a","digest":"09ddea8d5a5be4c875e1f8c32626f685c714d1349c831c78b2a8048f1ba03ffa"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-19

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `server-plugin-foundation` |
| `primaryTitle` | Плагинная основа сервера: фундамент серверных модулей анализа и визуализации коллекций |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-08-19 |

## Магистраль

**server-plugin-foundation (L)** — плагинная основа сервера под серверные модули анализа и визуализации коллекций звуков.

Клиент несёт модульно-плагинную архитектуру; серверу нужна такая же основа, чтобы писать плагины серверного журнала. Сегодня полевой сбор отложен (Firebat ждёт монитор+клавиатуру, срок неизвестен) — день отдан фундаменту, на котором встанет разбор будущих записей. Форма решения не предрешена владельцем: первый шаг — шторм и собрание (порядок назван тем же словом владельца 17.08). Это означает: прежде чем писать код, проводим архитектурный шторм с Vesnin (контракты плагинов, границы пакета, способ регистрации модулей) и фиксируем ADR или design-doc как артефакт дня.

**Критерий успеха к вечеру:** существует зафиксированный дизайн-документ (ADR или `docs/design/server-plugin-foundation-*.md`) с контрактом плагина сервера, списком затрагиваемых пакетов и вердиктом Vesnin (LGTM формы решения) — либо письменный диагноз блокера с именованным следующим шагом.

## Подкрепление

- **Починить `@membrana/background-media#test`** — одно-двухстрочное исправление (`await Promise.resolve()` в `plugin-host.service.test.ts`): без зелёного CI ни один merge в сторону ступеней 2–3 (`angelina-hostess-impl`, `assets-container`) не может быть сделан без нарушения санитарного барьера. Это P0-блокер для любого следующего merge по магистрали «узел как устройство», не только для server-plugin-foundation.
- **Закрыть ревью-долг PR #1951 (MFCC-измеритель) и PR #1953 (field:capture)** — без принятого ревью калибровочный корпус считается недостоверным; `mfcc-compare-sprint` остаётся заблокированным даже при зелёном CI. Вердикт (LGTM или список блокеров с владельцем) — необходимый артефакт дня.

## Перспективные

- Зафиксированный сегодня дизайн-документ `server-plugin-foundation` открывает реализацию серверных плагинов анализа коллекций — в том числе точку подключения для будущего `batch-collection-run-contour` на серверной стороне.
- Зелёный `@membrana/background-media#test` разблокирует любой следующий merge и открывает вход в `mfcc-compare-sprint` уже сегодня.
- Принятое ревью PR #1951 и #1953 делает `mfcc-compare-sprint` достоверным стартом — без него калибровочный корпус остаётся под вопросом; разблокирует всю детекционную полосу следующих дней.

## Экспериментальные

- **Проба-0:** запустить `@membrana/rag-service#test` изолированно (`yarn workspace @membrana/rag-service test --no-coverage`) без единой правки — узнать, воспроизводится ли красный детерминированно или зависит от порядка тестов в CI. Дёшево, ноль изменений кода.
- **Проба-1:** при шторме server-plugin-foundation — проверить, можно ли переиспользовать уже существующий `PluginContractsModule` клиентской стороны как reference-контракт для серверного реестра плагинов, или нужен отдельный пакет `@membrana/server-plugin-contracts`.
- **Проба-2:** добавить к `field-capture.mjs` флаг `--dry-run`, печатающий `envCandidates()` без записи — узнать, не утекает ли путь к `.env` в stdout при обычном прогоне (одна строка лога, нулевой риск).

## Санитарные

- `@membrana/background-media#test` красный: ожидание микротаска в `plugin-host.service.test.ts` — диагностировать, исправить `await Promise.resolve()`, не трогать другие ветки до зелёного CI.
- Ревью-долг PR #1951 (MFCC-измеритель) и PR #1953 (field:capture) — закрыть до входа в `mfcc-compare-sprint`.
- `@membrana/rag-service#test` красный третий день — изолированный прогон без правок, поставить диагноз.
- Динамический `import('@membrana/plugin-contracts')` в хосте — заменить статическим, снять модульный синглтон `pluginContractsPromise`.
- Статус персонажа `farrell` в op-log — ADR о введении или удаление из политики (B8-хвост).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|--------------|--------------|----------|
| Магистраль — `server-plugin-foundation` (L): плагинная основа сервера под серверные модули анализа и визуализации коллекций | `docs/tasks/main-day-assertions.json`, `sources[0].claim` | Слово владельца, сессия `owner-choice@chat/magistral-17-08` | 2026-08-17 |
| Форма решения не предрешена; первый шаг — шторм и собрание (порядок назван владельцем тем же словом) | `sources[0].claim` → текст «шторм и собрание (порядок назначен владельцем тем же словом)» | Слово владельца, та же сессия | 2026-08-17 |
| `docs/tasks/main-day-assertions.json` несёт `sources[0].date = 2026-08-17`; `morning-gates-state.json` не предоставлен во входах — расхождение по норме У1 не обнаружено, гейт-источник отсутствует | `docs/tasks/main-day-assertions.json` | `main-day-assertions.json` (append-only реестр) | 2026-08-17 |
| DAY_PLAN 2026-08-19 называет `server-plugin-foundation` в секции «Магистраль» как первый кандидат с обоснованием «узел как устройство назван владельцем вечером 18.08 как главный незакрытый глагол» | `docs/DAY_PLAN.md` | `docs/DAY_PLAN.md` — **отражение** `sources[0]` (1 источник, 1 отражение) | 2026-08-19 |
| Стендап 2026-08-19 называет фокус дня — зелёный CI + ревью PR #1951/#1953; `server-plugin-foundation` явно не называется магистралью — стендап и план расходятся | `docs/DAILY_STANDUP.md` | `docs/DAILY_STANDUP.md` (независимый документ, генерируется из реестра + стендап-генератор) | 2026-08-19 |
| **Расхождение стендапа и sources[0]:** стендап ставит фокусом «починить CI + ревью PR», sources[0] — `server-plugin-foundation`. По норме: источник магистрали — `sources[0]` (слово владельца 17.08); стендап — контекст исполнения, не замена выбора. Стендап переведён в «Подкрепление» и «Санитарные» — это честное разрешение. | `docs/DAILY_STANDUP.md` vs `sources[0]` | Оба владельческие по происхождению; `sources[0]` свежее (17.08 > генерация стендапа без нового owner-choice) | 2026-08-17 / 2026-08-19 |

> **Итог:** 1 независимый первоисточник (слово владельца 17.08) + 1 отражение (DAY_PLAN). Стендап — независимый документ, но не владельческий выбор магистрали; расхождение названо явно, не замолчано.

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Серверный реестр плагинов (`ServerPluginRegistry` или аналог) в пакетах `background-office` не существует | `symbol:ServerPluginRegistry` в `packages/background-office/src/**` | `unknown` — проверить `yarn main-day-probe` / `git grep`; если символ найден — **ПОСЫЛКА НАРУШЕНА**, день превращается из «построить» в «принять и дозафиксировать» |
| Контракт серверного плагина (`IServerPlugin` или `ServerPluginContract`) не объявлен ни в `background-office`, ни в отдельном пакете `server-plugin-contracts` | `symbol:IServerPlugin` в `packages/**/src/**` | `unknown` — проверить `git grep`; если символ найден — **ПОСЫЛКА НАРУШЕНА**, провести acceptance вместо построения |
| ADR или design-doc `server-plugin-foundation` в `docs/` отсутствует | `file:docs/design/server-plugin-foundation` (любой `.md` по prefix) | `unknown` — проверить `ls docs/design/server-plugin-foundation* 2>/dev/null` |

> **Развилка:** если любая из трёх посылок даёт вердикт `violated` — день меняется с «построить фундамент» на «провести acceptance существующей реализации и дозафиксировать ADR». Это не неудача: паттерн `archivarius-sessions-container` 14.08 показал — обнаружить готовую работу и принять её честнее, чем дублировать.

---

## Сегодня делаем

1. **Прогнать `git grep` по трём маркерам посылок** (`ServerPluginRegistry`, `IServerPlugin`, `server-plugin-foundation` в docs/) — получить вердикт `holds`/`violated` до начала архитектурной работы.
2. **Если все посылки `holds`:** провести архитектурный шторм с Vesnin — сформулировать контракт серверного плагина, способ регистрации модулей, список затрагиваемых пакетов.
3. **Зафиксировать результат шторма** в `docs/design/server-plugin-foundation-2026-08-19.md` (или ADR) с явным вердиктом Vesnin (LGTM формы / список блокеров).
4. **Параллельно (или первым при ≤5 мин):** исправить `plugin-host.service.test.ts` — добавить `await Promise.resolve()` после `void notify()`; убедиться, что `yarn turbo run test --filter=@membrana/background-media` зелёный.
5. **Зафиксировать вердикт по PR #1951 и PR #1953** — LGTM или список блокеров с именованным владельцем; записать итог в трекер.
6. **Запустить `yarn workspace @membrana/rag-service test --no-coverage`** без правок — записать вывод как диагноз (воспроизводится / flaky / порядок-зависимый).

---

## Definition of Done (фокус)

- [ ] Прогнаны три `git grep`-маркера посылок; вердикт `holds`/`violated` зафиксирован текстом до архитектурной работы
- [ ] Существует `docs/design/server-plugin-foundation-2026-08-19.md` (или ADR) с контрактом плагина сервера и списком затрагиваемых пакетов — **либо** письменный диагноз блокера с именованным следующим шагом
- [ ] Документ содержит явный вердикт Vesnin: LGTM формы решения или перечень открытых вопросов
- [ ] `yarn turbo run test --filter=@membrana/background-media` зелёный (исправлен микротаск в `plugin-host.service.test.ts`)
- [ ] По PR #1951 и PR #1953 зафиксирован вердикт (LGTM или список блокеров с владельцем)
- [ ] Диагноз `@membrana/rag-service#test` записан (воспроизводится / flaky / порядок-зависимый) — без правок кода

---

## Сознательно не делаем сегодня

- **`mfcc-compare-sprint`** — не входим до LGTM по PR #1951 и #1953; корпус без ревью недостоверен.
- **`batch-collection-run-contour`** — консилиум-гейт по модели исполнения не проведён; в код не идём.
- **Повторный DSP-бенчмарк (harmonic / cepstral / spectral-flux на free-v1)** — потолок эшелона 0 зафиксирован (`DRONE_TIGHT` 95%/30%); без смены датасета или алгоритма прогон не добавляет информации (§6 `FFT_METRICS_POTENTIAL_AND_LIMITS.md`).
- **Гейт `secret-parser-built`, критерий (в) / предикат `amnestyLifted`** — отложен словом владельца; не трогаем до явного слова.
- **Реализация серверных плагинов (код модулей анализа/визуализации)** — сегодня только фундамент (контракт + ADR); реализация — после LGTM формы.

---

## Вторично (если останется время)

- Проверить, можно ли переиспользовать `PluginContractsModule` клиентской стороны как reference при проектировании серверного контракта — записать вывод одним абзацем в design-doc.
- Добавить флаг `--dry-run` к `field-capture.mjs` (печатает `envCandidates()` без записи) — узнать, не утекает ли путь к `.env` в stdout.

---

## Зависимости и риски

- **Блокер:** если `git grep` покажет `violated` по всем трём посылкам — день меняется на acceptance, не на построение; форму переключения зафиксировать явно в design-doc.
- **Блокер:** `@membrana/background-media#test` красный блокирует любой merge по смежным эпикам (`angelina-hostess-impl`, `assets-container`); исправление приоритизировать до или параллельно с штормом.
- **Риск:** шторм без готового дизайн-doc к вечеру — неполный DoD; митигация — зафиксировать хотя бы список открытых вопросов и вердикт Vesnin «форма не принята, причина: ...».
- **Риск:** `morning-gates-state.json` не предоставлен во входах — проверка нормы У1 (расхождение `sources[0]` vs гейт) выполнена частично; если файл существует с `day=2026-08-19`, его `magistral` должен быть сверен с `sources[0]` и расхождение зафиксировано по норме.

---

## Ссылки

- [`docs/DAILY_STANDUP.md`](../DAILY_STANDUP.md) — стендап 2026-08-19
- [`docs/tasks/main-day-assertions.json`](../tasks/main-day-assertions.json) — источник магистрали (`sources[0]`, owner-choice 17.08)
- [`docs/DAY_PLAN.md`](../DAY_PLAN.md) — план дня, 5 слотов
- [`docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](../prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6