<!-- Сгенерировано: 2026-09-17T12:23:06.542Z (yarn main-day-issue@af77ed93) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"af77ed9371eecbfc034b74218153e218b7f1941e","digest":"ed124c808210efe2f5db637f154557ebb74d42c28bac8d65c87555ef9cc4fbd5"},"DAILY_STANDUP":{"version":"af77ed9371eecbfc034b74218153e218b7f1941e","digest":"803f97a944a141479e1ce0eb9459b887f7a9f345843c3b078d385c1eacff813f"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-17

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `worktree-sanitation-day2` |
| `primaryTitle` | Второй день санитарии worktree: снос 36 merged-веток, разбор 41 unregistered-дерева, реестр в порядок |
| `githubIssue` | #2345 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-17 |

## Магистраль

**Владелец 17.09 выбрал `worktree-sanitation-day2` — второй день санитарного пара. Источник: `sources[0].claim` из `docs/tasks/main-day-assertions.json`; синтез запрещён.**

Задача: завершить разбор рабочего дерева репозитория, начатый 16.09. ЗАМЕР ствола `4542603a` (утро 17.09): 62 рабочих дерева, из них 41 unregistered (нет `WORKTREE.md`), 1 locked (`Membrana-ritual-night`), 286 локальных веток, к сносу 36 (PR MERGED). Норма сноса строгая: только `yarn repo:clean --execute --worktrees` по одному дереву с пост-чеком живых деревьев после каждого; `git worktree remove` напрямую запрещён (прецедент 06.08 — 2152 файла сквозь junction). Параллельно: для 41 unregistered-дерева владелец разбирает каждое вручную — завести `WORKTREE.md` (имя, цель, статус, дата последнего коммита) или снести. Вопрос issue #2345 (локальный красный TS2305 в `Membrana-tooling`) — артефакт дерева `codex/server-guards-20260825`, не ствола; разбор в рамках дня.

**Критерий успеха к вечеру:** `yarn repo:clean --dry-run` показывает 0 к сносу merged-веток; unregistered-деревьев — не более тех, где владелец принял решение отложить; снимок аудита `docs/evidence/worktree-audit-2026-09-17.md` закоммичен; шаблон `WORKTREE.md` зафиксирован в `docs/repo/`.

## Подкрепление

- **Зафиксировать шаблон `WORKTREE.md`** в `docs/repo/WORKTREE_TEMPLATE.md` (поля: имя дерева, цель, статус `active/stale/locked`, дата последнего коммита, персона-владелец) — без канона следующий `worktree-sanitation` воспроизведёт те же 41 unregistered; шаблон — инвариант, закрывающий воспроизводимость дефекта, а не разовую уборку.
- **Закрыть uncommitted-хвост** (4 modified + 4 untracked из вчерашнего дня): явный `git add docs/procedure-runs/ docs/evidence/` и коммит; без этого снимок аудита 17.09 ляжет в грязное дерево и `repo:clean` будет некорректным.

## Перспективные

- Зелёный CI по `media-library-service` и `background-media` после санитарного дня откроет продуктовую магистраль (tariff-canon-m4r3-m5 или studio-freeze-g2-2328) завтра — владелец объявил пару санитарных дней с возвратом к продукту.
- Перевыпуск токена `@MembranaWatchdog_bot` откроет снятие амнистии на архив и движение к гейту `secret-parser-built` (кристалл `credential-rotation-biweekly`).
- Предикат `git log -1 --format=%ct` как маркер `stale`-дерева — если подтвердится (см. Экспериментальные), ляжет в автоматический audit-снимок и снизит стоимость следующей санитарии до одной команды.

## Экспериментальные

- **Проба: предикат свежести дерева через `git log -1 --format=%ct`** — один скрипт, 10 строк, помечает дерево `stale`, если последний коммит старше N дней; узнаем, достаточен ли этот маркер для автоматического audit-снимка без ручного разбора.
- **Проба: `git branch --merged main`** как источник списка кандидатов на снос — запустить вручную, сравнить вывод с ручным счётом 36 веток из аудита 16.09; узнаем, совпадает ли машинный список с тем, что команда считала глазами.
- **Проба: dry-run резака секретов на одном реальном файле сессии** — `night-triage-secret-scan.mjs --cut-dry-run` на последнем транскрипте; узнаем, режет ли агрессивно или только детектирует (предикат гейта `secret-parser-built`).

## Санитарные

- **P1: issue #2345** — локальный красный TS2305 `OVERFLOW_POLICIES` в `Membrana-tooling` — артефакт дерева `codex/server-guards-20260825` (junction берёт устаревший пакет); разобрать в рамках дня, не смешивать со стволом.
- **Warning `react-hooks/exhaustive-deps`** в `CabinetSampleDuplicatesPanel.tsx:115` — починить или задокументированно отключить с комментарием `// eslint-disable-next-line`.
- **Uncommitted хвост** (4 modified + 4 untracked) — добавить явный `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening`, чтобы не воспроизводить ситуацию завтра.
- **Перевыпустить токен `@MembranaWatchdog_bot`** — засвеченный токен держит кристалл `credential-rotation-biweekly` нарушенным и блокирует снятие амнистии архива.
- **Снимок аудита** `docs/evidence/worktree-audit-2026-09-16.md` от вчерашнего дня — если не закоммичен, добавить в первый же `git add` утра.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `worktree-sanitation-day2`; владелец выбрал её №1 из замороженного снимка (worktree-sanitation-day2 · tariff-canon-m4r3-m5 · studio-freeze-g2-2328) | `sources[0].claim` из `docs/tasks/main-day-assertions.json` | Слово владельца `owner-choice@chat/magistral-17-09` | 2026-09-17 |
| ЗАМЕР ствола `4542603a`: 62 дерева, 41 unregistered, 36 веток к сносу (PR MERGED), 1 locked | `sources[0].claim` — встроенный замер утра 17.09 | Ствол `4542603a`, прогон `repo:clean --dry-run` | 2026-09-17 |
| Ночной CI зелёный на той же ревизии: Network probes, Vitest, Tests nightly full — все success | `sources[0].claim` — встроенный замер утра 17.09 | CI-прогон на ревизии `4542603a` | 2026-09-17 |
| Утверждение «красные пакеты `media-library-service` и `background-media`» ОПРОВЕРГНУТО замером: `ci.yml:127` и `unit-tests.yml:67` — success на `4542603a` | `sources[0].claim` — замер явно опровергает P1-блокер из пятого цикла | Ствол `4542603a`, CI | 2026-09-17 |
| Владелец объявил пару санитарных дней 16.09 с возвратом к продукту; 17.09 — второй день пары | `sources[1].claim` из `docs/tasks/main-day-assertions.json` | Слово владельца `owner-choice@chat/magistral-16-09` | 2026-09-16 |
| Норма сноса: только `yarn repo:clean --execute --worktrees`, по одному, пост-чек; `git worktree remove` запрещён — прецедент 06.08 | `sources[0].claim` — встроен | Прецедент 06.08 (2152 файла через junction) | 2026-09-17 |
| **Расхождение: `morning-gates-state.json` не несёт `magistral` с `day=2026-09-17`** — магистраль взята из `sources[0]` как единственного владельческого источника; расхождение `sources[0]` vs гейт: гейт на сегодня отсутствует, поэтому норма У1 (31.07) не применяется; `sources[0]` — свежайший (17.09) | `docs/tasks/main-day-assertions.json` vs `docs/tasks/morning-gates-state.json` | оба документа | 2026-09-17 |

*1 первоисточник (`sources[0]`, слово владельца 17.09) — все строки выше его отражения или производные от него. Независимый второй первоисточник — `sources[1]` (16.09), подтверждающий пару санитарных дней.*

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Merged-ветки не снесены: 36 PR MERGED ждут удаления | `file:docs/evidence/worktree-audit-2026-09-16.md` (счёт 36 из вчерашнего аудита) + `git branch --merged main` даст совпадающий список | holds |
| Unregistered-деревьев 41: нет `WORKTREE.md` → нельзя автоматически принять решение | `file:docs/repo/WORKTREE_TEMPLATE.md` — файл отсутствует | holds |
| Uncommitted хвост: 4 modified + 4 untracked не в git | `file:docs/procedure-runs/` — файлы есть локально, не в индексе (из стендапа и плана) | holds |
| P1 красные пакеты (`media-library-service` build fail, `background-media` test fail) | CI `ci.yml:127` и `unit-tests.yml:67` на ревизии `4542603a` — **ПОСЫЛКА НАРУШЕНА**: оба зелёные на стволе; красный — только артефакт дерева `Membrana-tooling` (issue #2345, изолированный) | **VIOLATED — P1-блокер снят, день открыт** |

---

## Сегодня делаем

1. Закоммитить uncommitted хвост: `git add docs/procedure-runs/ docs/evidence/` + коммит с сообщением `chore: close worktree-sanitation-day1 tail`.
2. Снести 36 merged-веток: `yarn repo:clean --execute --worktrees` по одному; после каждого — `yarn repo:clean --dry-run` как пост-чек; не применять `git worktree remove` напрямую.
3. Разобрать 41 unregistered-дерево: для каждого владелец принимает решение — завести `WORKTREE.md` (имя, цель, статус, дата коммита, персона) или снести через `repo:clean`.
4. Зафиксировать шаблон `docs/repo/WORKTREE_TEMPLATE.md` и закоммитить — канон для будущих sprint-open деревьев.
5. Разобрать issue #2345 (TS2305 в `Membrana-tooling`): изолировать дерево `codex/server-guards-20260825`, обновить junction или снести дерево если оно merged.
6. Закоммитить снимок аудита `docs/evidence/worktree-audit-2026-09-17.md` с итоговыми счётчиками (деревьев до/после, веток до/после).
7. Добавить `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening` (правка `package.json` или скрипта) — чтобы хвост не воспроизводился завтра.

---

## Definition of Done (фокус)

- [ ] `yarn repo:clean --dry-run` показывает 0 merged-веток к сносу
- [ ] Unregistered-деревьев: либо 0, либо каждое несёт `WORKTREE.md` с решением владельца (active/stale/locked)
- [ ] `docs/repo/WORKTREE_TEMPLATE.md` существует и закоммичен
- [ ] `docs/evidence/worktree-audit-2026-09-17.md` закоммичен с финальными счётчиками
- [ ] Uncommitted хвост закрыт: `git status` на стволе — clean
- [ ] Issue #2345 разобран: либо дерево снесено, либо зафиксирован путь к изоляции
- [ ] `ritual:evening` дописан: `git add docs/procedure-runs/ docs/evidence/` входит в цепочку

---

## Сознательно не делаем сегодня

- **Продуктовая магистраль** (`tariff-canon-m4r3-m5`, `studio-freeze-g2-2328`, `batch-collection-run-contour`) — владелец объявил пару санитарных дней; возврат к продукту завтра.
- **Детекционный контур** (`harmonic`/`cepstral`/`spectral-flux` benchmark на free-v1) — потолок эшелона 0 зафиксирован в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; следующий шаг только при смене датасета или fusion с yamnet.
- **`mfcc-compare-sprint` в код** — без стабильной среды сборки (worktree в порядке) любой новый код создаёт дополнительный шум.
- **Гейт `secret-parser-built` и амнистия архива** — снимается отдельным словом владельца после подтверждения предиката, не сегодня; токен перевыпустить можно как санитарное.
- **Angelina-hostess-impl, assets-container** — в снимке топ-3, но не выбраны владельцем сегодня.

---

## Вторично (если останется время)

- Перевыпустить токен `@MembranaWatchdog_bot` (санитарное, `credential-rotation-biweekly`).
- Починить warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115`.

---

## Зависимости и риски

- **Разбор 41 unregistered-дерева требует решения владельца по каждому** — без его участия инструмент не может принять решение автоматически; если владелец недоступен, фиксируем `WORKTREE.md` со статусом `pending-owner-decision` и переносим снос на завтра.
- **`git worktree remove` напрямую запрещён** — прецедент 06.08 (2152 файла сквозь junction); нарушение нормы создаёт некорректное состояние, которое `repo:clean` не чинит.
- **Issue #2345 (TS2305)** — если корень в самом пакете `@membrana/plugin-contracts`, а не только в junction дерева `Membrana-tooling`, потребуется отдельный PR; не уходить в кроличью нору дольше 30 минут.
- **Uncommitted хвост на стволе** — если не закрыть первым шагом, `repo:clean --execute` может дать ложный счёт деревьев; этот шаг блокирует все остальные.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-09-17
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня (5 слотов, канон M2-B)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0]: слово владельца 17.09
- [STRATEGY_DAY.md](docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0 §6
- Issue [#2345](https://github.com/officefish/Membrana/issues/2345) — TS2305 OVERFLOW_POLICIES в Membrana-tooling