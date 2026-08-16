<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-16
  archived-at: 2026-08-16T16:31:03.542Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-16T06:15:08.087Z (yarn main-day-issue@2bbb192d) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"54702e15212fe94f3a07e8745e8786ab61d9196d","digest":"639aeb933887254a5c6ef437dc17ea9f7a06cdb99139f7e29c740ab1582d302d"},"DAILY_STANDUP":{"version":"54702e15212fe94f3a07e8745e8786ab61d9196d","digest":"2d3ec32682cef20c75a6c3a5bc551ef50ba59d445e17abbd52984d8597d42bcb"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-16

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `secret-parser-built` (гейт-предикат) |
| `primaryTitle` | Закрыть гейт `secret-parser-built`: подключить резак к сканеру и создать датированный манифест ротации |
| `githubIssue` | — |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-08-16 |

---

## Магистраль

**Расхождение источников — назвать прямо:** `docs/tasks/main-day-assertions.json` (`sources[0]`) несёт магистраль `archivarius-sessions-container` от 14.08. `docs/tasks/morning-gates-state.json` (по стендапу и плану дня) фиксирует сегодняшний гейт `secret-parser-built` как единственный предикат, блокирующий снятие амнистии архива. Правило У1: расхождение не замалчивать. **Магистраль взята с гейта (`morning-gates-state.json`), assertions не перечеканены** — это находка: `main-day-assertions.json` несёт sources[0] трёхдневной давности (14.08), тогда как утренний гейт — волеизъявление владельца сегодняшнего утра (16.08). Спор разрешается свежестью: выбор гейта новее.

Резак `scripts/lib/secret-redact.mjs` существует и покрыт тестами (PR #1252, 18/18). Сканер `night-triage-secret-scan.mjs` его **не вызывает** — детектирует и уходит с non-zero exit, не производя вычищенной копии. Это третий день простоя без технических причин. Критерий успеха к вечеру: сканер завершается с кодом 0 на фикстуре с засвеченным паттерном; `docs/security/rotation-manifest-2026-08-16.md` создан с датированным проходом; гейт `secret-parser-built` помечен `passed` в `morning-gates-state.json`. Только после этого снимается амнистия на правку архива.

---

## Подкрепление

- **Подключить `scripts/lib/secret-redact.mjs` к `night-triage-secret-scan.mjs`** как резак, а не детектор: сканер должен вызывать `redactSecrets()` и отдавать вычищенную копию вместо non-zero exit на обнаружении. Это первое звено критерия прохождения гейта.
- **Создать `docs/security/rotation-manifest-2026-08-16.md`** — датированный проход с перечнем засвеченных ключей к ротации. Это второе звено критерия: доказательство того, что резак отработал на реальном материале, а не только на фикстуре.

---

## Перспективные

- Закрытие гейта `secret-parser-built` снимет амнистию на правку архива — предикат, заблокированный двое суток; открывает чистый старт продуктовой недели.
- Прописка `docs/archivarius/acceptance-2026-08-14.md` в `LIVE_SERVICES` закроет B8-хвост архивариуса и разблокирует продуктовую полосу (`angelina-hostess-impl`, `assets-container`).
- После прохождения гейта: перечеканить `main-day-assertions.json` — привести `sources[0]` в соответствие с сегодняшним волеизъявлением владельца (сейчас несёт 14.08, что и породило сегодняшнее расхождение).

---

## Экспериментальные

- **Запустить `night-triage-secret-scan.mjs` на грязной фикстуре с заглушкой резака** до правки — узнаем, вызывает ли текущий детектор точку подключения `secret-redact.mjs` или падает раньше; это обнажит неожиданную точку сопряжения до изменений в проде.
- **Создать `docs/security/rotation-manifest-2026-08-16.md` с одной строкой-шаблоном** — проверить, принимает ли процедура датированный манифест в этом месте или требует иного пути/формата.
- **Прогнать `ritual:day` сразу после ручного закрытия предыдущего прогона** — узнаем, воспроизводится ли `orphaned`-паттерн при чистом старте или только при наследовании открытого прогона (три дня подряд: 14.08-r2 → 15.08#1 → 15.08-r2).

---

## Санитарные

- Подключить `scripts/lib/secret-redact.mjs` к `night-triage-secret-scan.mjs` (резак, не детектор) — гейт `secret-parser-built` не пройден третий день
- Создать `docs/security/rotation-manifest-2026-08-16.md` — файла нет, датированный проход обязателен по критерию гейта
- Прописать `docs/archivarius/acceptance-2026-08-14.md` в `LIVE_SERVICES` — Веснин, B8-хвост, ~15 мин
- Добавить `aria-live="polite"` на `promo-deny-text` — Родченко, ~10 мин, четвёртый перенос
- Поставить preflight-зуб на открытый прогон в `ritual:day` — паттерн `orphaned` три дня подряд (14.08-r2 → 15.08#1 → 15.08-r2), кандидат в карточку

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Гейт `secret-parser-built` — единственный предикат, блокирующий снятие амнистии архива | гейт | `morning-gates-state.json` (волеизъявление владельца утром) | 2026-08-16 |
| Резак существует и покрыт тестами (PR #1252, 18/18), но не вызывается сканером | код | `scripts/lib/secret-redact.mjs` + `scripts/night-triage-secret-scan.mjs` | 2026-08-03 (wещдок retired-redact-wrong-address) |
| Третий день простоя без технических причин | план + стендап | `docs/DAILY_STANDUP.md` 2026-08-16 | 2026-08-16 |
| Стендап называет гейт «единственным фокусом» | план | `docs/DAILY_STANDUP.md` § Фокус дня | 2026-08-16 |
| **Расхождение: магистраль взята с гейта, assertions не перечеканены** | расхождение источников | `main-day-assertions.json` sources[0] = 14.08 vs `morning-gates-state.json` = 16.08; спор разрешён свежестью | 2026-08-14 / 2026-08-16 |
| `main-day-assertions.json` sources[0] несёт `archivarius-sessions-container` (14.08) — устарел на двое суток | снимок-хардкод | `docs/tasks/main-day-assertions.json` | 2026-08-14 |

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `night-triage-secret-scan.mjs` не вызывает резак: `redactSecrets` / `redact` в теле сканера отсутствует | `symbol:redactSecrets` в `scripts/night-triage-secret-scan.mjs` | `holds` — по вещдоку retired-redact-wrong-address-03-08: 0 вхождений redact в сканере подтверждено; резак живёт в отдельном модуле `scripts/lib/secret-redact.mjs` |
| `docs/security/rotation-manifest-2026-08-16.md` не существует | `file:docs/security/rotation-manifest-2026-08-16.md` | `holds` — файл датирован сегодня, не мог существовать до сегодняшнего прогона |

---

## Сегодня делаем

1. Запустить `night-triage-secret-scan.mjs` на грязной фикстуре — зафиксировать точку подключения до правки.
2. Добавить вызов `redactSecrets()` из `scripts/lib/secret-redact.mjs` в `night-triage-secret-scan.mjs` — сканер производит вычищенную копию вместо non-zero exit.
3. Прогнать сканер на фикстуре с засвеченным паттерном — убедиться, что завершается с кодом 0.
4. Создать `docs/security/rotation-manifest-2026-08-16.md` с датированным проходом и перечнем засвеченных ключей к ротации.
5. Пометить гейт `secret-parser-built` как `passed` в `morning-gates-state.json`.
6. Перечеканить `main-day-assertions.json`: привести `sources[0]` к сегодняшнему волеизъявлению владельца (устранить расхождение, выявленное выше).

---

## Definition of Done (фокус)

- [ ] `night-triage-secret-scan.mjs` вызывает `redactSecrets()` из `scripts/lib/secret-redact.mjs`
- [ ] Сканер завершается с кодом 0 на фикстуре с засвеченным паттерном
- [ ] `docs/security/rotation-manifest-2026-08-16.md` создан, содержит дату прогона и список ключей к ротации
- [ ] Гейт `secret-parser-built` помечен `passed` в `morning-gates-state.json`
- [ ] `main-day-assertions.json` перечеканен: `sources[0].date` = 2026-08-16, расхождение с гейтом устранено
- [ ] Ни один из 18/18 тестов `secret-redact.test.mjs` не сломан после подключения

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — условие входа (`probe`-вердикт, не `unknown`) не выполнено; возвращается завтра.
- **`batch-collection-run-contour`** — берётся после закрытия гейта, чтобы не воспроизводить паттерн параллельного L-блока.
- **DSP-бенчмарки (harmonic / cepstral / flux) на free-v1** — потолок эшелона 0 зафиксирован (trends `DRONE_TIGHT` 95%/30%); повтор без смены датасета или fusion не даёт новой информации.
- **preflight-зуб на `orphaned`-прогон в `ritual:day`** — кандидат в карточку, не в магистраль; три дня воспроизводится, но не блокирует гейт.

---

## Вторично (если останется время)

- Прописать `docs/archivarius/acceptance-2026-08-14.md` в `LIVE_SERVICES` — Веснин, B8-хвост, ~15 мин.
- Добавить `aria-live="polite"` на `promo-deny-text` — Родченко, ~10 мин, четвёртый перенос.

---

## Зависимости и риски

- **Блокер:** резак и сканер имеют неожиданную точку сопряжения — тест на грязной фикстуре до правки обязателен; без него подключение может упасть в рантайме, не в CI.
- **Риск:** `main-day-assertions.json` не перечеканен — расхождение с `morning-gates-state.json` воспроизведётся завтра и снова заблокирует генерацию корректной магистрали.
- **Зависимость:** снятие амнистии архива и открытие продуктовой полосы (`assets-container`, `angelina-hostess-impl`) условны на прохождении гейта сегодня.
- **Наблюдение:** паттерн `orphaned` в `ritual:day` три дня подряд — не блокирует гейт сегодня, но требует карточки до следующей продуктовой недели.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-08-16
- [STRATEGY_DAY.md](docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня, 5 слотов
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — посылки магистрали (требует перечеканки)
- [secret-redact.mjs](scripts/lib/secret-redact.mjs) — резак (PR #1252, 18/18)
- [night-triage-secret-scan.mjs](scripts/night-triage-secret-scan.mjs) — сканер (подключение резака — цель дня)
- [rotation-manifest-2026-08-03.md](docs/security/rotation-manifest-2026-08-03.md) — прецедент датированного прохода (03.08)