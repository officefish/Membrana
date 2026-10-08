<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-08
  archived-at: 2026-10-08T21:12:22.813Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-08T10:55:49.188Z (yarn main-day-issue@0bd77841) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"d75f76cd9dc7851977442b0498fe1a117be10b5e","digest":"f3e4b5631a0008977e19a9fd020a279d4d6565ca9154343b31425980e0373982","versionAt":"2026-10-07T20:39:15+03:00"},"DAILY_STANDUP":{"version":"d75f76cd9dc7851977442b0498fe1a117be10b5e","digest":"7b1ee9e224bb9481f339820f11a6c8e781b543c7a265f0af97ba065127e842d1","versionAt":"2026-10-07T20:39:15+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-08

<!-- Сгенерировано: 2026-10-08 (yarn main-day-issue · Tarasov) -->
<!-- Тип: центральная задача дня -->
<!-- Источник магистрали: morning-gates-state.json · magistral=tariff-downgrade-freeze · day=2026-10-08 · author=human -->
<!-- Расхождение: assertions sources[0].claim называет ту же задачу (07.10), гейт дублирует — перечеканка assertions не выполнена -->

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа с заморозкой: доводка после живой приёмки |
| `githubIssue` | #2628 / #2629 (зонтики #2587 / #2588) |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-10-08 |

---

## Магистраль

Магистраль дня — **`tariff-downgrade-freeze`: доводка после живой приёмки**. Выбрана владельцем 08.10 вручную, вне снимка топ-3 (`yarn morning:gate magistral --choose tariff-downgrade-freeze --author human`).

> **Правка ведущей 08.10.** Генератор собрал раздел по утреннему состоянию 07.10: «b4b не слит», «b5 не реализован», «приёмки не было». Это ложно. Ниже факты, сверенные со стволом и прод-базой; класс дефекта — #2615.

**Состояние на утро 08.10 (сверено):**
- Код обоих блоков в стволе: b4b #2616, экран подтверждения b5 #2618, возврат из архива #2620/#2621 (#2619 закрыт), прод-фикс отбора #2627 (c3edbdcf).
- Выкатка 07.10: media + cabinet + office + фронт панели @758ca82a; повторно media + cabinet @c3edbdcf. Двери проверены живьём.
- Живая приёмка 07.10 (september, Наблюдательный пункт → Блокпост):
  - шаг 1 — срок хранения 1 день записан из панели;
  - шаг 2 — первая проба заморозила 8359 из 8360 (партия 06d49eec), владелец вернул партию кнопкой → `restored`;
  - после фикса повторная проба: keep 4379, freeze 3981 (≈1.93 ГБ), партия 160dba7f `frozen`, `expiresAt` 2026-10-08 17:28 UTC (20:28 МСК).
- Замер: предпросмотр 65 с, заморозка 60 с, смена тарифа 60 с.

**Критерий успеха к вечеру:** #2628 и #2629 в стволе и выкачены; холостой прогон уборки после 20:28 МСК показывает ровно партию 160dba7f; решение владельца по самой уборке.

---

## Подкрепление

- **CVE `@fastify/busboy` (#2623):** две runtime-уязвимости в media (триаж #2625). Правка lockfile — рукой владельца: `yarn up -R @fastify/busboy`; агент `yarn install` не запускает.
- **Триаж CVE, пятая позиция:** `sharp` (GHSA-wq5f-xc86-pv6w) появилась в снимке дозора 07.10 — добавить строку в `docs/security/cve-triage-*.md` (кандидат для Codex).

---

## Перспективные

- Индикатор хода и итог «тариф изменён, в архив ушло N» превратят понижение из «минуты тишины» в понятный пользователю шаг.
- Кэш признаков измерителя (развилка ADR-0031) снимет 60-секундный предпросмотр на больших буферах.

---

## Экспериментальные

- **Проба таймаута:** замерить, где первым оборвётся запрос cabinet→media при буфере больше 8360 записей (прокси, клиент, Caddy) — узнаем запас до обрыва.
- **Проба уборки вхолостую на живой партии:** первый dry-run на реальной просроченной партии — узнаем, совпадает ли список кандидатов с партией 160dba7f один в один.

---

## Санитарные

- Строка «не измерено» в окне считает неизмеримые, а причина 07.10 — записи без ранга; формулировка в ADR-0031 р.6 и #2626 неточна (#2629).
- `.env.example` office: порядок флагов `COLD_ARCHIVE_SWEEP_ENABLED` / `DRY_RUN` с предупреждением (XS, Курёхин).
- `useDowngradeArchive`: ошибка загрузки глотается без следа (P2, Ожегов).
- Перечеканка `main-day-assertions.json` под 08.10.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — выбор владельца вне топ-3 | гейт утра | `morning:gate magistral --author human`, 08.10 | 2026-10-08 |
| Весь код блоков 1 и 2 в стволе и выкачен | ствол / выкатка | #2616, #2618, #2620, #2621, #2627; прогоны deploy:run 07.10 pass | 2026-10-07 |
| Приёмка вскрыла UX-дефект (минута без отклика) и неточную причину | прод-лог media, прод-база | #2628, #2629 | 2026-10-07 |
| Партия 160dba7f истекает 08.10 20:28 МСК | прод-база media | `DowngradeArchiveBatch.expiresAt` | 2026-10-07 |
| Топ-3 стендапа (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) — ранг реестра, не выбор | стендап | `docs/DAILY_STANDUP.md` | 2026-10-08 |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Окно понижения молчит минуту и закрывается без итога | прод-лог media: preview 65457 мс, freeze 59944 мс; снимок владельца 07.10 | holds |
| Подпись «не измерено» не отражает причину 07.10 | `downgrade-archive.service.ts`: `unmeasured = rows - measured`; на буфере september = 0 | holds |
| Уборка в office выключена по умолчанию | флаги `COLD_ARCHIVE_SWEEP_ENABLED` выключены; ADR-0031 «выключено = тишина» | holds |
| busboy в lockfile = 3.2.0 | `yarn.lock`, триаж #2625 | holds |

Развилки нет — работа назначается.

---

## Сегодня делаем

1. #2628: индикатор хода в окне понижения и итог «тариф изменён, в архив ушло N»; проверить таймауты cabinet→media.
2. #2629: формулировка причины в ADR-0031 р.6 и #2626 («без ранга»); подпись в окне; порча — буфер, где все измерены, но ранжирована часть.
3. Выкатка #2628/#2629 по слову владельца.
4. После 20:28 МСК — холостой прогон уборки на партии 160dba7f; сама уборка — слово владельца.
5. Владелец: `yarn up -R @fastify/busboy` (#2623).

---

## Definition of Done (фокус)

- [ ] #2628 в стволе: индикатор + итог после подтверждения; тест.
- [ ] #2629 в стволе: ADR-0031 р.6 и подпись окна поправлены; порча зелёная.
- [ ] Выкатка media/cabinet с этими правками, двери проверены живьём.
- [ ] Холостой прогон уборки показал ровно партию 160dba7f.

---

## Сознательно не делаем сегодня

- **angelina-hostess-impl / assets-container / chart-list-plugin** — топ-3 реестра; магистраль владельца вне него.
- **Кэш признаков измерителя** — развилка ADR-0031; без живого замера на буфере больше 8360 записей не решаем.
- **Новые M/L задачи** — по слову владельца 07.10 новые задачи только из приёмки.

---

## Вторично (если останется время)

- Строка `sharp` в триаже CVE (Codex).
- `.env.example` office — порядок флагов уборки.

---

## Зависимости и риски

- **Риск:** окно предпросмотра и заморозки — около 60 с; при большем буфере возможен обрыв по таймауту где-то по пути.
- **Риск:** уборка по сроку необратима — включение только словом владельца, сначала dry-run.
- **Зависимость:** busboy — рука владельца (lockfile).

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-10-08
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — вечернее ревью 07.10
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — гейт утра, magistral=tariff-downgrade-freeze (author=human, 08.10)
- GitHub #2587 / #2588 — блоки 1 и 2
- GitHub #2628 — минута без отклика
- GitHub #2629 — подпись «не измерено» и причина 07.10
- GitHub #2623 — busboy
