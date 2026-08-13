<!-- Сгенерировано: 2026-08-13T10:38:21.735Z (yarn main-day-issue@e5a7b3b1) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"a431fc27855e077bf9055870e9772bdf50bdf266","digest":"7805e24124f07905e98e3631c8eccf2449b72d88a0562c96200886d5fe8c7681"},"DAILY_STANDUP":{"version":"a431fc27855e077bf9055870e9772bdf50bdf266","digest":"da4bf0ae50b097747021b368bd5acc31219975f0e917a1e9b81eb157a0d63e7a"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: static-mmbrn-live-inventory, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, network-container, archivarius-sessions-container, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-13

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `archivarius-sessions-container` |
| `primaryTitle` | Archivarius Sessions Container — Mongo office, адресуемые span, ingest/search с секрет-маской |
| `githubIssue` | #1330 |
| `size` | L |
| `promptPath` | docs/prompts/archivarius-sessions-container_PROMPT.md |
| `сгенерировано` | 2026-08-13 |

---

## Магистраль

**`archivarius-sessions-container` (L, #1330)** — контейнер сессий Archivarius: Mongo office, адресуемые span, ingest/search с секрет-маской.

Магистраль взята из `sources[0]` файла `main-day-assertions.json` — прямой выбор владельца от 13.08.2026, сделанный из замороженного снимка топ-3 (angelina-hostess-impl / archivarius-sessions-container / mfcc-compare-sprint). Контейнер сессий закрывает инфраструктурный пробел, на котором лежит веха `secret-parser-built`: ночной триаж (#1889) влит, стык с бэкапом вскрыт, но поток сессий по-прежнему архивируется вручную без единой структуры. Сегодня строим минимальный вызываемый слой: ingest-эндпоинт, схему span с секрет-маской, базовый search. Критерий успеха к вечеру: вечерний протокол команды содержит живой trace вызова ingest-эндпоинта с реальным span (не статический текст) **или** письменный диагноз блокера с PR и объяснением почему trace заблокирован.

**Расхождение источников (норма У1, 31.07):** `docs/DAILY_STANDUP.md` называет магистралью `angelina-hostess-impl` (рекомендация тимлида третий день подряд), тогда как `sources[0]` в `main-day-assertions.json` несёт `archivarius-sessions-container` — выбор владельца от 13.08. Спор решается свежестью и прямым волеизъявлением: оба источника владельческие, но `sources[0]` — позднейшее зафиксированное слово владельца этого же утра. Магистраль взята с assertions, расхождение не замалчивается.

---

## Подкрепление

- **`yarn main-day-probe` до первой строки кода + перечеканка `main-day-assertions.json`** — третий день подряд магистраль стартовала с `unknown` посылкой; пока probe не отдаёт письменный вердикт `holds`, owner-choice 13.08 не подтверждён инструментально и assertions снова разъедутся с гейтом к вечеру. Запустить, получить вердикт, зафиксировать письменно.
- **`yarn code-review:pr 1445` + `yarn code-review:pr 1761`** — три oversized PR (#1445/485 строк, #1761/583, `29ee6b29`/855) без развёрнутого ревью третий день; они в зоне магистрали (archivarius + провод тарифа), и скрытый C1 в них проявится в фундаменте `archivarius-sessions-container`. Закрыть оба ревью до старта кода как preflight магистрали.

---

## Перспективные

- Закрытие ревью-долга трёх oversized PR (#1445, #1761, `29ee6b29`) разморозит merge-гейт и позволит принимать новые PR без накопленного риска регресса в архивной зоне.
- После живого trace ingest/search `archivarius-sessions-container` станет основанием для перехода к `archivarius-mongo-backup` (#1714): том несёт 106К спанов, и контейнер — естественный следующий шаг к резервированию.
- Разморозка `mfcc-compare-sprint` (Тимлид ведёт по реестру) после письменного вердикта `mfcc-lib-choice` откроет сравнительный бенчмарк и продвинет детекционный контур без повтора free-v1 DSP.

---

## Экспериментальные

- **Проба секрет-маски ingest на синтетическом токене:** запустить ingest с тест-span, содержащим паттерн из `SECRET_PATTERNS` в `night-triage-secret-scan.mjs`, — проверить, что span уходит в Mongo уже с маской, а не с сырым значением (критерий вехи `secret-parser-built`, пункт (в)).
- **Проба `yarn main-day-probe` как исполняемого скрипта:** проверить наличие команды в `package.json` корня — выяснить, можно ли выполнить норму «прогнать до первой строки» или гейт декларативен без тела (расхождение три дня подряд может объясняться именно отсутствием исполняемого тела).
- **Проба адресуемости span по uuid:** после ingest сделать search по uuid нового span — убедиться, что контейнер возвращает именно его, а не весь дамп (минимальная проверка адресуемости как контрактного свойства).

---

## Санитарные

- Перечеканить `main-day-assertions.json` через гейт под магистраль 13.08 — третий день assertions разъезжаются с owner-choice; перечеканка только после письменного вердикта `yarn main-day-probe`.
- Заполнить `archiveNotes` в `fix-node-modules-links-1647.md` свидетельством PR #1875 — поле `"—"` нарушает норму #1744 (P2, фидбек Ожегова).
- A11y-проход по форме промокода в `MembranePage.tsx`: label для input и live-region для `promoDenyText` — диффа нет, UI сдан без проверки (Родченко).
- Вынести синхронизацию `docs/tasks/README.md` в hook `task:archive` — сегодня sync шёл отдельным коммитом post-factum, дрейф воспроизводится.
- Закрыть ревью-долг: `yarn code-review:pr 1445` и `yarn code-review:pr 1761` — три oversized PR (#1445/485, #1761/583, `29ee6b29`/855) без merge-гейта третий день.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `archivarius-sessions-container` (L, #1330): выбор владельца из замороженного снимка топ-3 | `sources[0]` в `main-day-assertions.json` | owner-choice@chat/magistral-13-08 | 2026-08-13 |
| Снимок топ-3 перезаморожен с продуктовой строкой (mfcc-compare-sprint вместо assets-container) по сигналу агента о границе мета-дрейфа (соглашение 28.07) | `frozenOptions` в `sources[0]` | owner-choice@chat/magistral-13-08 | 2026-08-13 |
| Hostess (рекомендация тимлида) сознательно уступила контейнеру сессий словом владельца | `sources[0]`, поле claim | owner-choice@chat/magistral-13-08 | 2026-08-13 |
| Веха `secret-parser-built` лежит на контейнере сессий; ночной триаж (#1889) влит, стык с бэкапом вскрыт | `docs/STRATEGY_DAY.md`, кристалл `session-backup-requires-secret-redaction` | day-horizon.json + truth/registry.json | 2026-08-13 / 2026-07-17 |
| Стендап называет магистралью `angelina-hostess-impl` — **расхождение**: магистраль взята с assertions, не со стендапа; assertions не перечеканены под выбор гейта | `docs/DAILY_STANDUP.md` | standup-generator@e5a7b3b1 | 2026-08-13 |

**1 первоисточник** (owner-choice@chat/magistral-13-08), 3 строки таблицы — прямые следствия одного выбора, не независимые голоса. Стендап — отдельный источник, но младший: он отражает рекомендацию тимлида, а не слово владельца этого утра.

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Ingest-эндпоинт контейнера сессий не существует | `symbol:sessionIngest` в `packages/**/src/**` | unknown — требует `yarn main-day-probe` |
| Схема span с секрет-маской не описана | `file:packages/services/archivarius/src/sessions/span-schema.ts` | unknown — требует `yarn main-day-probe` |
| Search по span uuid не реализован | `symbol:searchSpan` в `packages/**/src/**` | unknown — требует `yarn main-day-probe` |

> Все три посылки имеют вердикт `unknown` до прогона `yarn main-day-probe`. Работа назначается условно: если probe даст `violated` по любой из них — фиксируем как находку (реестр протух) и поднимаем P1 до старта кода.

---

## Сегодня делаем

1. Запустить `yarn main-day-probe`, получить письменный вердикт `holds`/`violated`/`unknown` по каждой посылке — зафиксировать в протоколе до первой строки кода.
2. Закрыть ревью-долг: `yarn code-review:pr 1445` и `yarn code-review:pr 1761` — вердикты письменно, merge-гейт формально закрыт.
3. При `holds` по posylkam — реализовать ingest-эндпоинт (`sessionIngest`) с приёмом span и записью в Mongo office; секрет-маска подключается из `scripts/lib/secret-redact.mjs`.
4. Описать схему span (uuid, timestamp, sessionId, payload, maskedPayload) в `packages/services/archivarius/src/sessions/span-schema.ts`.
5. Реализовать `searchSpan` по uuid — минимальный поиск, возвращающий один span.
6. Прогнать ingest с синтетическим span (включая тест-токен) — убедиться в живом trace в вечернем протоколе.
7. Перечеканить `main-day-assertions.json` под магистраль 13.08 после письменного вердикта probe.

---

## Definition of Done (фокус)

- [ ] `yarn main-day-probe` отдаёт письменный вердикт по каждой посылке до первой строки кода
- [ ] `yarn code-review:pr 1445` и `yarn code-review:pr 1761` закрыты с письменными вердиктами
- [ ] `sessionIngest`-эндпоинт принимает span, пишет в Mongo office с секрет-маской
- [ ] `span-schema.ts` описывает поля uuid / timestamp / sessionId / payload / maskedPayload
- [ ] `searchSpan` возвращает span по uuid из Mongo
- [ ] Вечерний протокол команды содержит живой trace вызова ingest с реальным span **или** письменный диагноз блокера с PR
- [ ] `main-day-assertions.json` перечеканен под магистраль 13.08 (после вердикта probe, не до)

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl` (L)** — тимлид рекомендовал третий день подряд; владелец сознательно уступил контейнеру сессий словом 13.08. Возвращается завтра с probe-вердиктом как условием входа.
- **`assets-container` (L)** — весомый кандидат, но два L-блока без завершённой магистрали третий день подряд накапливают незакрытый долг; берётся после письменного вердикта по `archivarius-sessions-container`.
- **DSP-бенчмарки и trends `DRONE_TIGHT` → curated-продвижение** — потолок эшелона 0 зафиксирован (FFT_METRICS §6), повтор без смены датасета или fusion не даёт новой информации.
- **`#1786` (дедуп advisories), `#1838` (буферизация restore), `#1862` (ложные missing в scripts:registry)** — P2/технический долг; не блокируют магистраль сегодня, идут в очередь.
- **Перечеканка `main-day-assertions.json` до вердикта probe** — запрещена: без живого trace перечеканка снова зафиксирует фантомную посылку.

---

## Вторично (если останется время)

- Заполнить `archiveNotes` в `fix-node-modules-links-1647.md` свидетельством PR #1875 (P2, Ожегов, норма #1744).
- A11y-проход по форме промокода в `MembranePage.tsx`: label для input и live-region для `promoDenyText` (Родченко, диффа нет).

---

## Зависимости и риски

- **Блокер 1:** `yarn main-day-probe` может не существовать как исполняемый скрипт — три дня `unknown` могут объясняться именно этим; проверить наличие в `package.json` до старта, иначе вердикт probe невозможен.
- **Блокер 2:** oversized PR #1761 (tariff-promo-server-wiring, 583 строки) пересекается с Mongo-проводом archivarius — скрытый C1 в нём может блокировать ingest-слой; ревью обязательно до кода.
- **Риск:** секрет-маска из `scripts/lib/secret-redact.mjs` должна быть доступна из пакета `archivarius` без нарушения границ монорепо — проверить импортный путь до реализации ingest-эндпоинта.
- **Риск:** `main-day-assertions.json` не перечеканен под 13.08 — если probe запустится с посылками прошлых дней, вердикт будет некорректным; перечеканка — первый шаг после вердикта, не параллельно.

---

## Ссылки

- [docs/DAILY_STANDUP.md](../DAILY_STANDUP.md) — стендап дня (входной документ)
- [docs/tasks/main-day-assertions.json](../tasks/main-day-assertions.json) — sources[0]: owner-choice@chat/magistral-13-08
- [docs/STRATEGY_DAY.md](../STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`
- [GitHub Issue #1330](https://github.com/membrana/membrana/issues/1330) — archivarius-sessions-container
- [docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md](../prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — §6: потолок эшелона 0, почему DSP-бенчмарки не магистраль