<!-- Сгенерировано: 2026-10-05T12:31:17.047Z (yarn main-day-issue@cc60af1d) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"c51bb4a3805fb2aa63699130cc3232dc4c5beee7","digest":"2f8bc0e50890cde050c5eebe54c4b7b4a76bd00e29dad628f8e7f9084d4ddbec","versionAt":"2026-10-04T18:42:49+03:00"},"DAILY_STANDUP":{"version":"c51bb4a3805fb2aa63699130cc3232dc4c5beee7","digest":"13fe544eec596d1f8347eebebca5d05809b1514cc30a9e45e50a2cd583cde7e7","versionAt":"2026-10-04T18:42:49+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-05

<!-- Сгенерировано: 2026-10-05 (yarn main-day-issue) -->
<!-- Источник магистрали: morning-gates-state.json · day=2026-10-04; assertions sources[0] · date=2026-10-04 -->

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `chart-list-plugin` |
| `primaryTitle` | Живая приёмка `chart-list-plugin`: ADR по контракту шины + закрытие хвоста спринта |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-05 |

---

## Магистраль

Спринт `chart-list-plugin-20261003` закрыт живой приёмкой владельца 04.10 (PR #2581, след в трейле), однако архитектурный хвост не урегулирован: отсутствует ADR по контракту шины, без которого Родченко не получает LGTM Тарасова на презентационный компонент. Магистраль дня — зафиксировать этот контракт: Веснин оформляет ADR, Тарасов даёт LGTM, Родченко получает разблокировку. Параллельно — словесно подтвердить P1 Веснина (порядок `sprint:gate` → запись `"status":"pass"` в трейле) и передать ADR в реестр как closure-артефакт спринта.

**Критерий успеха к вечеру:** ADR по контракту шины `chart-list-plugin` принят (LGTM Тарасова), файл влит в `docs/`, Родченко уведомлён о разблокировке; P1 порядкового разрыва (12 мин) закрыт письменным подтверждением.

---

## Подкрепление

- **P0 — проверить #2582 на plain-text секреты:** `git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"` — вывод должен быть пуст; при находке немедленно заводить инцидент. Дынин + Тарасов, выполнить первым делом до любой архитектурной работы.
- **P1 — triage четырёх CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`): письменный вердикт runtime vs dev; при runtime-статусе — P1-блок на merge-очередь до исправления. Дынин, результат фиксируется текстом, не устно.

---

## Перспективные

- ADR по контракту шины разблокирует Родченко: следующий день получает живой презентационный компонент `chart-list-plugin` — UI-слой без сегодняшней архитектурной задолженности.
- Закрытие P0 по секретам в #2582 создаёт чистое основание для прохождения вехи `secret-parser-built`: парсер получит верифицированный кейс и сможет встать в CI-гейт без риска закрепить утечку в архиве.
- Triage CVE даёт письменный реестр runtime-рисков и разблокирует merge-очередь, стоящую за oversized PR (#2562 и другие); после тriage разбор #2562 (`header-badge-narrow`, 406 строк) становится первым из 20 неразобранных.

---

## Экспериментальные

- **Dry-run резака `night-triage-secret-scan.mjs`:** запустить с флагом `--dry-run` и посмотреть, что инструмент вырежет рядом с реальными секретами — не снесёт ли легитимный контент. Узнаём: безопасна ли агрессивная стратегия для кейса #2582 до того, как резак встанет в поток.
- **Один датированный проход манифеста ротации на мок-файле:** подать парсеру синтетический файл с одним засвеченным ключом и проверить, что манифест содержит дату и id. Узнаём: достаточен ли формат манифеста для прохождения гейта `secret-parser-built` прямо сейчас.
- **Верификация #2503 живой проверкой** `yarn ask vesnin --no-context "тест"` — закрыть статус `unknown` утреннего канона; при успехе снять с санитарного списка, при неудаче завести отдельный тикет.

---

## Санитарные

- **P0 первым делом:** `git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"` — проверить #2582 на plain-text секреты (перенос с 04.10, Дынин + Тарасов).
- **Подтвердить порядок** `sprint:gate` → `"status":"pass"` в трейле 04.10: `cat docs/procedure-runs/trail/2026-10-04.jsonl | grep chart-list | jq '.at, .status'`; при порядковой инверсии — завести билет (запрос Веснина из ревью).
- **Triage CVE** `@fastify/busboy` ×2, `braces`, `http-cache-semantics` — runtime vs dev письменно; при runtime → P1-блок до merge (перенос с 04.10, Дынин).
- **Верифицировать #2503** живой проверкой `yarn ask vesnin --no-context "тест"` — закрыть статус `unknown` (Ожегов, перенос).
- **P2 opportunity Родченко:** завести issue «label выборки в UI не следует за сохранённым criterion» (наблюдение Ангелины из ревью 04.10; не блок, но не терять).
- **P2 — дублирующие forecast-записи** в `vesnin.jsonl` (три записи, одна без замера `cut-1`): добавить дедупликацию по `id` или убрать `cut-1`; при агрегации дают тройной счёт.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `chart-list-plugin` | `morning-gates-state.json` · поле `magistral` | `morning-gates-state.json` · `day=2026-10-04`, `magistralAuthor=snapshot` | 2026-10-04 |
| Магистраль — `chart-list-plugin` (тот же выбор) | `main-day-assertions.json` · `sources[0]` | Слово владельца `owner-choice@chat/magistral-04-10` | 2026-10-04 |
| **Расхождение:** `morning-gates-state.json` несёт `magistral` с `day=2026-10-04`; `main-day-assertions.json` несёт `sources[0].date=2026-10-04` — оба владельческие, оба совпадают по значению (`chart-list-plugin`). Расхождение источников формально есть (гейт vs assertions), содержательно нет. **Магистраль взята с гейта, assertions не перечеканены** — перечеканка `main-day-assertions.json` каноном предписана и не сделана. | — | — | — |
| Спринт `chart-list-plugin-20261003` закрыт живой приёмкой 04.10, архитектурный хвост (ADR шины) открыт | `снимок` DAILY_CODE_REVIEW.md 04.10 | `DAILY_CODE_REVIEW.md` · Vesnin-блок | 2026-10-04 |
| ADR по контракту шины блокирует Родченко (1 источник, 2 отражения: стендап + план) | `план` DAY_PLAN.md + `сессия` DAILY_STANDUP.md | `DAY_PLAN.md` (генератор читает реестр) | 2026-10-05 |
| P0 C9 (#2582) и P1 порядковый разрыв — переносы из ревью, требуют закрытия до новых работ | `код`/`снимок` DAILY_CODE_REVIEW.md | `DAILY_CODE_REVIEW.md` · Tarasov-блок | 2026-10-04 |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| ADR по контракту шины `chart-list-plugin` ещё не написан | `file:docs/` — ADR-файл с именем `chart-list-plugin` отсутствует (проверить: `ls docs/adr/ | grep chart-list`) | `unknown` — требует живой проверки в начале дня; если файл существует — посылка нарушена, ADR уже есть, работа переформулируется в LGTM-pass |
| Родченко заблокирован до LGTM Тарасова на форму ADR | `план` DAY_PLAN.md: «Родченко в блоке до LGTM Тарасова на форму ADR по контракту шины» | `holds` — подтверждено планом и стендапом |
| Спринт закрыт по живой приёмке (не гипотетически) | `file:docs/procedure-runs/trail/2026-10-04.jsonl` — запись `"status":"pass"` присутствует | `holds` — подтверждено DAILY_CODE_REVIEW.md (Vesnin-блок) |

---

## Сегодня делаем

1. **P0-проверка #2582:** выполнить `git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"` — вывод пуст или инцидент заведён.
2. **P1-подтверждение порядка:** `cat docs/procedure-runs/trail/2026-10-04.jsonl | grep chart-list | jq '.at, .status'` — порядок корректен или билет заведён.
3. **Triage CVE:** письменный вердикт по `@fastify/busboy` ×2, `braces`, `http-cache-semantics` — runtime vs dev; результат зафиксирован текстом.
4. **Проверить наличие ADR:** `ls docs/adr/ | grep chart-list` — если файла нет, Веснин начинает ADR по контракту шины немедленно.
5. **Веснин оформляет ADR** по контракту шины `chart-list-plugin` (границы, контракт события/команды, пример payload) — черновик готов к LGTM Тарасова.
6. **Тарасов даёт LGTM** на форму ADR; Родченко получает уведомление о разблокировке.
7. **Верификация #2503:** `yarn ask vesnin --no-context "тест"` — статус `unknown` снят или заведён тикет.

---

## Definition of Done (фокус)

- [ ] `git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"` возвращает пустой вывод или инцидент зарегистрирован письменно
- [ ] Порядок `sprint:gate` → `"status":"pass"` в трейле 04.10 подтверждён командой `jq` или заведён билет об инверсии
- [ ] Вердикт по четырём CVE зафиксирован текстом (runtime/dev для каждой); при runtime — P1-блок на merge проставлен
- [ ] ADR по контракту шины `chart-list-plugin` оформлен Весниным и влит в `docs/adr/` (или подтверждено, что файл уже существует)
- [ ] LGTM Тарасова на ADR проставлен
- [ ] Родченко уведомлён о разблокировке (письменно в треде задачи)
- [ ] Статус #2503 закрыт: либо `unknown` снят живой проверкой, либо заведён тикет

---

## Сознательно не делаем сегодня

- **Не берём вторую L-задачу параллельно** (`angelina-hostess-impl`, `assets-container`) — стол не чист: P0 C9 и P1 CVE открыты, расширять фронт до их закрытия запрещено (стендап).
- **Не пишем презентационный компонент `chart-list-plugin`** — Родченко в блоке до LGTM Тарасова на ADR; ADR первичен.
- **Не повторяем DSP-бенчмарк** (harmonic / cepstral / flux) — потолок зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6), без новых данных или fusion повтор ничего не добавит.
- **Не разбираем #2562** (`header-badge-narrow`, 406 строк) — первый из 20 неразобранных PR, но открывается только после закрытия P0/P1 (стендап).
- **Не трогаем эшелон-2 (yamnet) как самостоятельную задачу** — де-факто открыт, F1 0.803 в prod-бенчмарке; следующий шаг только при fusion с trends или новом датасете.

---

## Вторично (если останется время)

- **Dry-run `night-triage-secret-scan.mjs` с `--dry-run`** — проверить, не снесёт ли агрессивный рез легитимный контент рядом с секретом; результат информирует будущий CI-гейт `secret-parser-built`.
- **P2-дедупликация** `vesnin.jsonl`: убрать или пометить `cut-1` (без замера), чтобы при агрегации не давал тройной счёт.

---

## Зависимости и риски

- **Блокер:** P0 C9 (#2582) должен быть закрыт до начала любой архитектурной работы — если в диффе окажутся plain-text пароли, весь день уходит на инцидент-менеджмент.
- **Риск P1:** порядковая инверсия `sprint:gate` → трейл (разрыв 12 мин); вероятно корректна, но без подтверждения — формальный долг ревью Веснина, оставлять открытым нельзя.
- **Риск ADR-посылки:** если ADR по контракту шины уже существует (`ls docs/adr/ | grep chart-list` непуст) — магистраль дня переформулируется в LGTM-pass и уведомление Родченко; трудоёмкость падает, но факт надо проверить в начале дня.
- **Риск CVE runtime:** если хотя бы одна из четырёх CVE окажется runtime — P1-блок на merge-очередь, что задерживает разбор #2562 и потенциально ADR (если ADR идёт отдельным PR).

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-10-05
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — вечернее ревью 04.10 (P0/P1 перенесены)
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня 05.10 (магистраль, подкрепление)
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — источник магистрали (`magistral: "chart-list-plugin"`, `day: "2026-10-04"`)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0]: владелец 04.10, совпадает с гейтом
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6