<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-07
  archived-at: 2026-10-07T17:39:41.868Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-07T11:47:26.198Z (yarn main-day-issue@761cc624) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"761cc62436aacf291eecaadd7b4e0a54a572fc2a","digest":"fdd1689d0ec9ea4aa8c07e1ef1de03806439bc579a535bdf4f34ef4af2c6ca4f","versionAt":"2026-10-07T14:43:14+03:00"},"DAILY_STANDUP":{"version":"761cc62436aacf291eecaadd7b4e0a54a572fc2a","digest":"ea094f218998e47c1ff7cbca876702473eaa124bbd1387b41d7c8fd1ce4d903b","versionAt":"2026-10-07T14:43:14+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-07

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа с заморозкой — b3a в ствол, ADR-0031 файлом, триаж CVE |
| `githubIssue` | #2587, #2604 (b3a), #2593 (ADR), #2590 (CVE) |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-07 |

## Магистраль

**`tariff-downgrade-freeze`** — конвейер понижения тарифа с заморозкой буфера. Источник магистрали: `sources[0].claim` из `main-day-assertions.json` (owner-choice@chat/magistral-07-10-manual, 2026-10-07) и `morning-gates-state.json` → `magistral: "tariff-downgrade-freeze"`, `day: "2026-10-07"`. Оба источника владельческие и согласны — расхождения нет; `DAY_PLAN.md` выставил как топ-3 `angelina-hostess-impl / assets-container / chart-list-plugin`, однако это синтез генератора планировщика, тогда как более поздний гейт утра (`magistralChosenAt: 2026-10-07`) и assertions явно несут `tariff-downgrade-freeze`. Гейт свежее — магистраль взята с гейта, assertions согласованы: **расхождение с DAY_PLAN.md зафиксировано** (план назначил топ-3 из реестра, гейт и assertions несут ручной выбор владельца вне топ-3; перечеканка `DAY_PLAN.md` каноном предписана, не сделана — это находка, не блокер).

Состояние на утро: блок 2 (#2588) — b1–b6 в стволе, ждёт выкатки/приёмки b7; блок 1 (#2587) — b0–b3b и b4a в стволе, b4b (#2616) в конвейере. **b3a (#2604) oversized (1041 строк), диффа нет, post-condition `sum(active buffer bytes) ≤ bufferLimitBytes` не верифицирован.** ADR-0031 файлом в стволе отсутствует третий день, несмотря на `ACCEPTED` в sprint-cut. 4 CVE без письменного вердикта runtime/dev.

**Критерий успеха к вечеру:** b4b в стволе (сделано, #2616); b5 — экран подтверждения понижения — в ревью или в стволе; чеклист выкатки составлен, выкатка и живая приёмка — по слову владельца.

## Подкрепление

- **ADR-0031 файлом в ствол** — `docs/adr/ADR-0031-downgrade-archive.md` с вердиктами 1–6 консилиума 05.10 + LGTM Vesnin. Три дня расхождения канон/ствол: код magstral идёт без письменной санкции; каждый следующий merge без ADR в стволе наращивает разрыв. Vesnin ведёт `trace-freeze-d-probe-truth-tooth`.
- **Письменный триаж 4 CVE** — @fastify/busboy ×2, braces, http-cache-semantics: вердикт runtime vs dev по каждому. Dynin ведёт `trace-freeze-b-live-sendsync`. Runtime-находка = стоп следующего merge. Параллельно: проба резака `night-triage-secret-scan.mjs` на одном реальном архиве (вклад в гейт `secret-parser-built`, approaching).

## Перспективные

- Закрытие ADR-0031 файлом откроет честную границу b3a–b5 и позволит возобновить merge в магистраль без документального долга третьего дня; b5 (экран подтверждения понижения в кабинете) не стартует до merge b3a.
- Письменный триаж 4 CVE снимет блокировку по вердикту 6 консилиума и откроет следующий merge в ствол; результат также покроет гейт `secret-parser-built` частично (один датированный проход с манифестом ротации = прохождение approaching).
- Верификация C1/C9 по #2596 (office→cabinet, уже MERGED, 579 строк, диффа нет) раскроет, держит ли граница `background-office → background-cabinet` или «на честном слове»; результат — либо закрытие долга, либо именованный блокер перед b5.

## Экспериментальные

- **Проба резака `night-triage-secret-scan.mjs` на одном реальном session-архиве в режиме «только резак»** — узнаем, режет агрессивно или пропускает граничные паттерны (кристалл `secret-parser-cuts-aggressively`). Dynin.
- **Один датированный проход с манифестом ротации засвеченных ключей на mock-данных** — узнаем, достаточен ли формат манифеста для однозначного сопоставления ключ↔дата ротации; прохождение закрывает амнестию на правку архива.
- **Прогон бэкапа сессии через парсер с проверкой `chat_id` сторожа (ловушка 24.08)** — узнаем, покрыт ли этот класс секретов резаком; несовпадение = находка для расширения `SECRET_PATTERNS`.

## Санитарные

- Триаж четырёх CVE — у Codex с 06.10 (письменный вердикт runtime/dev + зуб на снимок дозора); PR пока нет.
- #2590 (подпись выборки chart-list) — у Codex.
- `.env.example` office: предупреждение о порядке флагов `COLD_ARCHIVE_SWEEP_ENABLED`/`DRY_RUN` (Курёхин) — XS, в b6-приёмку.
- a11y панели «Пользователи кабинета» (Родченко) — к b5/b6.
- #2611 (цепочка миграций кабинета с нуля), #2615 (утверждения об отсутствии в вечернем фидбеке), #2601 (зуб плана), #2584 (ревью) — тулинг, не сегодня.

> **Снято сверкой ведущей 07.10** (генератор перенёс из вечера 06.10, собранного по диффу дня):
> - «ADR-0031 не в стволе» — `docs/adr/ADR-0031-downgrade-archive.md` в origin/main с #2593 (05.10); третий вечер ложный — задача #2615.
> - «b3a (#2604) не влит / diff не раскрыт» — влит 06.10 (c5c01a65) после ревью и проверки ведущей; post-condition под зубом.
> - «C1/C9 по #2596 не верифицированы» — проверено ведущей 05.10 до слияния (HTTP-only клиент; P1 detail в 502 исправлен в fc239c8e).
> - «DAY_PLAN назначил топ-3» — план не назначает магистраль; гейт и assertions несут owner-choice 07.10.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `tariff-downgrade-freeze`, ручной выбор владельца вне топ-3 | сессия | `docs/tasks/main-day-assertions.json` → `sources[0]`, owner-choice@chat/magistral-07-10-manual, author=human | 2026-10-07 |
| Магистраль взята с гейта: `morning-gates-state.json` несёт `magistral: "tariff-downgrade-freeze"`, `day: "2026-10-07"`, `magistralAuthor: "human"` | план/гейт | `docs/tasks/morning-gates-state.json`, `magistralChosenAt: "2026-10-07"` | 2026-10-07 |
| **Расхождение (находка):** `DAY_PLAN.md` назначил магистралью топ-3 (`angelina-hostess-impl / assets-container / chart-list-plugin`); гейт и assertions несут `tariff-downgrade-freeze`; **магистраль взята с гейта, assertions не перечеканены** — перечеканка `DAY_PLAN.md` предписана, не сделана | план (генератор) vs гейт (владелец) | `docs/DAY_PLAN.md` (генератор) vs `morning-gates-state.json` (владелец, позже) | DAY_PLAN: 2026-10-07; гейт: 2026-10-07 |
| b3a (#2604, 1041 строк) oversized, диффа нет, post-condition не верифицирован — merge без раскрытого diff нечестен | код/issue | `docs/DAILY_CODE_REVIEW.md`, коммит `c5c01a65` | 2026-10-06 (вечернее ревью) |
| ADR-0031 `ACCEPTED` в sprint-cut, но файл `docs/adr/ADR-0031-downgrade-archive.md` в стволе отсутствует — 1 источник, 2 отражения (ревью + стендап) | код | `docs/DAILY_CODE_REVIEW.md` + `docs/DAILY_STANDUP.md`, оба от sprint-cut | 2026-10-06 |
| 4 CVE без письменного вердикта runtime/dev — merge следующего блока не может быть честным | issue | `docs/DAILY_CODE_REVIEW.md` раздел Dynin, P1 | 2026-10-06 |
| Стендап подтверждает `tariff-downgrade-freeze` как фокус дня с разбивкой b0–b6 и явным «не стартовать b5 до merge b3a» | план | `docs/DAILY_STANDUP.md` → «Фокус дня», источник фокуса: owner-choice@chat/magistral-07-10-manual | 2026-10-07 |

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| b3a store/preview/freeze не в стволе с раскрытым diff — merge невозможен честно | `git show c5c01a65 -- packages/background-media` (ожидаем diff > 0 строк freeze-логики) | holds (диффа нет по ревью 2026-10-06) |
| `docs/adr/ADR-0031-downgrade-archive.md` не существует в стволе | `file:docs/adr/ADR-0031-downgrade-archive.md` (файл отсутствует) | holds |
| 4 CVE без письменного вердикта runtime/dev — блокируют следующий merge | `file:docs/security/` (файл триажа отсутствует) + issue #2590 (PR нет) | holds |
| C1/C9 по #2596 (office→cabinet) не верифицированы — граница «на честном слове» | `git show 6f87dc45 -- packages/background-office` (diff не раскрыт) | holds |

Развилок нет — все посылки держат, назначение правомерно.

## Сегодня делаем

1. **b4b в стволе** — #2616 влит 07.10 (06325872): оркестратор понижения freeze-first в кабинете.
2. **b5 блока 1 — экран подтверждения понижения в кабинете** (сессия): диалог «оставлено N / заморожено M / ≈X МБ / архив N дней», настройка режима, панель архива узла с кнопкой «вернуть»; успех только после commit, ошибка «тариф не изменён».
3. **Чеклист выкатки** (кабинет + media + office) — по слову владельца: ключ `CABINET_OFFICE_TOKEN` (кабинет, office), `CABINET_API_URL` (office); миграции годны (#2610).
4. **Приёмка блока 2 (b7)** после выкатки: панель → срок у пользователя → уборка в режиме «только показать».

---

## Definition of Done (фокус)

- [x] b4b (#2616) в стволе
- [ ] b5 (экран подтверждения) — PR в ревью или в стволе
- [ ] чеклист выкатки составлен; выкатка — по слову владельца
- [ ] от Codex — триаж CVE и/или #2590 в ревью

---

## Сознательно не делаем сегодня

- **DSP-бенчмарк harmonic/cepstral/flux на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6), повтор не даст новых знаний
- **Смену магистрали на топ-3 реестра** (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) — без нового owner-choice они остаются кандидатами
- **Полноценный пилот бэкапа исторических сессий** — гейт `secret-parser-built` (approaching) не пройден: резак есть только в детекторе паттернов, датированного прохода с манифестом ротации ещё не было
- **Переименование кода (Token→Crystal)** — кристалл `truth-artifacts-called-crystals` распространяется на документы; код переименовывается при переезде на office

## Вторично (если останется время)

- `root:null` в `procedure-runs` при fail-статусе — сделать поле обязательным, убрать слепой ретрай без диагноза; Ozhegov (P2, не блокирует магистраль)
- B6: ritual-счётчик `6564fec3`, проверить exit-код при пустом результате ≠ 0; Dynin (P2)

## Зависимости и риски

- **Блокер 1:** ADR-0031 файлом не в стволе → следующий merge в магистраль идёт без письменной санкции; закрывается сегодня пунктом 2.
- **Блокер 2:** runtime CVE (@fastify/busboy или braces) → если любой вердикт runtime, следующий merge заморожен до устранения; закрывается пунктом 3 триажа.
- **Риск:** b3a oversized (1041 строк) — при раскрытии diff может обнаружиться нарушение post-condition буфера; тогда b3a не идёт в ствол, Vesnin фиксирует именованный блокер, b4/b5/b6 откладываются.
- **Риск:** C1/C9 по #2596 (уже MERGED) — если граница office→cabinet нарушена, исправление потребует нового PR поверх влитого кода; задокументировать как долг, не как ревёрт.

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-10-07
- [DAILY_CODE_REVIEW.md](../docs/DAILY_CODE_REVIEW.md) — вечернее ревью 2026-10-06
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json) — sources[0], owner-choice@chat/magistral-07-10-manual
- [morning-gates-state.json](../docs/tasks/morning-gates-state.json) — magistral: tariff-downgrade-freeze, day: 2026-10-07
- GitHub #2587 (блок 1), #2588 (блок 2), #2593 (ADR-0031), #2596 (office→cabinet), #2599 (панель пользователей), #2603 (sweep-scheduler), #2604 (b3a store/preview/freeze), #2590 (CVE)