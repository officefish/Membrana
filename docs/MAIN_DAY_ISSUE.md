<!-- Сгенерировано: 2026-08-26T08:23:44.455Z (yarn main-day-issue@13bb76c9) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"4f8ce56695bd47c77931d5e4df8824c7a541e967","digest":"792361e3a669edc3e176eb470ed2b53a053645a3b816cdf916b44209fd6eb08e"},"DAILY_STANDUP":{"version":"4f8ce56695bd47c77931d5e4df8824c7a541e967","digest":"464720c992fb440c2dd66e2727eea6b38979634d973c4b69a64a311367723e54"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-26

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `none` (фокус вне реестра: follow-up после приёмки #2110/#2155) |
| `primaryTitle` | Симметрия библиотеки с журналом + play-path выборки (#2177) |
| `githubIssue` | #2177 |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-08-26 |

## Магистраль

**#2177 — симметрия кабинетной библиотеки с контрактом журнала и закрытие дефекта play из выборки.**

Владелец 26.08 утром зафиксировал: сборка выборки на буфере узла принята (#2110/#2155 на проде); дальше не новый L-эпик и не «ещё одна панель», а доводка UX библиотеки до контракта журнала плюс починка найденного дефекта «треки из выборки не играют». Четыре продуктовых требования дня: (1) сайдбар плагинов в правой зоне, (2) тумблеры режима, (3) несхлопываемый waveform, (4) синхрон play со строкой выборки — и воспроизводимый play-path из выборки без регресса витрины.

Критерий успеха к вечеру: либо проверяемый инкремент/PR по #2177 с воспроизводимым play из выборки и стабильной правой зоной плагинов, либо явный remaining gap по каждому из четырёх пунктов + дефекту (без зачёта «на словах витрины»).

## Подкрепление

- Зафиксировать минимальный контракт «библиотека ↔ журнал» (сайдбар / тумблеры / waveform / sync-play) как чеклист приёмки к #2177 — чтобы доводка не расползлась в oversized-витрину.
- Воспроизвести и локализовать дефект «треки из выборки не играют» (буфер узла → строка выборки → audio play-path) до правки UI-симметрии; без зелёного play-path четыре UX-пункта не закрывают день.

## Перспективные

- Проход гейта `secret-parser-built` (резак + датированный манифест ротации) → снятие амнистии на правку архива и безопасные бэкапы сессий.
- Разгрузка media-буфера (~1727 проб) и предикат готовности Firebat → ночное дежурство **пт 28.08**.
- Before/after wall-time по #2113 на field-ленте ≥2500 → формальное закрытие journal-linearization в том же дежурстве.

## Экспериментальные

- Сухой прогон `night-triage-secret-scan.mjs` на 5–10 синтетических фикстурах (без записи): где детектор только помечает, а резак ещё не режет.
- Черновик одного датированного манифеста ротации на 1–2 плейсхолдера (без реального revoke) — минимальный набор полей «датированного» прохода.
- Сверка локального бэкапа сессии «до/после» вырезания в temp против кристалла `session-backup-requires-secret-redaction`.

## Санитарные

- Ревью-долг oversized-PR: #2110 (хвосты), #2157, #2161, #2162, #2168, `50e47045` — вечерний P1, без закрытия копится дрейф.
- #2113 journal-linearization: before/after wall-time по field 23.08 не снят — issue открыт, не магистраль.
- `/health/deep` → `busy` в простое: фикс (PR 2144) в стволе, на проде кабинета ещё нет.
- Токен `@MembranaWatchdog_bot` дважды засвечен — перевыпуск + калибровка `DW_WRITE_RATE_REF` (#2148); горизонт `secret-parser-built`, не продуктовый фокус.
- media-VPS 76 % / буфер 1727 проб · 797 МБ: `docker builder prune` и пары дублей без авто-удаления (#2109).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец 26.08 утром: выборка на буфере узла принята; фокус дня — #2177 (симметрия с журналом + play из выборки), не новый L-эпик | сессия | слово владельца 26.08 (утренний стендап / фокус дня) | 2026-08-26 |
| Четыре требования + дефект play: сайдбар плагинов, тумблеры, несхлопываемый waveform, sync-play со строкой выборки; «треки из выборки не играют» | issue | GitHub #2177 + фиксация в DAILY_STANDUP | 2026-08-26 |
| #2110/#2155 (панель отбора) на проде — база вчерашней магистрали закрыта приёмкой, день сдвигается в follow-up UX | issue / код | приёмка панели отбора, прод | 2026-08-25…26 |
| `sources[0]` assertions всё ещё несёт магистраль 25.08 `sample-library-cabinet-chart-list` — **не** перечеканено под 26.08 | снимок-хардкод | `docs/tasks/main-day-assertions.json` sources[0] | 2026-08-25 |
| **Расхождение У1: магистраль взята с устного/стендап-гейта 26.08 (#2177), assertions не перечеканены** — находка: перечеканка main-day-assertions.json каноном предписана и не сделана | сессия | норма У1 31.07 + standup 26.08 vs assertions 25.08 | 2026-08-26 |
| DAY_PLAN top-3 (angelina-hostess-impl · assets-container · batch-collection-run-contour) — кандидаты генератора, не слово владельца на сегодня | план | `docs/DAY_PLAN.md` (owner-choice ещё не из этого снимка) | 2026-08-26 |
| Горизонт `secret-parser-built` — веха #592, санитария/безопасность, не продуктовая магистраль дня | план | `docs/STRATEGY_DAY.md` / day-horizon.json | 2026-08-26 |

Голоса: **1 источник** (слово владельца 26.08 → #2177) задаёт магистраль; assertions 25.08 и DAY_PLAN top-3 — **другие** владельческие/генераторные срезы, спорят свежестью (У1), не синтезом команды. Стендап и issue #2177 — **1 источник, 2 отражения** одного утреннего выбора. FFT/детекция и L-каркас hostess/assets/batch в магистраль не голосуют (сознательный отказ стендапа).

## Посылки

Развилки A/B нет — посылок не требуется.

Работа дня — доводка и дефект после принятой панели (#2110/#2155), а не утверждение «функционала ещё нет». Маркер «панель отбора отсутствует» был бы **violated** (на проде). Назначение #2177 стоит на приёмке базы + открытом follow-up issue, не на «отсутствии символа».

## Сегодня делаем

1. Воспроизвести дефект «треки из выборки не играют» на кабинетной библиотеке (буфер узла → выборка → play) и зафиксировать минимальный repro-шаг.
2. Починить play-path выборки так, чтобы play со строки выборки был воспроизводим стабильно (не «иногда»).
3. Выровнять правую зону библиотеки под контракт журнала: сайдбар плагинов не пропадает / не ломает layout.
4. Обеспечить тумблеры режима и несхлопываемый waveform при работе с выборкой (без отъезда в новую «витрину»).
5. Синхронизировать play со строкой выборки (подсветка/активная строка ↔ transport).
6. К вечеру: PR/инкремент по #2177 **или** таблица remaining gap по пунктам 1–4 + play (без словесного зачёта).
7. (Процесс) Перечеканить `docs/tasks/main-day-assertions.json` sources[0] под #2177 / 26.08 — закрыть находку У1.

## Definition of Done (фокус)

- [ ] Play из выборки кабинетной библиотеки воспроизводится стабильно (repro до фикса красный → после зелёный).
- [ ] Сайдбар плагинов в библиотеке соответствует контракту журнала (видимость/зона/не ломает waveform).
- [ ] Тумблеры режима доступны и не сбрасывают выборку неявно.
- [ ] Waveform не схлопывается при типовых действиях отбора/play.
- [ ] Sync: активная строка выборки ↔ play-состояние согласованы.
- [ ] Нет регресса серверной витрины `membrana.showcase.library-chart-list` / сборки выборки с буфера узла.
- [ ] В #2177 или PR — проверяемый след (что сделано / что remaining), без «витрина на словах».
- [ ] Assertions sources[0] либо перечеканены под 26.08, либо явный remaining gap «assertions stale» в вечерней руке.

## Сознательно не делаем сегодня

- Не назначаем магистралью `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` и не синтезируем top-3 из DAY_PLAN.
- Не поднимаем «Этап 1.A» / benchmark harmonic+cepstral+flux / повторную FFT-калибровку free-v1; не primary из `detector-scoreboard`.
- Не закрываем #2113 и не зачитываем linearize hot-path без before/after wall-time на field-ленте.
- Secret-parser / ротация токена / правка архива — горизонт и санитария, не продуктовая магистраль; без правки архива в обход гейта.
- Не раздуваем день ревью-долгом oversized (#2110 хвосты, #2157, #2161, #2162, #2168, `50e47045`) и L-осями logging/Sentry/Firebat как «единственным фокусом».
- Не открываем новый L-эпик «ещё одна панель библиотеки» поверх принятой #2110/#2155.

## Вторично (если останется время)

1. Точечный срез ревью-долга по одному oversized-хвосту, только если блокирует merge/приёмку #2177.
2. Черновик полей манифеста ротации (без revoke) — подготовка к гейту `secret-parser-built`, не подмена магистрали.

## Зависимости и риски

- **Риск:** уйти в oversized-витрину вместо четырёх требований + play — главный риск дня (слова стендапа).
- **Блокер play-path:** если audio/transport завязан на другой источник (журнал vs выборка), UI-симметрия без починки path не закрывает DoD.
- **Assertions stale (У1):** probe/генератор могут читать вчерашний sources[0] — перечеканка обязательна, иначе завтрашний ритуал снова разъедется.
- **Не блокер, но шум:** media-VPS 76 % и secret-horizon отвлекают; держать в санитарных/вторичных.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md) — фокус дня #2177, слово владельца 26.08
- [docs/DAY_PLAN.md](./DAY_PLAN.md) — top-3 кандидаты (не выбранные магистралью)
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md) — веха `secret-parser-built`
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json) — sources[0] ещё 25.08 (stale относительно гейта)
- GitHub #2177 — симметрия библиотеки с журналом + play выборки
- GitHub #2110 / #2155 — принятая панель отбора (база)