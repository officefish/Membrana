<!-- Сгенерировано: 2026-08-15T07:58:36.438Z (yarn main-day-issue@4d41bce4) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"4d41bce4fb9136b6e00eeb7dc044a97ad74c4d7d","digest":"991de906131459027877f25b066ad8b5b23be4317b8c535dc0d733e26415bbdd"},"DAILY_STANDUP":{"version":"4d41bce4fb9136b6e00eeb7dc044a97ad74c4d7d","digest":"01762bf488bcbcdef809404f88a4b180cf486c25e02b2dbc361a284cc61a5f4b"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-15

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `secret-parser-built` (gate-id) / карточка `secret-cutter` архивирована; гейт открыт как задача дня |
| `primaryTitle` | Пройти гейт `secret-parser-built`: датированный манифест ротации + амнистия архива |
| `githubIssue` | — |
| `size` | M |
| `promptPath` | — |
| `сгенерировано` | 2026-08-15 |

> **Расхождение — находка (норма У1):** `docs/tasks/main-day-assertions.json` → `sources[0].claim` называет магистралью **`archivarius-sessions-container`** (выбор владельца 14.08). `docs/tasks/morning-gates-state.json` не представлен во входах с сегодняшней датой, поэтому правило «гейт свежее — берём гейт» не срабатывает. Вместе с тем `assertions[]` пуст (все посылки сняты утром 15.08 как исчерпанные вместе с архивацией карточки), а стендап 15.08 и горизонт `STRATEGY_DAY.md` единогласно называют единственным активным гейтом **`secret-parser-built`**. `archivarius-sessions-container` закрыта вечером 14.08 (acceptance-документ, PR #1930, PR #1931, Issue #1330 закрыт). Применяю: **магистраль взята с гейта горизонта, assertions перечеканены не были** — расхождение само есть находка; `sources[0]` описывает вчерашний день, а не сегодняшний. Синтезировать запрещено — оба сигнала владельческие, спор решается свежестью: горизонт 15.08 свежее выбора 14.08.

---

## Магистраль

**Гейт `secret-parser-built` — единственный активный блокер снятия амнистии на правку архива.**

Вчерашний день закрыт чисто: `archivarius-sessions-container` принята (acceptance-2026-08-14.md), Issue #1330 закрыт, карточка архивирована. Полоса освободилась. Горизонт дня (#592) и стендап называют один оставшийся незакрытый критерий вехи: `night-triage-secret-scan.mjs` должен **резать** (не только детектировать) паттерны секретов, и должен существовать **один датированный manifest-файл** прогона ротации засвеченных ключей.

Резак `scripts/lib/secret-redact.mjs` существует с 26.07 (PR #1252, 18/18 тестов), однако сканер `night-triage-secret-scan.mjs` его не вызывает — он по-прежнему только детектирует и отдаёт non-zero exit. Задача дня: подключить `secret-redact` к сканеру, прогнать на грязной фикстуре (не прод), убедиться что ключ вырезан, создать датированный manifest и пометить гейт пройденным.

**Критерий успеха к вечеру:** `night-triage-secret-scan.mjs` запущен на тестовой фикстуре с засвеченным паттерном → ключ отсутствует в выводе → `docs/security/rotation-manifest-2026-08-15.md` создан с датой и счётчиком → гейт `secret-parser-built` помечен `passed` в `morning-gates-state.json`.

---

## Подкрепление

- **Проверить и закрыть Issue #1330** (если ещё не закрыт после вечера 14.08): убедиться, что ссылка на `acceptance-2026-08-14.md` проставлена, issue имеет статус closed — это санитарный хвост закрытого дня, мешающий чистому счёту открытых задач (Тарасов).
- **Зафиксировать `docs/archivarius/acceptance-2026-08-14.md` в каталоге `LIVE_SERVICES`**: новый дом объявлен без прописки — Веснин, ~15 минут; без этого acceptance-документ существует вне адресной книги сервисов и не читается агентами при следующем обходе.

---

## Перспективные

- **Снятие амнистии на правку архива** после прохождения `secret-parser-built` открывает работы с историческими сессиями: первый кандидат — ночной бэкап тома архивариуса (`archivarius-mongo-backup`), от которого отказались 14.08 в пользу контейнера сессий, но данные (106К спанов) по-прежнему без резервной копии.
- **`angelina-hostess-impl`** — третий день в рекомендации Тарасова; условие входа — `yarn main-day-probe` с именованным вердиктом; без probe-вердикта не `unknown` выполнить нельзя, поэтому кандидат следующего дня, не сегодняшнего.
- **`batch-collection-run-contour`** — контур пакетного запуска коллекций; берётся после закрытия гейта, чтобы не воспроизводить паттерн параллельного L-блока 11–13.08.

---

## Экспериментальные

- **`insight:insight-server-only-ritual-run`**: запустить один ритуал через панель без интерактивного ввода и зафиксировать, доходит ли он до финального шага — узнаем, есть ли у server-only режима скрытый блокер прямо сегодня, пока манифест ротации компилируется.
- **`insight:insight-owner-intervention-ledger`**: пролистать вчерашний день и разметить каждое вмешательство владельца как «суверенное» (новый выбор) или «компенсирующее» (починка поломанного) — займёт ~20 минут и скажет, нужна ли карточка.
- **`insight:insight-one-shot-portfolio-surfacing`**: взять решение по `archivarius-sessions-container` 14.08 как готовый прецедент и проверить, всплыл ли портфель шотов в момент выбора — узнаем, работает ли паттерн без специальной оснастки.

---

## Санитарные

- **`makeIsIgnored` throw-замена** — заменить необработанный throw при exit-коде `git check-ignore` ≠ 0/1 именованным исходом; четвёртый день переноса (Ожегов, ~30 минут, изолированная правка).
- **`docs/archivarius/acceptance-2026-08-14.md` → каталог `LIVE_SERVICES`** — прописать новый дом acceptance-документа (Веснин, ~15 минут).
- **Issue #1330**: проверить статус — если OPEN, закрыть с ссылкой на acceptance-документ (Тарасов).
- **`aria-live="polite"` на `promo-deny-text`** — санитарная правка ~10 минут, третий день (Родченко).
- **Drift-снимки ночной охоты** (`services-api-drift-2026-28/30/32`, `graph-drift`, `design-drift`) — пройтись, отделить реальные расхождения от шума (Дынин).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Гейт `secret-parser-built` — единственный активный блокер снятия амнистии архива | горизонт | `docs/strategy/day-horizon.json` (генератор #592) | 2026-08-15 |
| Критерии вехи конкретны: сканер режет + датированный manifest | горизонт | `docs/STRATEGY_DAY.md` (читает `day-horizon.json`) | 2026-08-15 — 1 источник, 1 отражение |
| `archivarius-sessions-container` закрыта вечером 14.08; `sources[0]` описывает вчерашний день | код+issue | `acceptance-2026-08-14.md`, PR #1930, PR #1931, Issue #1330 closed | 2026-08-14 вечер |
| `assertions[]` пуст — посылки вчерашней магистрали сняты утром 15.08 как исчерпанные | план | `docs/tasks/main-day-assertions.json` (комментарий `//retired-archivarius-accepted-14-08`) | 2026-08-15 |
| Стендап 15.08 называет `secret-parser-built` магистралью и объясняет смену | сессия | `docs/DAILY_STANDUP.md` (2026-08-15T07:56:46Z) | 2026-08-15 |
| Резак `scripts/lib/secret-redact.mjs` существует, но сканер его не вызывает — посылка DoD не закрыта | код | `git log` PR #1252, коммит 211243df, 26.07; grep в `night-triage-secret-scan.mjs` | 2026-07-26 / проверка 2026-08-03 |
| **магистраль взята с гейта горизонта, assertions не перечеканены** — расхождение само есть находка | — | норма У1 (31.07) | 2026-08-15 |

> 1 источник горизонта + 1 источник стендапа + 1 источник кода = **3 независимых первоисточника**, все указывают на `secret-parser-built`. `sources[0]` (`main-day-assertions.json`) называет вчерашнюю закрытую задачу — это не противоречие, а устаревший манифест; перечеканка предписана каноном и не сделана.

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `night-triage-secret-scan.mjs` не вызывает резак — только детектирует и отдаёт non-zero exit | `symbol:redactSecrets` в `scripts/night-triage-secret-scan.mjs` (grep; ожидаем 0 вхождений) | **holds** — резак в отдельном модуле `scripts/lib/secret-redact.mjs`, в сканер не подключён |
| Датированного manifest-файла прогона ротации за 15.08 не существует | `file:docs/security/rotation-manifest-2026-08-15.md` | **holds** — файл отсутствует на утро 15.08 |
| Гейт `secret-parser-built` не помечен `passed` | состояние `morning-gates-state.json` (поле `magistral` или аналог для гейта) | **holds** — гейт активен по горизонту |

Все три посылки держатся → магистраль назначена корректно.

---

## Сегодня делаем

1. **Прочитать `scripts/night-triage-secret-scan.mjs`** целиком и зафиксировать точку подключения резака (после детекции паттернов, перед exit).
2. **Подключить `scripts/lib/secret-redact.mjs`** к сканеру: при обнаружении секрета — вырезать из копии, не из оригинала; оригинал не трогать.
3. **Создать грязную тестовую фикстуру** (временный файл с заведомо засвеченным паттерном — не прод-данные).
4. **Прогнать сканер на фикстуре**, убедиться: паттерн вырезан из выхода, оригинал цел, сканер завершается с кодом 0 при успешном резе.
5. **Создать `docs/security/rotation-manifest-2026-08-15.md`** с датой, счётчиком обработанных файлов и явным «ок» (формат аналогичен `rotation-manifest-2026-08-03.md`).
6. **Пометить гейт `secret-parser-built` пройденным** в `morning-gates-state.json`.
7. **Закрыть санитарный хвост**: проверить Issue #1330 (если OPEN — закрыть), прописать acceptance-документ в `LIVE_SERVICES`.

---

## Definition of Done (фокус)

- [ ] `night-triage-secret-scan.mjs` вызывает `secret-redact` и вырезает паттерн из обрабатываемой копии
- [ ] Прогон на грязной фикстуре завершён: засвеченный паттерн отсутствует в выходе, оригинал не изменён
- [ ] `docs/security/rotation-manifest-2026-08-15.md` создан, содержит дату и счётчик файлов
- [ ] Сканер возвращает код 0 при успешном резе (не только non-zero при детекции)
- [ ] Гейт `secret-parser-built` помечен `passed` в `morning-gates-state.json`
- [ ] `docs/archivarius/acceptance-2026-08-14.md` прописан в каталоге `LIVE_SERVICES`
- [ ] Issue #1330 имеет статус closed с ссылкой на acceptance-документ

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — без `probe`-вердикта (не `unknown`) условие входа не выполнено; возвращается завтра.
- **`batch-collection-run-contour`** — кандидат магистрали по DAY_PLAN, но параллельный L-блок воспроизводит паттерн 11–13.08; берётся после закрытия гейта.
- **DSP-бенчмарки (harmonic / cepstral / flux на free-v1)** — потолок эшелона 0 зафиксирован (FFT_METRICS §6); повтор без смены датасета или fusion не даёт новой информации.
- **`makeIsIgnored` throw-замена** — остаётся санитарным, не магистралью: правка изолированная, не блокирует гейт.
- **Перечеканка `main-day-assertions.json`** под сегодняшнюю магистраль — предписана каноном, но не блокирует выполнение гейта; кандидат для вечернего ритуала.

---

## Вторично (если останется время)

- **`makeIsIgnored` throw → именованный исход** (Ожегов, ~30 минут): изолированная правка, четвёртый день в санитарных — закрыть наконец.
- **Drift-снимки ночной охоты** (`services-api-drift-2026-28/30/32`): пройтись с Дыниным, отделить реальные расхождения от шума — не требует решений, только чтение.

---

## Зависимости и риски

- **`scripts/lib/secret-redact.mjs` покрывает детекцию, но интеграция со сканером не тестировалась** — главный риск дня: тест на фикстуре (не прод) выявит это до правки; если резак падает на неожиданном паттерне — блокер.
- **`main-day-assertions.json` не перечеканен** под магистраль 15.08 — технический долг; если `yarn main-day-probe` запустится до перечеканки, он будет проверять вчерашние посылки (все `violated`) и выдаст вводящий в заблуждение вердикт.
- **Амнистия на правку архива** снимается только после прохождения гейта — до вечера исторические сессии остаются заморожены; это известное ограничение, не сюрприз.
- **Issue #1330**: закрыт вечером 14.08 по описанию стендапа, но факт не проверен кодом — риск «реестр протух»; проверить первым делом.

---

## Ссылки

- [`docs/DAILY_STANDUP.md`](../DAILY_STANDUP.md) — стендап 2026-08-15 (главный вход)
- [`docs/STRATEGY_DAY.md`](../STRATEGY_DAY.md) — горизонт дня, гейт `secret-parser-built`
- [`docs/tasks/main-day-assertions.json`](../tasks/main-day-assertions.json) — манифест посылок (требует перечеканки)
- [`scripts/night-triage-secret-scan.mjs`](../../scripts/night-triage-secret-scan.mjs) — сканер (объект работы)
- [`scripts/lib/secret-redact.mjs`](../../scripts/lib/secret-redact.mjs) — резак (подключить)
- [`docs/security/rotation-manifest-2026-08-03.md`](../security/rotation-manifest-2026-08-03.md) — образец manifest-файла
- [`docs/archivarius/acceptance-2026-08-14.md`](../archivarius/acceptance-2026-08-14.md) — acceptance вчерашней магистрали