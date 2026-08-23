<!-- Сгенерировано: 2026-08-23T05:28:50.562Z (yarn main-day-issue@0a495865) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"82a93a6e7d874ace13057d78bafcb8f9bf32b36c","digest":"cc1cf035d66919ac51439bdfc31750c7ab2cd5dbe5ca29531a5102941510f43a"},"DAILY_STANDUP":{"version":"82a93a6e7d874ace13057d78bafcb8f9bf32b36c","digest":"3c9b3ad74b73d72141f67a45aba1903c788e9e682d5bb4b99d93d26801911f0e"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-23: firebat-node-device

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `firebat-node-device` |
| `primaryTitle` | Узел Firebat как устройство: приложение на узле, исходящий канал, права при установке |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-08-23 |

## Магистраль

Единственный обязательный мандат дня — **`firebat-node-device` (L)**: узел Firebat как устройство, на котором живёт приложение, само держит **исходящий** канал к серверу и получает права **при установке** (не через «голый» SSH как операционную модель; SSH — отладка лаборатории). Источник мандата — `sources[0]` в `docs/tasks/main-day-assertions.json` (owner-choice 19.08, frozen top-3: `firebat-node-device` · `server-plugin-foundation` · `rag-service-red-test`); синтез иной L-оси из стендапа/плана **запрещён**, пока owner-source задан. Контекст исполнения: ступень «узел пишет 48 kHz и отправляет сам» уже закрыта; узел за вторым роутером ⇒ вход снаружи закрыт, канал только исходящий; в стволе уже лежат fail-closed rate-работы (#2046 / #2065) — они **подкрепляют** контур захвата, а не подменяют L-ось устройства. К вечеру: явный прогресс карточки устройства (контракт/инсталляционный контур/канал), плюс живой smoke «старт сценария → только 48 kHz или отказ на **первом** треке» на пути узла; без нового owner-choice не уходим в hostess / assets / batch и не открываем UI `journal-home-real`.

**Критерий успеха к вечеру:** зафиксирован проверяемый сдвиг по `firebat-node-device` (артефакт: diff/ADR/скрипт установки или протокол канала) **и** smoke rate fail-closed на первом треке (pass/fail с логом), без параллельного старта чужих L.

## Подкрепление

- **P1-ревью / дожим #2065:** fail-closed rate на **всех** путях scenario / capture / node — не «демо-зелёный» один путь; живой smoke: старт сценария → 48 kHz или отказ на первом треке (подпора магистрали узла, не смена оси).
- **Веха `secret-parser-built` (без снятия амнистии кодом дня):** сверить и завести/починить карточку в реестре (claims-probe: «карточки нет»); инвентарь `night-triage-secret-scan.mjs` по линии «резак vs детектор» с опорой на `scripts/lib/secret-redact.mjs` (урок retired-redact-wrong-address) и контур датированного прохода + манифест ротации (`credential-rotation-biweekly`) — claims/инвентарь, не импровизационное «закрыли гейт».

## Перспективные

- Согласованная с владельцем **форма журнала** (буфер · наборы · архив + обещания тарифов) — откроет нарезку `journal-home-real` и сессию UI **без** кода до письменного «да» (owner-choice 22.08 критерием «форма согласована» ещё не закрыт).
- Гейт **`secret-parser-built`** (резак в контуре night-triage + датированный проход с манифестом ротации) — снимет амнистию правки архива и разблокирует безопасные бэкапы сессий (кристаллы `session-backup-requires-secret-redaction`, `secret-parser-cuts-aggressively`).
- Вечерний сеанс «что не из моего набора» после зелёного fail-closed rate на первом треке — только когда P0-дыра захвата закрыта на живом пути узла.

## Экспериментальные

- Прогон `night-triage-secret-scan` + redact-контура на одном фикстурном транскрипте с ключом-заглушкой: режет ли цепочка сейчас или только детектит паттерны.
- За ~15 мин три колонки «буфер · наборы · архив» глазами человека у кабинета (md/бумага): читаются ли тарифные обещания как навигация **без** UI-кода.
- Узкий smoke на Firebat — только первый трек сценария: 48 kHz или отказ; отличие «держит в диффе» vs «держит на живом пути».

## Санитарные

- claims-probe: сверить `secret-parser-built` / `session-digest` в registry (карточек нет @a4c95028efbe)
- P1-ревью #2065: fail-closed rate на всех путях scenario/capture/node
- P1-ревью #2068: границы office/media/plugin-pages, хуки без прямого store вместо registry
- **перечеканить `main-day-assertions.json`** — assertions/sources от 19.08, freshness сорван (канон предписывает перечеканку — не сделана)
- smoke rate живьём: старт сценария → отказ или 48 kHz на **первом** треке
- не разворачивать построчный oversized-долг (#2065/#2068/#2067/…) в магистраль дня

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня = `firebat-node-device` (L): приложение на узле, исходящий канал, права при установке | сессия | owner-choice@chat/magistral-19-08 → `docs/tasks/main-day-assertions.json` `sources[0].claim` | 2026-08-19 |
| Выбор сделан из замороженного top-3 (`firebat-node-device`, `server-plugin-foundation`, `rag-service-red-test`), digest `9ee6b5ca…` | снимок-хардкод | frozen snapshot morning:gate 19.08 (`frozenDigest` / `frozenOptions` в sources[0]) | 2026-08-19 |
| Синтез магистрали из стендапа/плана/горизонта запрещён, пока задан owner-source | план | канон MAIN_DAY_ISSUE / probe (прецеденты 16.07 фантом; 18.07 #598/#599 vs «подключить генератор») | 2026-07-16… |
| Узел за NAT/вторым роутером → канал только исходящий; SSH не операционная модель прав | сессия | слово владельца 18.08 вечером (цитата в sources[0]) | 2026-08-18 |
| Ступень «48 kHz пишет и отправляет сам» закрыта — день не про повтор съёмки, а про устройство/установку/канал | сессия | контекст sources[0] + ствол rate #2046/#2065 | 2026-08-18…22 |
| **Расхождение: магистраль взята с assertions `sources[0]`; гейт утра сегодняшним `magistral` не переопределил; assertions не перечеканены** | план | `docs/DAY_PLAN.md` санитарно: «assertions от 19.08, freshness сорван»; `morning-gates-state.json` в контуре дня не дал более свежего owner-magistral на 23.08 | 2026-08-23 |
| Стендап держит фокус «форма `journal-home-real`» и запрет UI/hostess/assets/batch без choose — это **контекст и ограничители**, не замена owner-magistral | план | `docs/DAILY_STANDUP.md` 2026-08-23 | 2026-08-23 |
| Горизонт вехи `secret-parser-built` (approaching) не назначает L-ось дня | план | `docs/STRATEGY_DAY.md` / `day-horizon.json` (gate #592) | 2026-08-23 |
| Top-3 плана (hostess / assets / batch) — кандидаты **без** owner-choice; план явно: «магистраль НЕ назначена» | план | `docs/DAY_PLAN.md` 2026-08-23 | 2026-08-23 |

**Голоса по различным первоисточникам:** (1) owner-choice 19.08 + frozen top-3 — **1 источник** (поля claim/frozen* коррелированы); (2) канон anti-синтеза probe — 1 источник; (3) слово 18.08 про права/SSH — 1 источник, усиливает тот же мандат устройства; (4) стендап 23.08 и DAY_PLAN top-3 — **отдельные** источники про форму журнала и кандидатов, но **не** имеют права перебить sources[0] без нового choose/гейта. Итог: мандат = `firebat-node-device`; freshess assertions сорван — находка дня, не повод синтезировать journal/hostess.

*1 источник owner-magistral, 2 отражения в ритуальных доках (standup/plan цитируют ограничения дня, не новый choose).*

## Посылки

`assertions[]` в `main-day-assertions.json` **пуст** (сознательно / не перечеканено под текущий день).

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| — | — | развилки A/B нет, посылок не требуется |

Назначение дня опирается на **owner-source** (выбор карточки), не на утверждение «символа в коде ещё нет». Маркерный гвард «работы нет» для устройства не выдумываем (класс retired-17-07 / link-16-08: невыразимое маркером не чеканить суррогатом).

## Сегодня делаем

1. Зафиксировать рабочий край `firebat-node-device`: что уже в стволе (48 kHz path, install/PS1, rate fail-closed) vs дыра «устройство / исходящий канал / права при установке».
2. Сделать **один** проверяемый инкремент L-оси (контракт канала **или** инсталляционный контур прав **или** документированная граница «приложение на узле»), без расползания в hostess/assets/batch.
3. Прогнать живой smoke: старт сценария на узле → **первый** трек только 48 kHz или отказ; результат (pass/fail + путь) записать.
4. P1-проход #2065: перечень путей scenario/capture/node и статус fail-closed на каждом (таблица, не «вроде зелёный»).
5. Claims-probe по `secret-parser-built`: есть ли карточка в registry; если нет — завести/восстановить факт, не закрывая веху кодом-импровизацией.
6. Санитарно: явным пунктом вечера запланировать **перечеканку** `main-day-assertions.json` (sources/date под актуальный owner-choice) — сейчас freshness сорван.

## Definition of Done (фокус)

- [ ] Primary focus дня = `firebat-node-device`, не подменён journal-UI / hostess / assets / batch
- [ ] Есть артефакт инкремента по устройству (код и/или ADR/протокол канала/установки) с проверяемым diff
- [ ] Исходящий канал / права-при-установке: следующий конкретный шаг записан или закрыт, без «SSH как норма»
- [ ] Smoke: первый трек сценария на узле → 48 kHz **или** отказ fail-closed (лог/протокол)
- [ ] #2065: статус fail-closed по путям scenario/capture/node зафиксирован таблицей
- [ ] Ветки hostess / assets / batch / UI `journal-home-real` не стартовали без нового owner-choice
- [ ] Находка freshness `main-day-assertions.json` (19.08 → 23.08) названа; перечеканка в санитарном хвосте, не замалчивание
- [ ] Веху `secret-parser-built` кодом дня «с амнистией» не закрывали

## Сознательно не делаем сегодня

- UI-код `journal-home-real` и нарезка экранов до письменного «да» владельца по форме (буфер · наборы · архив)
- Параллельные L без choose: `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`
- «Этап 1.A» / повторный benchmark harmonic+cepstral+flux на free-v1 и код `mfcc-compare-sprint` без вердикта по открытым issue
- Закрытие вехи `secret-parser-built` (#2022 кр.3) импровизацией в архиве — только claims-probe / инвентарь резака
- Построчный разбор oversized-долга (#2065/#2068/#2067/…) как замена L-оси устройства
- Синтез «новой магистрали» из top-3 плана вопреки `sources[0]`

## Вторично (если останется время)

- Набросок md «буфер · наборы · архив» (15 мин) — топливо к завтрашнему owner-choice по журналу, не код
- Фикстурный прогон secret-scan/redact на одном транскрипте-заглушке (диагностика резака, не снятие амнистии)

## Зависимости и риски

- **Блокер-процесс:** `main-day-assertions.json` не перечеканен с 19.08 — риск, что живой choose владельца уже иной, а ритуал держит старый `sources[0]`; лечится перечеканкой/gate `--choose`, не молчаливым синтезом
- **Блокер-сеть:** узел за вторым роутером — любой «входящий» дизайн канала ложен; только исходящий hold
- **Риск подмены оси:** сильный продуктовый зуд journal-form / hostess из стендапа уводит день в L без choose
- **Риск rate:** обход fail-closed на одном из путей capture/node маскирует «зелёный» diff при дыре на первом треке

## Ссылки

- [`docs/DAILY_STANDUP.md`](./DAILY_STANDUP.md) — стендап 2026-08-23
- [`docs/DAY_PLAN.md`](./DAY_PLAN.md) — 5 слотов; top-3 без owner-choice
- [`docs/STRATEGY_DAY.md`](./STRATEGY_DAY.md) — горизонт, веха `secret-parser-built`
- [`docs/tasks/main-day-assertions.json`](./tasks/main-day-assertions.json) — `sources[0]` = owner magistral 19.08
- [`docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — запрет магистрали «Этап 1.A» / одиночный DSP-benchmark