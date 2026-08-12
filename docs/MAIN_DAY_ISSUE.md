<!-- Сгенерировано: 2026-08-12T12:08:12.462Z (yarn main-day-issue@bffa7d15) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"bffa7d15010cdc0ea9c011b22d274dd1d954ad56","digest":"5c36430867a9153edb1e8e493db90731eb6104cee25daf5ba9382b72442c9c4a"},"DAILY_STANDUP":{"version":"bffa7d15010cdc0ea9c011b22d274dd1d954ad56","digest":"67ed797e47083ab35078b5489a3f7fdb9f1a228dfef0c1f9aa08074baecfd0d5"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: worktrees-align-snapshot-guard, dreams-models-liveness, openrouter-default-model-unverified, static-mmbrn-live-inventory, tariff-concurrent-move-reason, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, swallow-own-moment, morning-gates-two-moments, tariff-promo-server-wiring, recreate-execution-procedure-interface, corpus-track-acceptance-predicate, gate-stale-supersede-by-recut, gate-honest-pair-completeness, workflow-examples-marathon, detectors-window-single-carrier, ritual-magistral-source-freshness, detectors-judge-whole-record, subconscious-lift-c3, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, forecast-archive-wire, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, mfcc-lib-choice, network-container, night-triage-insight-channel, archivarius-sessions-container, adr-procedure-legalize, insight-mandate-for-new, insight-review-from-file, cascade-honest-manual, dreams-deploy-office, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-12

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-promo-server-wiring` |
| `primaryTitle` | Подключить серверный провод тарифной промо-логики |
| `githubIssue` | — |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-08-12 |

---

## Магистраль

**`tariff-promo-server-wiring`** — подключить серверную сторону тарифной промо-логики (провод `decideTransition` / тарифного сервиса к серверным функциям).

Магистраль взята с гейта (`docs/tasks/morning-gates-state.json`, `"magistral": "tariff-promo-server-wiring"`, `"day": "2026-08-12"`). Это волеизъявление владельца, более позднее, чем `sources[0]` в `main-day-assertions.json` (там — `angelina-hostess-impl`, выбор 11.08). Расхождение фиксируется открыто (см. таблицу обоснования): **магистраль взята с гейта, assertions не перечеканены** — это находка, не замалчивание; перечеканка `main-day-assertions.json` каноном предписана и на момент генерации не сделана.

Критерий успеха к вечеру: серверная функция тарифного провода вызывается из клиентского контура без ручного обхода; вечерний протокол команды содержит живой trace вызова `decideTransition` (или эквивалентного точки входа) — не заглушку, не статический ответ.

---

## Подкрепление

- **`ritual-magistral-source-freshness`** — перечеканить `main-day-assertions.json` под гейт 12.08 (`tariff-promo-server-wiring`); без этого завтра генератор снова прочитает `angelina-hostess-impl` (assertions от 11.08) и подкормит фантомный выбор вместо сегодняшней магистрали — тот же класс поломки, что уронил фокус трижды за неделю.
- **`morning-gates-two-moments`** — зафиксировать два момента утреннего гейта по ADR-0024: сначала заморозка снимка, затем выбор владельца; без честного gate-момента `morning-gates-state.json` будет снова расходиться с `assertions` молча, а расхождение обнаруживаться только в MAIN_DAY_ISSUE постфактум.

---

## Перспективные

- Закрытие `angelina-hostess-impl`: превратить hostess-контракт Ангелины в вызываемый модуль — задача остаётся P1 и переходит магистралью следующего дня после закрытия сегодняшней.
- Продвижение `archivarius-sessions-container` (L): цепочка «резак → бэкап → хранилище» не замкнута; кристалл `session-backup-requires-secret-redaction` требует этого контейнера, веха `secret-parser-built` стоит.
- Trends `DRONE_TIGHT` → curated-продвижение (`trends-drone-tight-curated-promotion`): результат 95%/30% готов, внедрение в каталог template-match не начато; снять после разблокировки продуктовой полосы.

---

## Экспериментальные

- **Парсер секретов как резак — smoke-тест на фикстуре**: создать файл с тремя паттернами ключей, прогнать `night-triage-secret-scan.mjs` + `secret-redact.mjs`, убедиться, что режет, а не только детектирует — закроет остаток гейта `secret-parser-built` (предикат `amnestyLifted`).
- **Память процедур «показывается, не запрашивается»**: в одном фрейме ритуала подставить последние 3 записи журнала без запроса подтверждения — проверить, достаточно ли контекста для осмысленного продолжения без явного ввода (`insight:insight-procedure-memory-shown-not-asked`).
- **Портфель шотов всплывает в момент решения**: при следующем owner-choice отобразить форкаст↔факт предыдущих выборов рядом со снимком кандидатов — проверить, меняет ли это скорость выбора (`insight:insight-one-shot-portfolio-surfacing`).

---

## Санитарные

- Перечеканить `main-day-assertions.json` под гейт 12.08 (`tariff-promo-server-wiring`) — расхождение живёт открыто с момента генерации этого файла.
- Вынести порог `133` в единый источник: убрать дублирование между `package.json` и `ci.yml` (P2-наблюдение Vesnin из ревью 11.08).
- Проверить факт закрытия GitHub-issues #1764, #1447, #1422, #1272, #554, отмеченных `githubIssueClosedAt` в реестре.
- Повердиктить 9 мёртвых душ и отправить в `task:archive` со свидетельством (в т.ч. `detectors-window-single-carrier`, commit `07928a67`).
- Завести карточку `sprint-experience-dead-ends-after-recut` (`yarn task:create --id sprint-experience-dead-ends-after-recut --size S`) — зуб в `debt-ledger.jsonl` есть, реестра нет.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль дня — `tariff-promo-server-wiring` | гейт | `docs/tasks/morning-gates-state.json` (`"magistral"`, `"day": "2026-08-12"`) | 2026-08-12 |
| `sources[0]` в assertions несёт `angelina-hostess-impl` (выбор 11.08) | снимок-хардкод | `docs/tasks/main-day-assertions.json`, поле `sources[0].date` | 2026-08-11 |
| **Расхождение**: магистраль взята с гейта, assertions не перечеканены | — | Сравнение двух владельческих источников; спор решается свежестью (гейт 12.08 > assertions 11.08) | 2026-08-12 |
| `tariff-promo-server-wiring` присутствует в `frozenOptions` гейта | гейт | `docs/tasks/morning-gates-state.json`, `magistralOptions[]` | 2026-08-12 |
| `decideTransition` упоминается в ревью 11.08 как провод, который «сделан и влит» — но примечание `//corrections-08-08` в assertions фиксирует прецедент ошибочного «уже влито»; требует проверки маркером до старта | код / ревью | `docs/DAILY_CODE_REVIEW.md` 11.08 + `main-day-assertions.json //corrections-08-08` | 2026-08-11 |
| Форсайт продуктовой полосы: S2→S3→S4→S5; тарифный провод лежит на пути S3/S4 | план | `docs/STRATEGY_DAY.md`, горизонт #592 | 2026-08-12 |

> 1 источник (гейт 12.08) — владельческое, самое свежее. Assertions (11.08) — тоже владельческое, но на сутки старше. Синтез запрещён; расхождение — находка, не ошибка генератора.

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| Серверная функция тарифного провода не вызывается из клиентского контура штатно (проход требует ручного обхода) | `symbol:tariffPromoServerWiring` в `packages/**/src/**` | **unknown** — маркер не прогонялся; первый шаг дня: `yarn main-day-probe`, зафиксировать вердикт письменно до первой строки кода |

> Если `yarn main-day-probe` вернёт `violated` (символ уже существует) — остановиться, выдать диагноз, поднять расхождение реестра как находку, не начинать работу вслепую.

---

## Сегодня делаем

1. Запустить `yarn main-day-probe` до первой строки кода; зафиксировать вердикт по маркеру `tariff-promo-server-wiring` письменно (holds / violated / unknown).
2. Если `holds` — реализовать серверную функцию тарифного провода (`decideTransition` или эквивалент точки входа); подключить к клиентскому контуру.
3. Если `violated` — выдать письменный диагноз: что уже существует, где живёт, почему реестр не обновлён; поднять расхождение как P1-находку.
4. Перечеканить `main-day-assertions.json` под гейт 12.08 (`tariff-promo-server-wiring`) — закрыть расхождение с `morning-gates-state.json`.
5. Зафиксировать live trace вызова в вечернем протоколе команды (не заглушку).
6. Повердиктить 9 мёртвых душ → `task:archive` (санитарный, параллельно).

---

## Definition of Done (фокус)

- [ ] `yarn main-day-probe` прогнан до старта; вердикт зафиксирован письменно.
- [ ] Серверная функция тарифного провода вызывается из клиентского контура без ручного обхода (или выдан письменный диагноз блокера при `violated`).
- [ ] Вечерний протокол содержит живой trace вызова `decideTransition` (или эквивалентной точки входа) — не статический текст.
- [ ] `main-day-assertions.json` перечеканен под гейт 12.08; расхождение с `morning-gates-state.json` закрыто.
- [ ] PR открыт, CI зелёный (или письменная причина, почему CI красный и это ожидаемо).
- [ ] `docs/tasks/README.md` синхронизирован с `registry.json` (если статус карточки изменился).

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — была `sources[0]`, но гейт 12.08 сделан позже (11.08 → 12.08); переходит магистралью следующего дня.
- **`archivarius-sessions-container` (L)** — второй L-блок в один день без owner-choice; кандидат завтра.
- **Точечное ревью 9 oversized PR** (#1785, #1789, #1801 + шесть из ревью 11.08) — P1-риск зафиксирован, разрыв контекста магистрали дороже; очередь после закрытия провода.
- **`worktrees-align` (#1864), мутирующий `--apply`** — ждёт owner-гейта.
- **DSP/FFT-бенчмарки на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS` §6), повтор без смены датасета или fusion не даёт новой информации.
- **Trends DRONE_TIGHT → curated-продвижение** — перспективный вектор, не сегодня.

---

## Вторично (если останется время)

- Smoke-тест парсера секретов на фикстуре (три паттерна ключей → `secret-redact.mjs`) — закрыть остаток гейта `secret-parser-built`.
- Завести карточку `sprint-experience-dead-ends-after-recut` (`yarn task:create --id sprint-experience-dead-ends-after-recut --size S`).

---

## Зависимости и риски

- **Блокер**: `yarn main-day-probe` может вернуть `violated` — тогда вместо реализации нужен диагноз и подъём расхождения реестра; день уходит на audit, а не на провод.
- **Риск расхождения assertions**: `main-day-assertions.json` несёт `angelina-hostess-impl` (11.08), гейт несёт `tariff-promo-server-wiring` (12.08); если перечеканка не сделана до вечера, завтра генератор снова прочитает фантомную магистраль.
- **Ночной гейт (cron 03:00 UTC)**: первый боевой прогон зафиксирован в ревью 11.08 как живой риск — мониторить утром 13.08.
- **Oversized PR-хвост**: 9 из 24 коммитов ревью 11.08 не развёрнуты; могут нести скрытые P1 — не блокируют сегодня, но риск накапливается.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-08-12
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — источник магистрали (гейт 12.08)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — assertions (sources[0]: angelina-hostess-impl, 11.08; расхождение открыто)
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — ревью 11.08
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6