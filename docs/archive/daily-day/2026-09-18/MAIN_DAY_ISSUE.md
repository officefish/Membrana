<!--
  archive-role: archive-snapshot
  archive-day: 2026-09-18
  archived-at: 2026-09-18T17:47:44.665Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-09-18T13:18:57.688Z (yarn main-day-issue@64108b0d) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"64108b0d395ba08cfbeb1d2ae20f7234f2a82d22","digest":"3122e8fafcfcfb0409d1e7680eea77e32791c2cd73d789b47ab267d365050237"},"DAILY_STANDUP":{"version":"64108b0d395ba08cfbeb1d2ae20f7234f2a82d22","digest":"0d940665be9272f798b33cf7f6613d9036093f892ce64a3e903f071f67eb1d5b"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-18

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `tariff-transitions-live` |
| `primaryTitle` | Доставить материалы совещаний M0–M4 по тарифной матрице в ствол и верифицировать доезд правды матрицы до сервера/прибора при переходах тарифов |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-18 |

## Магистраль

Магистраль дня — **`tariff-transitions-live`** — взята из `docs/tasks/main-day-assertions.json` → `sources[0].claim`: слово владельца от 18.09.2026, выбор №1 из замороженного снимка (tariff-transitions-live · sanitation-tails · night-hunt-trigger-fix).

Предмет: 39 файлов совещаний M0–M4 по единой тарифной матрице (повестки, разборы, решения) живут в ветке `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917`, но отсутствуют в стволе. Единая матрица тарифов (гранула `docs/containers/strategic-docs/granules/tariff-buffer/resource.json`, ствол 82134d5d) уже несёт растущий буфер — free-v1 512 MiB, checkpoint-v1 2048 MiB, observatory-v1 4096 MiB, ratifiedAt 2026-09-08. Вопрос дня: доезжает ли эта правда до сервера и прибора, и что происходит при переходах тарифов (M3 повышение, M4 понижение и холод — оба прогона 2 отклонены, M5 не созван).

Первый шаг — доставить материалы совещаний в ствол **без** файлов 12.09 (DAILY_CODE_REVIEW, morning-gates-state, DAILY_AUDIT) — они затрут сегодняшние. Второй шаг — по доставленным материалам сверить состояние переходов M3/M4 и назвать точный остаток до созыва M5.

**Критерий успеха к вечеру:** ствол несёт материалы M0–M4 (39 файлов минус файлы 12.09); `git log --oneline` содержит коммит доставки; зафиксирован письменный ответ «что именно не работает в переходах M3/M4» или «переходы зелёные, блокер M5 снят».

## Подкрепление

- **Закрыть `procedure-run ritual-day-2026-09-17-r2`** close-записью в `docs/procedure-runs/2026-09-17.jsonl` — незакрытый прогон создаёт риск немого «зелёного» в следующем аудите (B6-риск); предикат `secret-parser-built` требует датированного прохода, а не призрачного «зелёного».
- **Дописать `git add docs/procedure-runs/ docs/evidence/` в шаг `ritual:evening`** — без этого uncommitted хвост санитарных вещдоков воспроизведётся в следующем цикле; правка в `package.json` или скрипте ритуала, проверяется `git diff --staged` после вечернего прогона.

## Перспективные

- Созыв **M5** (наборы звуков при переходе тарифа) становится разблокированным сразу после того, как M3/M4 получат зелёный статус — повестка и состав уже описаны в ветке rescue.
- **`sanitation-tails`** (хвосты второго и третьего санитарных дней) — issue #2345 (TS2305 в Membrana-tooling), oversized-коммит `4eb64dfa` (648 строк без диффа), warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115` — после доставки M0–M4 в ствол тянуть именно этот список, не новые.
- **`night-hunt-trigger-fix`** (третий кандидат снимка владельца) — готов к открытию после того, как тарифные совещания осели в стволе и хвосты санитарии закрыты; не трогать сегодня.

## Экспериментальные

- **Проба: предикат свежести дерева через `git log -1 --format=%ct`** — проверить, работает ли чистая функция как замена ручному взгляду на актуальность воркдерева (кандидат из DAY_PLAN.md, Математик).
- **Проба: `git add docs/procedure-runs/ docs/evidence/` одной строкой в `ritual:evening`** — проверить, исчезнет ли воспроизводящийся uncommitted хвост санитарных вещдоков без сторонних изменений.
- **Проба: пройтись по 39 файлам rescue-ветки с `grep -l '2026-09-12'`** — автоматически отсечь файлы 12.09 перед cherry-pick/merge, чтобы не затереть сегодняшние артефакты вручную.

## Санитарные

- Закрыть `procedure-run ritual-day-2026-09-17-r2` close-записью в `docs/procedure-runs/2026-09-17.jsonl` — риск немого «зелёного» (B6)
- Дописать `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening` — uncommitted хвост воспроизводится без этого
- Разобрать oversized-коммит `4eb64dfa` (648 строк) — вердикт вечернего ревью невозможен без диффа; P0 по шкале ревью
- Починить warning `react-hooks/exhaustive-deps` в `CabinetSampleDuplicatesPanel.tsx:115` — тянется с вечернего ревью 17.09
- Проверить статус issue #2345 (TS2305 в `Membrana-tooling`) — вчера не отражён в коммитах; уточнить, не закрыт ли артефактом дерева

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль дня — `tariff-transitions-live`, выбор владельца №1 из замороженного снимка | сессия | `docs/tasks/main-day-assertions.json` → `sources[0]`, owner-choice@chat/magistral-18-09 | 2026-09-18 |
| Матрица тарифов в стволе несёт растущий буфер (512/2048/4096 MiB), ratifiedAt 2026-09-08 | код | `docs/containers/strategic-docs/granules/tariff-buffer/resource.json`, ствол 82134d5d, ЗАМЕР утра 18.09 | 2026-09-18 |
| 39 файлов совещаний M0–M4 отсутствуют в стволе, живут в ветке rescue | код | `git log` + факт rescue-ветки, зафиксированный в sources[0].claim | 2026-09-18 |
| M3 (повышение тарифа) прогон 2 отклонён; M4 (понижение и холод) прогон 2 отклонён; M5 не созван | сессия | sources[0].claim (слово владельца 18.09) | 2026-09-18 |
| Правка руками `docs/tariffs/tariff-grid.json` запрещена (T16); `yarn tariff:reseed` — единственный источник | код | `docs/tariffs/tariff-grid.json` + комментарий T16 в sources[0].claim | 2026-09-18 |
| DAY_PLAN несёт ту же магистраль tariff-transitions-live первым кандидатом | план | `docs/DAY_PLAN.md` canon-digest df495e45, сгенерирован 2026-09-18T13:12:16Z | 2026-09-18 |
| **Расхождение** · `docs/DAY_PLAN.md` называет три кандидата (angelina-hostess-impl · assets-container · batch-collection-run-contour) и прямо пишет «Выбор магистрали — слово владельца»; `sources[0]` несёт иной выбор (tariff-transitions-live). Расхождение возникло потому, что `main-day-assertions.json` перечеканён 18.09 под tariff-transitions-live, а `DAY_PLAN.md` сгенерирован несколько раньше и отражает снимок топ-3 до слова владельца. **Магистраль взята из `sources[0]` как более позднее волеизъявление владельца. `main-day-assertions.json` и `DAY_PLAN.md` не синхронизированы — перечеканка DAY_PLAN каноном предписана и не сделана.** | — | — | — |

*Голоса: первоисточников различных — 4 (owner-choice 18.09 · замер ствола 82134d5d · git-факт rescue-ветки · DAY_PLAN canon-digest). DAY_PLAN и DAILY_STANDUP — отражения одного и того же утреннего прогона; суммарный вес равен одному.*

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| Файлы совещаний M0–M4 отсутствуют в стволе | `file:docs/meetings/tariff-single-truth/M0-agenda.md` (или любой из 39 файлов rescue-ветки в пути docs/meetings/) | `holds` — файлов в стволе нет, rescue-ветка является единственным местом их существования согласно sources[0].claim |
| M3/M4 переходы тарифа не завершены (прогон 2 отклонён) | `file:docs/meetings/tariff-single-truth/M3-run2-accepted.md` | `holds` — файл приёмки прогона 2 отсутствует в стволе |
| M5 не созван | `file:docs/meetings/tariff-single-truth/M5-agenda.md` | `holds` — agenda M5 отсутствует в стволе |

## Сегодня делаем

1. Отфильтровать файлы 12.09 из rescue-ветки (`grep -rl '2026-09-12' rescue/...` или по именам DAILY_CODE_REVIEW / morning-gates-state / DAILY_AUDIT) — получить точный список 39 − N файлов для доставки.
2. Доставить отфильтрованные файлы M0–M4 в ствол (cherry-pick или явный cp + commit) — коммит появляется в `git log --oneline`.
3. По доставленным материалам прочитать разборы M3/M4 и письменно назвать: что именно отклонено в прогоне 2 (конкретный предикат или сценарий перехода тарифа).
4. Закрыть `procedure-run ritual-day-2026-09-17-r2` close-записью в `docs/procedure-runs/2026-09-17.jsonl`.
5. Дописать `git add docs/procedure-runs/ docs/evidence/` в `ritual:evening` (package.json или скрипт ритуала) и убедиться, что `git diff --staged` после вечернего прогона не пуст по этим путям.
6. Зафиксировать письменный ответ: «M3/M4 — вот что сломано» **или** «M3/M4 зелёные, M5 разблокирован, повестка прилагается».

## Definition of Done (фокус)

- [ ] В стволе появился коммит с материалами M0–M4 (без файлов 12.09); `git log --oneline` подтверждает.
- [ ] Файлы 12.09 (DAILY_CODE_REVIEW / morning-gates-state / DAILY_AUDIT) в ствол не попали — сегодняшние артефакты не затёрты.
- [ ] Письменно зафиксирован статус M3/M4: конкретный неработающий предикат перехода тарифа **или** «оба зелёные».
- [ ] `procedure-run ritual-day-2026-09-17-r2` несёт close-запись с `status:success` в `docs/procedure-runs/2026-09-17.jsonl`.
- [ ] `ritual:evening` дописан строкой `git add docs/procedure-runs/ docs/evidence/`; uncommitted хвост не воспроизводится при следующем прогоне.
- [ ] `docs/tariffs/tariff-grid.json` не правился руками (T16 соблюдён); при необходимости пересева — только `yarn tariff:reseed`.
- [ ] Расхождение DAY_PLAN ↔ sources[0] зафиксировано в MAIN_DAY_ISSUE (выполнено в таблице обоснования); перечеканка DAY_PLAN поставлена задачей в «санитарные» следующего дня.

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — кандидат DAY_PLAN, но магистраль владельца выбрана иная (sources[0]); без нового слова владельца не открываем.
- **`assets-container`** — аналогично; второй кандидат DAY_PLAN, не выбран владельцем 18.09.
- **`batch-collection-run-contour`** — примыкает к предикату `secret-parser-built`, но является следующим шагом после его прохождения; сегодня не запускаем.
- **`night-hunt-trigger-fix`** — третий кандидат снимка владельца; открывается после закрытия тарифных хвостов.
- **DSP-бенчмарки (harmonic / cepstral / spectral-flux на free-v1)** — потолок эшелона 0 зафиксирован, повтор без смены датасета не даёт нового знания (FFT_METRICS_POTENTIAL_AND_LIMITS.md §6).
- **`mfcc-compare-sprint` в код** — worktree не вычищен до нуля (issue #2345 в статусе «разобрать»); новый код в нестабильной среде создаёт шум.
- **`yarn code-review` / ревью oversized-коммита `4eb64dfa`** — разбор P0, но блокирует вечер, не утро; ставим в вечерний ритуал после доставки M0–M4 в ствол.

## Вторично (если останется время)

- Разбор oversized-коммита `4eb64dfa` через `yarn code-review:pr` или ручной `git diff 4eb64dfa^..4eb64dfa` — P0 по шкале ревью, не нит.
- Проверить issue #2345 (TS2305 в `Membrana-tooling`): открыть карточку, установить причину (артефакт дерева codex/server-guards-20260825 vs реальный сбой), зафиксировать статус комментарием.

## Зависимости и риски

- **Блокер 1:** rescue-ветка `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` должна быть доступна локально (`git fetch` + checkout); если ветка удалена или не синхронизирована — доставка невозможна без её восстановления.
- **Блокер 2:** файлы 12.09 должны быть точно идентифицированы до merge/cherry-pick; ошибка в фильтре затрёт сегодняшний DAILY_CODE_REVIEW / morning-gates-state — риск потери контекста утра.
- **Риск:** материалы M3/M4 могут содержать ссылки на артефакты, которые ещё не влиты в ствол — тогда доставка материалов совещаний не снимет блокер M5 сама по себе; нужен явный список зависимостей из разборов.
- **Расхождение DAY_PLAN ↔ main-day-assertions.json** не снято автоматически: перечеканка DAY_PLAN под tariff-transitions-live предписана каноном и не сделана — риск того, что завтрашний генератор снова выдаст angelina-hostess-impl / assets-container как кандидатов без пометки «уже выбрана иная».

## Ссылки

- [`docs/DAILY_STANDUP.md`](../docs/DAILY_STANDUP.md) — стендап 2026-09-18
- [`docs/tasks/main-day-assertions.json`](../docs/tasks/main-day-assertions.json) — источник магистрали (sources[0], owner-choice@chat/magistral-18-09)
- [`docs/DAY_PLAN.md`](../docs/DAY_PLAN.md) — план дня (canon-digest df495e45, сгенерирован 13:12 18.09)
- [`docs/STRATEGY_DAY.md`](../docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`
- [`docs/containers/strategic-docs/granules/tariff-buffer/resource.json`](../docs/containers/strategic-docs/granules/tariff-buffer/resource.json) — тарифная матрица буфера, ратифицирована 2026-09-08
- [`docs/tariffs/tariff-grid.json`](../docs/tariffs/tariff-grid.json) — производная матрица тарифов (только через `yarn tariff:reseed`, T16)
- rescue-ветка: `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` — 39 файлов M0–M4