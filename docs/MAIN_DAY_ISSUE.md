<!-- Сгенерировано: 2026-10-02T05:51:53.525Z (yarn main-day-issue@3d33d09f) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"d364ef644d2c9be841ad57ecad431239507cda00","digest":"ec492c4e1ad7fe7ddf009656ea9126d9ed0d5d170d07f788ad5040bdc028b51d","versionAt":"2026-10-01T10:34:03+03:00"},"DAILY_STANDUP":{"version":"433038cc87198410d048fccbb4fcf6414f845297","digest":"1ab360a7ee7d9157c5b4927884a00114b2701aa0c1e777804919dccfca82c941","versionAt":"2026-10-01T11:20:44+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-02

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `angelina-hostess-impl` |
| `primaryTitle` | Ведущая Ангелина как автономный агент: контракт + скелет цикла |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-02 |

## Магистраль

**`angelina-hostess-impl`** — Ангелина переходит от роли «текстовой ведущей диалога» к автономному агенту, снимающему ручные операции модерации: раздачу заданий, проверку по факту, сдачу/мёрдж по приёмке, ведение ритуалов. Стартовый артефакт дня — `docs/procedures/angelina-hostess-contract.md`: входные события (триггеры), выходные артефакты (что именно создаёт/закрывает), граница модуля (что она НЕ делает), форма `isValid = true`. Контракт является обязательным предусловием любого кода: без зафиксированной формы решения Ozhegov не может начать проектирование скелета, а цикл с `isValid=true` не замкнуть. Критерий успеха к вечеру: файл `docs/procedures/angelina-hostess-contract.md` смержен в `main`, Ozhegov открыл задачу на скелет с явными точками входа/выхода — или зафиксировал блокер.

## Подкрепление

- **Закрыть `#2503` (`PERSONAS` → `scripts/lib/personas.mjs`)** — XS-шот, шестой день простоя в зоне Ozhegov. Роутинг при холодном старте расходится с реестром; пока `PERSONAS` не переехал, скелет обработчика Ангелины не может надёжно опереться на персоно-роутинг. После правки: `yarn ask vesnin --no-context "тест"` — проверить что маршрут жив.
- **Закрыть `ritual-day-2026-10-01-r2` (`runPhase: open`)** — `yarn turbo run typecheck test lint --filter=@membrana/tooling` первым действием до любого коммита; без этого вечернее ревью объявит день незавершённым пятый раз подряд и создаст шум поверх магистрали.

## Перспективные

- Закрытие контракта Ангелины прямо разблокирует гейт `secret-parser-built` в цепочке: контракт описывает форму автономного цикла, а резак ночного триажа (`night-triage-secret-scan.mjs`) является частью того же цикла архивации — без контракта амнистия на правку архива не снимается.
- После мёржа контракта и скелета — ревью PR #2529 (`fuseDetectorConfidences`, 7627 строк, пятый перенос): закрытие разморозит benchmark-путь в `@membrana/core` и откроет нормальную работу с детекционной полосой.
- Диагностика красного теста `@membrana/background-cabinet` (корень не назван) — при движении в сторону office-интеграций Ангелины пакет окажется на критическом пути; назвать корень до merge.

## Экспериментальные

- **Проба А:** Запустить `night-triage-secret-scan.mjs --dry-run` на одном старом файле архива прямо сейчас — узнать, режет ли скрипт или только детектирует (ответ меняет объём работы по контракту: нужен ли отдельный резак или достаточно доработать существующий).
- **Проба Б:** Открыть `docs/procedures/` и проверить наличие любого файла с `angelina` в имени — шесть голосов вечернего протокола зафиксировали отсутствие контракта, но рабочее дерево `d22d3042771a` вчерашнее; файл мог появиться под другим именем.
- **Проба В:** `git check-attr merge docs/**/*.jsonl` — проверить, распространяется ли `union`-атрибут на append-only логи; хвост #2096 может быть уже закрыт без отражения в реестре.

## Санитарные

- **P1:** `ritual-day-2026-10-01-r2` — `runPhase: open`, закрывающей записи нет → `yarn turbo run typecheck test lint --filter=@membrana/tooling` до первого коммита
- **P1:** PR #2529 (`fuseDetectorConfidences`, 7627 строк) — пятый перенос, benchmark-путь заморожен → `yarn code-review:pr 2529`; без этого любые правки в `@membrana/core` идут вслепую
- **P1:** `@membrana/background-cabinet` — красный тест, корень не назван → `yarn turbo run test --filter=@membrana/background-cabinet`; диагностировать до merge
- **P1:** `docs/procedures/duty/2026-09-27.md` — в диффе не появлялся; подтвердить, что факты по трём дорогам (опыт 01.10) закоммичены; если нет — коммит до открытия магистрали
- **P2:** `#2503` `PERSONAS → scripts/lib/personas.mjs` — Ozhegov, XS, шестой день; блокирует роутинг скелета Ангелины
- **P2:** `#2476` a11y пагинации — Rodchenko; `aria-current`, focus trap, Tab/Enter вторую неделю без верификации
- **P2:** Зубы адаптера `buildBoardOverflowHoldView` в `OverflowWindowHost.test.tsx` — вынести отдельным `test`-коммитом до следующей правки зоны (рекомендация Vesnin из ревью)

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `angelina-hostess-impl` | owner-choice | `docs/tasks/main-day-assertions.json` `sources[0]`, origin `owner-choice@chat/magistral-01-10` | 2026-10-01 |
| Магистраль — `angelina-hostess-impl` (подтверждение) | `docs/tasks/morning-gates-state.json` `magistral` + `day: 2026-10-01` | `morning-gates-state.json`, `magistralAuthor: snapshot` | 2026-10-01 |
| **Расхождение источников:** `morning-gates-state.json` несёт `magistral` с `day: 2026-10-01`; `main-day-assertions.json` `sources[0].date` тоже `2026-10-01` — оба владельческие, совпадают по выбору (`angelina-hostess-impl`). Расхождения по смыслу нет; **расхождение процессное**: `morning-gates-state.json` является более поздним по правилу (гейт позже assertions), при этом `main-day-assertions.json` не перечеканен под сегодняшний день (`sources[0].date = 2026-10-01`, прогон `2026-10-02`). **Магистраль взята с гейта, assertions не перечеканены** — находка: перечеканка `main-day-assertions.json` каноном предписана и не выполнена. | — | — | — |
| `docs/procedures/angelina-hostess-contract.md` отсутствует третий день | снимок рабочего дерева | `docs/procedures/` (отсутствие файла) | 2026-10-01 (вечерний протокол `d22d3042771a`) |
| Контракт — обязательное предусловие гейта `secret-parser-built` и скелета автономного цикла | план | `docs/DAY_PLAN.md` (генератор #592) | 2026-10-02 |
| `#2503` блокирует роутинг скелета Ангелины шестой день | issue + код | `scripts/lib/personas.mjs` (отсутствие PERSONAS-экспорта); `registry.json` | 2026-10-01 |
| Стендап не назначил магистраль (owner-choice отсутствовал на момент генерации) | стендап | `docs/DAILY_STANDUP.md` 2026-10-02, комментарий `<!-- Источник фокуса: нет -->` | 2026-10-02 |

> Независимых первоисточников: 2 (owner-choice в assertions + гейт в morning-gates-state) — оба называют `angelina-hostess-impl`, расхождения по выбору нет. Остальные строки — контекст, не голоса за выбор.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `docs/procedures/angelina-hostess-contract.md` не существует — проектирование скелета не начато | `file:docs/procedures/angelina-hostess-contract.md` (отсутствие) | `holds` — вечерний протокол `d22d3042771a` подтверждает; Проба Б уточняет перед стартом |
| `scripts/lib/personas.mjs` не экспортирует `PERSONAS` — роутинг при холодном старте расходится | `symbol:PERSONAS` в `scripts/lib/personas.mjs` | `holds` — шесть дней без движения, `#2503` открыт |
| `ritual-day-2026-10-01-r2` в `runPhase: open` — вечернее ревью объявит день незавершённым | `file:docs/archive/daily-day/2026-10-01.jsonl` (запись r2 без close) | `holds` — Vesnin B6, Dynin, Ozhegov P1 из code-review |

## Сегодня делаем

1. `yarn turbo run typecheck test lint --filter=@membrana/tooling` — закрыть `ritual-day-2026-10-01-r2` (`runPhase: open`) до любого коммита.
2. Запустить Пробу А (`night-triage-secret-scan.mjs --dry-run`) и Пробу Б (`ls docs/procedures/`) — зафиксировать результат в комментарии к задаче до написания контракта.
3. Написать и сдать `docs/procedures/angelina-hostess-contract.md`: входные события (триггеры), выходные артефакты, граница модуля, форма `isValid = true`; PR → merge в `main`.
4. Закрыть `#2503` (`PERSONAS` → `scripts/lib/personas.mjs`): XS-шот, Ozhegov; после правки — `yarn ask vesnin --no-context "тест"`.
5. Ozhegov открывает задачу реестра на скелет автономного цикла Ангелины с явными точками входа/выхода (или фиксирует блокер текстом).
6. `yarn turbo run test --filter=@membrana/background-cabinet` — назвать корень красного теста; записать в комментарий.

## Definition of Done (фокус)

- [ ] `ritual-day-2026-10-01-r2` закрыт (typecheck + test + lint `@membrana/tooling` зелёные)
- [ ] `docs/procedures/angelina-hostess-contract.md` существует в `main` (входные события, выходные артефакты, граница, форма `isValid=true` — все четыре секции заполнены)
- [ ] `#2503` закрыт: `symbol:PERSONAS` экспортируется из `scripts/lib/personas.mjs`; `yarn ask vesnin --no-context "тест"` отдаёт ответ без ошибки роутинга
- [ ] Ozhegov зафиксировал задачу на скелет (карточка в реестре или явный блокер в комментарии)
- [ ] Проба А выполнена: результат `dry-run` записан (режет / только детектирует)
- [ ] Корень красного теста `@membrana/background-cabinet` назван в комментарии к пакету
- [ ] `docs/procedures/duty/2026-09-27.md` — подтверждён коммит с фактами по трём дорогам

## Сознательно не делаем сегодня

- **`assets-container`** и **`chart-list-plugin`** (оба L) — расщепление трёх L убивает все три; уходят в следующий owner-choice после закрытия `angelina-hostess-impl`
- **Полная имплементация резака `night-triage-secret-scan.mjs`** — только Проба А (dry-run); полная реализация требует owner-choice и снятия P1-хвостов
- **Benchmark harmonic / cepstral / spectral-flux** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); повтор без новых данных не даёт информации
- **Правки benchmark-пути в `@membrana/core`** — до завершения `yarn code-review:pr 2529`; любые правки вслепую поверх 7627 строк
- **`#2476` a11y пагинации** — P2, Rodchenko; не сегодня, чтобы не отвлекать от магистрали

## Вторично (если останется время)

- Проба В: `git check-attr merge docs/**/*.jsonl` — проверить `union`-атрибут на append-only логах; хвост #2096 может быть закрыт без отражения в реестре
- `yarn code-review:pr 2529` — начать T2-ревью #2529 (`fuseDetectorConfidences`), если P1-хвосты закрыты до обеда

## Зависимости и риски

- **Блокер 1:** `docs/procedures/duty/2026-09-27.md` — если протокол опыта трёх дорог не закоммичен, день 01.10 формально не закрыт; Vesnin отмечает как P1. Проверить до старта магистрали.
- **Блокер 2:** Проба Б может обнаружить контракт Ангелины под другим именем — тогда шаг 3 превращается в переименование/доработку, а не написание с нуля; объём меняется.
- **Риск:** `@membrana/background-cabinet` красный — если корень лежит в зоне, которую трогает скелет Ангелины (office-интеграции), merge скелета заблокируется; диагностика критична до step 5.
- **Риск:** `morning-gates-state.json` несёт `day: 2026-10-01`, прогон — `2026-10-02`; свежесть `no_gate` (не сегодняшний). Перечеканка `main-day-assertions.json` не выполнена — это процессный долг; пока оба источника называют один и тот же выбор, блокером не является, но при следующем owner-choice может создать конфликт.

## Ссылки

- [`docs/DAILY_STANDUP.md`](docs/DAILY_STANDUP.md) — стендап 2026-10-02
- [`docs/DAY_PLAN.md`](docs/DAY_PLAN.md) — план дня (генератор #592)
- [`docs/tasks/main-day-assertions.json`](docs/tasks/main-day-assertions.json) — owner-choice `sources[0]`
- [`docs/tasks/morning-gates-state.json`](docs/tasks/morning-gates-state.json) — гейт магистрали
- [`docs/DAILY_CODE_REVIEW.md`](docs/DAILY_CODE_REVIEW.md) — вечернее ревью 2026-10-01
- [`docs/procedures/angelina-hostess-contract.md`](docs/procedures/angelina-hostess-contract.md) — целевой артефакт (отсутствует, создаётся сегодня)