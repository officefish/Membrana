<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-03
  archived-at: 2026-10-03T15:58:06.428Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-03T09:59:15.948Z (yarn main-day-issue@78de7702) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"b1f113d32967d04a482e73b5d29bd6cdc10851df","digest":"075bf685e7d65cf03f176aa956b9152015b66974b4f68f2535f742d1690af43b","versionAt":"2026-10-03T12:51:04+03:00"},"DAILY_STANDUP":{"version":"78de770204cf170318caab44fb5e9b85623d32fc","digest":"2236549dc16326f6b16675e04a86e8cdce956cd5a128dc227673988f076db0aa","versionAt":"2026-10-03T12:57:38+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-03

<!-- Сгенерировано: 2026-10-03 (yarn main-day-issue) -->
<!-- Источник магистрали: owner-choice@chat/magistral-03-10 · morning-gates-state.json day=2026-10-03 -->

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `chart-list-plugin` |
| `primaryTitle` | Плагин кабинетного чарт-листа — сверка со стволом, спринт на остаток |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | `docs/prompts/SESSION_B_CHART_LIST_TASK.md` |
| `сгенерировано` | 2026-10-03 |

## Магистраль

Владелец 03.10 назначил магистраль дня — **`chart-list-plugin`**: плагин журнала «чарт-лист» (отбор звуков поверх почвы). Карточка существует с 22.08; витрина отбора уже живёт в media и Studio (#2110), кабинетный близнец остаётся незакрытым хвостом с 24.08. Порядок работы строго двухфазный: сначала **сверка** — пройти по пунктам задания `SESSION_B_CHART_LIST_TASK.md` и установить, что уже есть в стволе с доказательствами (символ/файл, а не «issue open»); затем **спринт** — только на подтверждённый остаток. Если при сверке окажется, что значительная часть уже в проде, карточка архивируется словом владельца, а не превращается в дублирующую работу. Прибор под нагрузкой (95% на тарифе «Наблюдательный пункт», 3891/4096 МБ — вход `sources[0]`), поэтому время дорого.

**Критерий успеха к вечеру:** сверочный артефакт (таблица «есть в стволе / нет») зафиксирован и прочитан владельцем; либо первый рабочий артефакт кабинетного близнеца влит в PR с зелёным CI, либо карточка архивирована с явным словом владельца.

## Подкрепление

- **Закрыть `#2503` (PERSONAS → `scripts/lib/personas.mjs`, XS, Ozhegov)** — седьмой день простоя; одна правка импорта + коммит; без этого `yarn ask` и любой ритуал с роутингом персон ломается на этапе разрешения имён, что блокирует чистый прогон вечернего ревью магистрали.
- **Назвать корень красного теста `@membrana/background-cabinet`** (`yarn turbo run test --filter=@membrana/background-cabinet` → файл + строка) — третий день без диагноза; P1, блокирует merge в затронутый пакет; без диагноза нельзя честно считать вечернее CI зелёным.

## Перспективные

- Пройденная сверка `chart-list-plugin` создаёт прецедент «архив вместо дублирования» — паттерн переносится на другие карточки с 24.08, чьи задачи могут уже быть в стволе.
- Закрытый `#2503` разблокирует чистый прогон `yarn ask` / `yarn consilium` — дальнейшие ритуалы перестают зависеть от ручного обхода роутинга персон.
- Диагноз красного теста `@membrana/background-cabinet` открывает merge-окно для всех задач, затрагивающих этот пакет, включая будущие шаги по парсеру секретов (`secret-parser-built`).

## Экспериментальные

- **Запустить `night-triage-secret-scan.mjs` в режиме «только лог» на одном архивном файле** — узнать, детектор уже видит то, что нужно резать, или паттерны неполны; делать только если остался слот после сверки магистрали.
- **Прогнать `pr:ship` на ветке с намеренно засвеченной строкой в диффе** — узнать, блокирует ли текущий CI засвеченный секрет; слот — после закрытия `#2503`.
- **Сымитировать ротацию одного ключа вручную (без реального отзыва)** — проверить, достаточен ли формат манифеста ротации для датированного прохода; слот — вечер, если P1-хвосты закрыты.

## Санитарные

- `ritual-day-2026-10-02` в `runPhase: open` — закрыть первым коммитом утра; проверить, что `2026-10-02.jsonl` получила `close`-запись; без этого паттерн `r2` за 01.10 повторится третий раз подряд.
- `#2503` (`PERSONAS → scripts/lib/personas.mjs`, XS) — седьмой день простоя; одна правка импорта + коммит; `yarn ask vesnin --no-context "тест"` — финальная проверка.
- Красный тест `@membrana/background-cabinet` — назвать корень (файл + строка), третий день без диагноза; P1.
- PR `#2556` (631 строка, `fix: ritual: carry result evidence`) — ревью первым слотом по регламенту «один oversized-PR в день»; остальные (#2555, #2553, #2550, #2547, #2549) — в очередь.
- `buildBoardOverflowHoldView` — вынести в отдельный тест-файл; замечание висит вторую неделю; XS, делать только при наличии свободного слота.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Владелец выбрал `chart-list-plugin` из топ-3 в чате | сессия | `owner-choice@chat/magistral-03-10` (реплика владельца) | 2026-10-03 |
| `morning-gates-state.json` несёт `magistral: chart-list-plugin`, `day: 2026-10-03` | снимок-хардкод | `docs/tasks/morning-gates-state.json` | 2026-10-03 |
| `main-day-assertions.json` `sources[0].claim` совпадает с гейтом (`chart-list-plugin`) | план | `docs/tasks/main-day-assertions.json` | 2026-10-03 |
| **Расхождение:** `morning-gates-state.json` и `sources[0]` несут одно имя, но это два разных артефакта; `morning-gates-state.json magistralChosenAt=2026-10-03` — волеизъявление позднее; **магистраль взята с гейта, assertions не перечеканены** | снимок-хардкод | `docs/tasks/morning-gates-state.json` (`magistralAuthor: snapshot`) | 2026-10-03 |
| Витрина отбора уже в стволе (media + Studio, #2110); кабинетный близнец — незакрытый хвост с 24.08 | план / стендап | `docs/DAILY_STANDUP.md` (читает реестр, `registry.json`) | 2026-10-03 |
| Топ-3 кандидатов детерминировано из реестра; `chart-list-plugin` — наиболее контекстуально горячий | план | `docs/DAY_PLAN.md` (генератор #592 читает `registry.json`) | 2026-10-03 |

> **1 независимый источник — слово владельца (реплика в чате 03.10).** `morning-gates-state.json` и `main-day-assertions.json` — два артефакта-отражения одного волеизъявления. `DAILY_STANDUP.md` и `DAY_PLAN.md` — контекст, не источник выбора. Синтез запрещён; магистраль взята с гейта как более позднего владельческого артефакта. Перечеканка `main-day-assertions.json` предписана каноном и не сделана — это открытый drift, не блокер дня.

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Кабинетный близнец чарт-листа отсутствует в стволе как самостоятельный плагин | `file:apps/client/src/plugins/chart-list-plugin/` — наличие/отсутствие директории | `unknown` — сверка первым шагом дня |
| Витрина отбора для media и Studio уже в проде (#2110) — повтор не нужен | `symbol:ChartListPlugin` в `apps/studio` или `apps/media` | `unknown` — проверяется при сверке |
| `#2503` не закрыт, роутинг персон сломан | `file:scripts/lib/personas.mjs` — наличие актуального импорта `PERSONAS` | `holds` (седьмой день без движения, подтверждено стендапом и ревью) |
| Красный тест `@membrana/background-cabinet` не диагностирован | `yarn turbo run test --filter=@membrana/background-cabinet` — exit non-zero | `holds` (третий день, подтверждено ревью 02.10) |

## Сегодня делаем

1. Закрыть `ritual-day-2026-10-02` (`runPhase: open`) — записать `close`-запись в `2026-10-02.jsonl`, убедиться что `runPhase` меняется на `closed`.
2. Сверка `chart-list-plugin`: пройти по пунктам `SESSION_B_CHART_LIST_TASK.md`, для каждого пункта указать маркер (`symbol:` или `file:`) — есть в стволе или нет; результат — таблица «есть / нет» с доказательствами.
3. По итогу сверки: если остаток есть — спринт на кабинетный близнец (минимальный PR с зелёным CI); если всё в стволе — архивировать карточку словом владельца.
4. Закрыть `#2503` (PERSONAS → `scripts/lib/personas.mjs`): правка импорта + коммит + `yarn ask vesnin --no-context "тест"`.
5. Назвать корень красного теста `@membrana/background-cabinet`: `yarn turbo run test --filter=@membrana/background-cabinet` → файл + строка + письменный диагноз.
6. Ревью PR `#2556` (631 строка) — первый и единственный oversized-PR сегодня по регламенту.

## Definition of Done (фокус)

- [ ] Таблица сверки `chart-list-plugin` (пункты задания × маркеры ствола) зафиксирована в артефакте и прочитана владельцем
- [ ] Принято решение: спринт на остаток ИЛИ архивация карточки словом владельца — результат зафиксирован письменно
- [ ] Если спринт: PR кабинетного близнеца открыт, CI зелёный (или диагностирована причина красного)
- [ ] Если архив: карточка `SESSION_B_CHART_LIST_TASK.md` помечена archived с датой и подписью владельца
- [ ] `#2503` закрыт: `yarn ask vesnin --no-context "тест"` проходит без ошибки роутинга персон
- [ ] Красный тест `@membrana/background-cabinet` — корень назван (файл + строка), диагноз зафиксирован письменно
- [ ] `ritual-day-2026-10-02` — `runPhase` переведён в `closed`, запись в `2026-10-02.jsonl` есть

## Сознательно не делаем сегодня

- `angelina-hostess-impl` и `assets-container` — стол не чист (P1-хвосты не закрыты); L-задача поверх незакрытых P1 воспроизведёт паттерн трёх предыдущих вечеров.
- Oversized PR пачкой (#2555, #2553, #2550, #2547, #2549) — регламент: один за день; сегодня только #2556.
- DSP-бенчмарк (harmonic / cepstral / flux на free-v1) — потолок зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6), без смены датасета информации не добавит.
- Любое касание `@membrana/core` benchmark-пути — PR #2529 (`fuseDetectorConfidences`, 7627 строк, шестой день заморозки) не закрыт; регрессия необнаруживаема.
- `buildBoardOverflowHoldView` вынос в тест — XS, но только при свободном слоте после магистрали и P1-хвостов.
- Запуск `secret-parser-built` / `night-triage-secret-scan.mjs` как основная работа — только экспериментальный слот, если магистраль закрыта.

## Вторично (если останется время)

- Ревью PR #2555 (`fix(build): stale-dist-turbo-cache`, 810 строк) — второй в очереди oversized-PR, только после #2556.
- `buildBoardOverflowHoldView` — вынести в отдельный тест-файл (XS, замечание висит вторую неделю).

## Зависимости и риски

- **Блокер сверки:** если `SESSION_B_CHART_LIST_TASK.md` не читается или промпт устарел — сверка невозможна без уточнения у владельца; запросить немедленно, не тратить день на угадывание.
- **P1 — `ritual-day-2026-10-02` в `runPhase: open`:** если не закрыть первым коммитом, вечернее ревью упрётся в третий рецидив паттерна `r2`.
- **P1 — красный тест `@membrana/background-cabinet`:** без диагноза merge в затронутый пакет создаёт необнаруживаемую регрессию; спринт магистрали может потребовать merge в этот пакет.
- **Риск «всё уже в стволе»:** сверка может показать, что кабинетный близнец фактически готов; тогда артефакт дня — архивация, а не код; это не провал, а честный исход.

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-10-03
- [SESSION_B_CHART_LIST_TASK.md](../docs/prompts/SESSION_B_CHART_LIST_TASK.md) — task-промпт магистрали
- [DAY_PLAN.md](../docs/DAY_PLAN.md) — план дня, топ-3 кандидатов
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json) — sources[0], owner-choice@chat/magistral-03-10
- [morning-gates-state.json](../docs/tasks/morning-gates-state.json) — гейт утра, `magistral: chart-list-plugin`
- [DAILY_CODE_REVIEW.md](../docs/DAILY_CODE_REVIEW.md) — вечернее ревью 02.10 (P1-хвосты)