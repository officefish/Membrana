<!-- Сгенерировано: 2026-09-18T13:14:10.602Z (yarn main-day-issue@e0fdef71) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"af77ed9371eecbfc034b74218153e218b7f1941e","digest":"3122e8fafcfcfb0409d1e7680eea77e32791c2cd73d789b47ab267d365050237"},"DAILY_STANDUP":{"version":"af77ed9371eecbfc034b74218153e218b7f1941e","digest":"0d940665be9272f798b33cf7f6613d9036093f892ce64a3e903f071f67eb1d5b"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-18

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `worktree-sanitation-day2` |
| `primaryTitle` | Второй санитарный день: резак секретов на реальном файле + закрытие procedure-run 17.09 |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-18 |

---

## Магистраль

**Магистраль дня — `worktree-sanitation-day2`** (слово владельца 17.09, `sources[0].claim`, `main-day-assertions.json`).

Два незакрытых предиката вехи `secret-parser-built` блокируют движение вперёд. Первый: `night-triage-secret-scan.mjs --cut` должен применить реальное удаление паттерна в файле архива (diff подтверждает удаление, а не замену на placeholder). Второй: `procedure-run ritual-day-2026-09-17-r2` в `docs/procedure-runs/2026-09-17.jsonl` должен получить close-запись с `status:success` — без неё аудитор следующего прогона видит немой «зелёный» (B6-риск). Оба предиката проверяемы сегодня без изменения продуктового кода. Параллельно — разбор oversized-коммита `4eb64dfa` (648 строк): вердикт вечернего ревью невозможен без diff-а, это P0 ревью, не нит.

**Критерий успеха к вечеру:** `night-triage-secret-scan.mjs --cut` применён к реальному файлу архива, `git diff` показывает удаление паттерна (не замену); `2026-09-17.jsonl` несёт close-запись; `git add docs/procedure-runs/ docs/evidence/` вписан в `ritual:evening`; uncommitted-хвост не воспроизводится.

---

## Подкрепление

- **Закрыть `procedure-run ritual-day-2026-09-17-r2`** — дописать close-запись в `docs/procedure-runs/2026-09-17.jsonl` с `status:success`; без этого аудитор следующего прогона получит ложный «зелёный» (B6), а предикат вехи «датированный проход с манифестом ротации» остаётся висячим.
- **Дописать `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening`** — без этого шага uncommitted-хвост санитарных вещдоков воспроизведётся при следующем вечернем ритуале; правка одна строка, проверяется `git status` после прогона.

---

## Перспективные

- **`batch-collection-run-contour`** — примыкает к предикату вехи (датированный проход + манифест ротации), но является следующим шагом после подтверждения резки; запускать контур до прохождения `secret-parser-built` бессмысленно. Открывается завтра при зелёном вечере.
- **Продуктовые кандидаты (`angelina-hostess-impl`, `assets-container`)** — оба в топ-3 стендапа, оба ждут слова владельца о возврате к продукту; санитарный день не закрывает их, а расчищает дорогу к ним.
- **Разбор 68 веток без PR** — по замеру утра 17.09 (286 локальных веток, 68 без PR); полный разбор вне сегодняшнего мандата, но список можно сформировать параллельно как вспомогательный артефакт.

---

## Экспериментальные

- **Проба: предикат свежести дерева через `git log -1 --format=%ct`** — узнаем, работает ли чистая функция как замена ручному взгляду на актуальность воркдерева; если да — кандидат в `main-day-probe`.
- **Проба: `night-triage-secret-scan.mjs --cut` на одном файле архива** — узнаем, даёт ли текущий код реальное удаление паттерна или только детекцию; прямой шаг к гейту `secret-parser-built`, результат — diff без placeholder.
- **Проба: одна строка `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening`** — узнаем, исчезает ли воспроизводящийся uncommitted-хвост полностью; если нет — значит, есть третий путь попадания вещдоков вне этих двух каталогов.

---

## Санитарные

- Закрыть `procedure-run ritual-day-2026-09-17-r2` в `docs/procedure-runs/2026-09-17.jsonl` — риск немого «зелёного» (B6)
- Дописать `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening` — хвост uncommitted воспроизведётся без этого
- Разбор oversized-коммита `4eb64dfa` (648 строк) через `yarn code-review:pr` или ручной diff — P0 ревью, вердикт без diff-а невозможен
- Починить warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115` — тянется с вечернего ревью
- Проверить статус issue #2345 (TS2305 в `Membrana-tooling`) — вчера не отражён в коммитах; уточнить, артефакт воркдерева или реальный красный

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `worktree-sanitation-day2`, прямой выбор владельца из замороженного снимка топ-3 | `docs/tasks/main-day-assertions.json` → `sources[0]` | Слово владельца в чате `owner-choice@chat/magistral-17-09` | 2026-09-17 |
| Магистраль взята с `sources[0]` (`main-day-assertions.json`); `morning-gates-state.json` не предоставлен — расхождение не обнаружено, сверка невозможна | `docs/tasks/main-day-assertions.json` | `main-day-assertions.json` | 2026-09-17 |
| Веха `secret-parser-built` активна, фаза `approaching`; два предиката не закрыты | `docs/STRATEGY_DAY.md` (горизонт #592) | `docs/strategy/day-horizon.json` | 2026-09-18 |
| `night-triage-secret-scan.mjs` находит секреты, но не режет; резак в `scripts/lib/secret-redact.mjs` существует с 26.07, однако прогон `--cut` на реальном файле не подтверждён | `docs/tasks/main-day-assertions.json` (`//retired-redact-wrong-address-03-08`) + стендап | `docs/truth/registry.json` (`session-backup-requires-secret-redaction`) | 2026-07-17 / стендап 2026-09-18 |
| `procedure-run ritual-day-2026-09-17-r2` открыт без close-записи — B6-риск немого «зелёного» | стендап (`docs/DAILY_STANDUP.md`) | Стендап 2026-09-18 (1 источник, независимый от снимка топ-3) | 2026-09-18 |
| Владелец 16.09 объявил пару санитарных дней с возвратом к продукту; 17.09 подтвердил второй санитарный день | `sources[1]` / `sources[0]` в `main-day-assertions.json` | Слово владельца `owner-choice@chat/magistral-16-09` + `magistral-17-09` | 2026-09-16 / 2026-09-17 |
| Синтезировать магистраль из входов запрещено при заданном `sources[0]` | системный промпт (правило магистрали) | Системный промпт (Teamlead Tarasov) | канон |

> **1 источник, 1 отражение** по снимку `DAY_PLAN.md`: план дня перечисляет те же три кандидата, что и `sources[0]`, — он производный от того же owner-choice 17.09, самостоятельным голосом не является.

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `night-triage-secret-scan.mjs` в режиме резки (`--cut`) не применялся к реальному файлу архива — прогон с реальным удалением паттерна не задокументирован | `file:docs/security/rotation-manifest-2026-09-18.md` (датированный манифест сегодняшнего прогона отсутствует) | holds |
| `procedure-run ritual-day-2026-09-17-r2` не имеет close-записи в `docs/procedure-runs/2026-09-17.jsonl` | `file:docs/procedure-runs/2026-09-17.jsonl` (close-запись с `status:success` отсутствует) | holds |
| `git add docs/procedure-runs/ docs/evidence/` отсутствует в скрипте `ritual:evening` | `symbol:procedure-runs` в `package.json` (строка `ritual:evening`) | holds |

---

## Сегодня делаем

1. Запустить `night-triage-secret-scan.mjs --cut` на реальном файле архива; получить `git diff`, подтверждающий удаление паттерна (не замену на placeholder).
2. Создать датированный манифест ротации `docs/security/rotation-manifest-2026-09-18.md` по итогам прогона.
3. Дописать close-запись в `docs/procedure-runs/2026-09-17.jsonl` с `status:success` для `ritual-day-2026-09-17-r2`.
4. Дописать `git add docs/procedure-runs/ docs/evidence/` в скрипт `ritual:evening` в `package.json`; прогнать вечерний ритуал и проверить `git status` — uncommitted-хвост должен исчезнуть.
5. Разобрать oversized-коммит `4eb64dfa` (648 строк) через `yarn code-review:pr` или ручной diff; зафиксировать вердикт в `DAILY_CODE_REVIEW.md`.
6. Проверить issue #2345 (TS2305): воркдеревный артефакт или реальный красный — закрыть или завести fix-задачу.
7. Починить `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115`.

---

## Definition of Done (фокус)

- [ ] `night-triage-secret-scan.mjs --cut` применён к реальному файлу архива; `git diff` показывает удаление паттерна, а не замену на placeholder
- [ ] `docs/security/rotation-manifest-2026-09-18.md` создан с датой, количеством обработанных файлов и вердиктом прогона
- [ ] `docs/procedure-runs/2026-09-17.jsonl` содержит close-запись `ritual-day-2026-09-17-r2` с `status:success`
- [ ] `git add docs/procedure-runs/ docs/evidence/` присутствует в строке `ritual:evening` в `package.json`
- [ ] После прогона вечернего ритуала `git status` не показывает uncommitted-файлов в `docs/procedure-runs/` и `docs/evidence/`
- [ ] Вердикт по коммиту `4eb64dfa` зафиксирован в `DAILY_CODE_REVIEW.md`
- [ ] Предикаты вехи `secret-parser-built` (резак режет + датированный проход) помечены как пройденные или явно указана блокировка с причиной

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl` и `assets-container`** — продуктовые кандидаты; требуют слова владельца о возврате к продукту, сегодня второй санитарный день
- **`batch-collection-run-contour`** — следующий шаг после подтверждения резки; запускать до прохождения `secret-parser-built` бессмысленно
- **DSP-бенчмарки (harmonic / cepstral / spectral-flux)** — потолок эшелона 0 зафиксирован в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; повтор без смены датасета не даёт нового знания
- **`mfcc-compare-sprint` в код** — воркдерево не вычищено до нуля (issue #2345 в статусе «разобрать»); новый код в нестабильной среде создаёт шум
- **Полный разбор 68 веток без PR** — масштаб больше одного дня; сформировать список как вспомогательный артефакт можно, но не как основную задачу

---

## Вторично (если останется время)

- Сформировать список 68 веток без PR (`git branch -v`) как вспомогательный артефакт для будущего разбора владельцем.
- Проверить `yarn repo:clean --dry-run --worktrees` после санитарных действий дня — убедиться, что счётчик `unregistered` сократился.

---

## Зависимости и риски

- **Блокер 1:** если `night-triage-secret-scan.mjs --cut` падает с ошибкой или даёт placeholder вместо удаления — предикат вехи `secret-parser-built` не закрывается сегодня; нужно явно зафиксировать блокировку и причину, не замалчивать.
- **Блокер 2:** если `docs/procedure-runs/2026-09-17.jsonl` уже содержит close-запись (воркдерев не синхронизирован) — посылка нарушена, закрытие уже состоялось; зафиксировать как находку реестра.
- **Риск:** issue #2345 (TS2305) может оказаться не артефактом воркдерева, а реальным красным в ветке `codex/server-guards-20260825`; без разбора следующий ночной прогон даст ложный зелёный.
- **Риск meta-drift:** три инфраструктурных/санитарных дня подряд (11.09, 12.09 — инфра; 16.09, 17.09, 18.09 — санитария); владелец назвал пару дней с возвратом к продукту — сегодня последний день мандата, завтра ожидается продуктовое слово владельца.

---

## Ссылки

- [DAILY_STANDUP 2026-09-18](../docs/DAILY_STANDUP.md)
- [STRATEGY_DAY / горизонт дня](../docs/STRATEGY_DAY.md)
- [DAY_PLAN 2026-09-18](../docs/DAY_PLAN.md)
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md §6](../docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md)
- [truth/registry.json — `session-backup-requires-secret-redaction`](../docs/truth/registry.json)