<!-- Сгенерировано: 2026-09-17T11:58:00.845Z (yarn main-day-issue@07c6eb63) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"124a6d538d9d09951cee2df7b87893abc7b00da9","digest":"ed124c808210efe2f5db637f154557ebb74d42c28bac8d65c87555ef9cc4fbd5"},"DAILY_STANDUP":{"version":"124a6d538d9d09951cee2df7b87893abc7b00da9","digest":"803f97a944a141479e1ce0eb9459b887f7a9f345843c3b078d385c1eacff813f"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-17

<!-- Сгенерировано: 2026-09-17 (yarn main-day-issue) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `worktree-sanitation` |
| `primaryTitle` | Санитария рабочих деревьев: снос 36 merged-веток, снимок аудита, шаблон WORKTREE.md |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-17 |

---

## Магистраль

**Магистраль дня — `worktree-sanitation`** — выбор владельца от 16.09.2026 («сделаем разбор деревьев центральной задачей дня», подтверждение «Разбор деревьев»), взятый из `sources[0].claim` файла `docs/tasks/main-day-assertions.json`. Синтез не производился.

**Расхождение (норма У1):** `docs/tasks/main-day-assertions.json` → `sources[0]` несёт владельческий выбор от **16.09**; `docs/tasks/morning-gates-state.json` не представлен во входах с сегодняшней датой, поэтому правило свежести гейта не применяется — действует `sources[0]` как единственный владельческий источник. Расхождения между гейтом и assertions нет; перечеканка `main-day-assertions.json` под сегодняшнюю дату не произведена — это находка, не блокер.

Задача: привести репозиторий к состоянию, при котором `repo:clean --dry-run` не показывает unregistered деревьев и merged-веток-кандидатов. Замер утра 16.09: 62 рабочих дерева, 41 unregistered (нет `WORKTREE.md`), 36 веток к удалению (PR MERGED). Сегодня: (1) снести 36 merged-веток через `yarn repo:clean --execute --worktrees` по одной с пост-чеком, (2) зафиксировать снимок аудита `docs/evidence/worktree-audit-2026-09-17.md` в git, (3) записать шаблон `docs/repo/WORKTREE.md` (поля: имя, цель, статус, дата последнего коммита).

**Критерий успеха к вечеру:** `yarn repo:clean --dry-run` возвращает 0 unregistered деревьев и 0 merged-веток-кандидатов; снимок аудита и шаблон WORKTREE.md закоммичены; uncommitted хвост (4 modified + 4 untracked) закрыт.

---

## Подкрепление

- **Зелёный CI по `media-library-service` и `background-media`** — P1-блокер продуктовой работы: запустить `yarn turbo run build test --filter=@membrana/media-library-service --filter=@membrana/background-media`, локализовать причину (build fail / test fail), применить минимальный fix или обоснованный `skip` с issue-ссылкой. Лимит диагностики — 30–40 минут; если причина не найдена, фиксируем workaround и не уходим глубже.
- **Перевыпуск токена `@MembranaWatchdog_bot`** — засвеченный токен держит кристалл `credential-rotation-biweekly` нарушенным и блокирует снятие амнистии архива (гейт `secret-parser-built`); перевыпустить и записать факт в `docs/security/rotation-manifest-2026-09-17.md`.

---

## Перспективные

- Зелёный CI обоих пакетов открывает продуктовую магистраль завтра — без него код не стартует.
- Закрытая `worktree-sanitation` (снимок + шаблон + снос веток) снимает накопленный санитарный долг и возвращает репозиторий в состояние, при котором следующий аудит не воспроизведёт 41 unregistered.
- Перевыпуск токена `@MembranaWatchdog_bot` + подтверждение предиката `amnestyLifted` открывают движение к завершению гейта `secret-parser-built` — последнему незакрытому критерию горизонта вехи.

---

## Экспериментальные

- **Dry-run резака секретов на одном реальном транскрипте** — запустить `scripts/night-triage-secret-scan.mjs` с `--cut-dry-run` на последнем файле сессии; проверить, что `scripts/lib/secret-redact.mjs` срабатывает агрессивно (по кристаллу `secret-parser-cuts-aggressively`), не просто детектирует.
- **Предикат свежести деревьев через `git log -1 --format=%ct`** — один скрипт-прототип (10 строк), помечает дерево `stale` если последний коммит старше N дней; выяснить, достаточен ли маркер для автоматического снимка аудита без ручного счёта.
- **`git branch --merged main` как источник списка кандидатов** — прогнать вручную и сравнить вывод с рукописным счётом 36 веток из аудита 16.09; если совпадает — этот шаг можно встроить в `repo:clean` без ручной разметки.

---

## Санитарные

- **P1: диагностика красных пакетов** — `@membrana/media-library-service` (build fail) и `@membrana/background-media` (test fail); лимит 30–40 минут, далее workaround с issue.
- **Перевыпустить токен `@MembranaWatchdog_bot`** — засвеченный токен держит амнистию архива закрытой (`credential-rotation-biweekly`).
- **Довести worktree-sanitation по DoD 16.09** — снос 36 merged-веток (`yarn repo:clean --execute --worktrees`, по одной, пост-чек), снимок `worktree-audit-2026-09-17.md` в git, обновление реестра.
- **Warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115`** — починить или задокументированно отключить с комментарием и ссылкой на issue.
- **Uncommitted хвост (4 modified + 4 untracked)** — закрыть явным `git add docs/procedure-runs/ docs/evidence/` и коммитом; добавить этот шаг в `ritual:evening`.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `worktree-sanitation` | `docs/tasks/main-day-assertions.json` → `sources[0].claim` | Слово владельца в чате (owner-choice@chat/magistral-16-09) | 2026-09-16 |
| 62 рабочих дерева, 41 unregistered, 36 merged-веток к удалению | замер `repo:clean --dry-run` утра 16.09, зафиксирован в `sources[0]` | repo:clean dry-run, ствол 36d44dda | 2026-09-16 |
| Санитарный день назван осознанно («на два дня с возвратом к магистрали») | `sources[0].claim` | Слово владельца в чате | 2026-09-16 |
| План дня (`docs/DAY_PLAN.md`) подтверждает магистраль как `worktree-sanitation` | `docs/DAY_PLAN.md` (отражение того же owner-choice) | owner-choice@chat/magistral-16-09 — **1 источник, 2 отражения** (sources[0] + DAY_PLAN) | 2026-09-16 |
| Стендап называет worktree-sanitation выполненной вчера и фиксирует остаток | `docs/DAILY_STANDUP.md` | Стендап 2026-09-17 (вход генератора) | 2026-09-17 |
| **Расхождение: магистраль взята с assertions, morning-gates-state не несёт сегодняшней даты** | `docs/tasks/morning-gates-state.json` отсутствует во входах с датой 2026-09-17 | — | — |
| Перечеканка `main-day-assertions.json` под 2026-09-17 не произведена — находка, не блокер | `docs/tasks/main-day-assertions.json` (date: 2026-09-16) | assertions.json | 2026-09-16 |

---

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Шаблон `docs/repo/WORKTREE.md` не существует (норма worktree-sanitation не закреплена) | `file:docs/repo/WORKTREE.md` | holds — файл отсутствует, работа не сделана |
| Снимок аудита `worktree-audit-2026-09-17.md` не зафиксирован | `file:docs/evidence/worktree-audit-2026-09-17.md` | holds — файл отсутствует |
| Uncommitted хвост не закрыт (4 modified + 4 untracked) | стендап фиксирует факт явно; маркер — `file:docs/procedure-runs/` (uncommitted) | holds — подтверждено стендапом |

---

## Сегодня делаем

1. Запустить `yarn turbo run build test --filter=@membrana/media-library-service --filter=@membrana/background-media`; локализовать и устранить причину (или зафиксировать обоснованный skip с issue) — лимит 30–40 минут.
2. Прогнать `git branch --merged main`, сверить вывод с рукописным счётом 36 веток из аудита 16.09; зафиксировать список в снимке.
3. Снести 36 merged-веток по одной командой `yarn repo:clean --execute --worktrees` с пост-чеком живых деревьев после каждого (норма: raw `git worktree remove` запрещён).
4. Зафиксировать снимок `docs/evidence/worktree-audit-2026-09-17.md` с итогами (было/стало: деревьев, unregistered, merged-веток) и сделать коммит.
5. Записать шаблон `docs/repo/WORKTREE.md` (поля: имя, цель, статус, дата последнего коммита) и закоммитить.
6. Перевыпустить токен `@MembranaWatchdog_bot`; записать факт в `docs/security/rotation-manifest-2026-09-17.md`.
7. Закрыть uncommitted хвост: `git add docs/procedure-runs/ docs/evidence/` + коммит; добавить шаг в `ritual:evening`.

---

## Definition of Done (фокус)

- [ ] `yarn repo:clean --dry-run` возвращает 0 unregistered деревьев и 0 merged-веток-кандидатов
- [ ] Снимок `docs/evidence/worktree-audit-2026-09-17.md` закоммичен (содержит было/стало по деревьям и веткам)
- [ ] Шаблон `docs/repo/WORKTREE.md` создан и закоммичен (поля: имя, цель, статус, дата последнего коммита)
- [ ] Все 36 merged-веток снесены через `yarn repo:clean --execute --worktrees` (не raw git), пост-чек пройден
- [ ] Uncommitted хвост (4+4) закрыт коммитом; шаг добавлен в `ritual:evening`
- [ ] Токен `@MembranaWatchdog_bot` перевыпущен, факт записан в `docs/security/rotation-manifest-2026-09-17.md`
- [ ] CI по `media-library-service` и `background-media` зелёный или зафиксирован обоснованный workaround с issue-ссылкой

---

## Сознательно не делаем сегодня

- **Продуктовые магистрали** (`angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour`) — владелец явно назвал санитарный день с возвратом к продукту позже.
- **Детекционный контур** (`harmonic` / `cepstral` / `spectral-flux` benchmark) — потолок эшелона 0 зафиксирован в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; следующий шаг только при смене датасета или fusion.
- **`mfcc-compare-sprint` в код** — без стабильного CI и выбора продуктовой магистрали новый код создаёт шум.
- **Амнистия архива и гейт `secret-parser-built`** — снимается отдельным словом владельца после подтверждения предиката `amnestyLifted`, не сегодня.
- **Новые продуктовые sprint-деревья** — открывать после закрытия санитарии, не параллельно.

---

## Вторично (если останется время)

- Warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115` — починить или задокументированно отключить.
- Dry-run резака секретов на одном реальном транскрипте (`scripts/night-triage-secret-scan.mjs --cut-dry-run`) — экспериментальная проба, не блокер.

---

## Зависимости и риски

- **Блокер #1:** `media-library-service` build fail и `background-media` test fail — диагностика идёт первой; если через 30–40 минут причина не найдена, фиксируем минимальный workaround (skip flaky test с issue) и переходим к магистрали.
- **Блокер #2:** Raw `git worktree remove` запрещён (прецедент 06.08 — 2152 файла сквозь junction); использовать только `yarn repo:clean --execute --worktrees` по одной ветке с пост-чеком.
- **Риск:** диагностика CI затянется и съест время санитарии деревьев — жёсткий тайм-бокс 30–40 минут на диагностику.
- **Риск:** `main-day-assertions.json` не перечеканен под 2026-09-17 — генератор завтра прочитает sources[0] с датой 16.09 как актуальный; перечеканку рекомендуется сделать вечером при закрытии дня.

---

## Ссылки

- [DAILY_STANDUP.md](../DAILY_STANDUP.md) — стендап 2026-09-17
- [DAY_PLAN.md](../DAY_PLAN.md) — план дня, слот магистрали worktree-sanitation
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](../prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0, §6
- [main-day-assertions.json](../tasks/main-day-assertions.json) — sources[0], owner-choice 2026-09-16
- `docs/evidence/worktree-audit-2026-09-17.md` — целевой артефакт снимка аудита (создаётся сегодня)
- `docs/repo/WORKTREE.md` — целевой шаблон (создаётся сегодня)