<!-- Сгенерировано: 2026-08-28T08:46:45.380Z (yarn main-day-issue@6f08dd35) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"63326cb34a2e713295f30cf574111e30fe397a10","digest":"a074412297cda2275aa7d2f38a2ee28e7ca32b4e0679e101e06c67522cc2c65b"},"DAILY_STANDUP":{"version":"63326cb34a2e713295f30cf574111e30fe397a10","digest":"51936dd7e95f21909886fb3169f8b49490f8c189b08f66ef26d301b1d12d5e2e"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-28

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `buffer-control-plugin-2204` |
| `primaryTitle` | Green-тесты media-буфера + воспроизводимый стоп по remaining/порогу (#2204) |
| `githubIssue` | #2204 |
| `size` | M |
| `promptPath` | — (карточка/issue #2204; плагин управления буфером) |
| `сгенерировано` | 2026-08-28 |

## Магистраль

**buffer-control-plugin-2204 (#2204)** — день дежурства 28.08: добить мандат владельца по управлению буфером до проверяемого закрытия. Вчера в ствол ушли ядро и dual-mount, но вечерний BLOCK остаётся: RED `@membrana/media-library-service` / `@membrana/background-media` и в развёрнутом диффе нет проверяемого DoD п.3 (remaining + порог стопа + сигнал наружу). Без green-тестов и фальсифицируемого стопа квота на живом дежурстве снова упирается в «кнопки без продуктового стопа»; принимать GC/UI за закрытие #2204 или уходить в L из top-3 DAY_PLAN запрещено. Два режима плагина (стоп сценария при заполнении; управляемый GC — ранние/поздние × 20/50/100/200) уже в контуре — сегодня не расширять scope, а сделать гигиену и стоп доказуемыми.

**Критерий успеха к вечеру:** `turbo test` (или эквивалент фильтра) по media-library + background-media → **green**; стоп сценария по порогу remaining воспроизводим предикатом **или** в #2204 лежит явная gap-таблица по п.3 DoD; smoke частичной разгрузки ≠ wipe-all на буфере узла зафиксирован; вещдоки перед GC «самые ранние» проверены на битые ссылки.

## Подкрепление

- **Smoke частичной разгрузки буфера узла** (не wipe-all): один прогон «снять N / порог remaining» с наблюдаемым remaining до/после и без полной зачистки квоты — держатель квоты до дежурства.
- **Проверка ссылок вещдоков перед GC «самые ранние»:** выборка «самые ранние» не должна молча сносить пробы, на которые ссылается приёмочный документ (урок 22.08 / граница ведущей 27.08); список ссылок или skip-list до удаления.

## Перспективные

- Закрытие гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) — веха горизонта #592 в фазе approaching; снимает амнистию правок архива, **не** primary coding-focus пятницы дежурства.
- После green/#2204: oversized-хвосты #2208/#2211/#2212 и play-path #2177 — только если цепляют прод/квоту.
- L-кандидаты реестра (`angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour`) — после закрытия BLOCK по #2204 и слова владельца; сегодня сознательно не магистраль.

## Экспериментальные

- Dry-run резака `night-triage-secret-scan` / `secret-redact` на одной копии архивной сессии: режет ли границы секрета целиком или оставляет читаемый хвост (без записи обратно).
- Черновик манифеста ротации только на заведомо протухших/фейковых ключах одного датированного прохода — хватает ли полей «засветил → перевыпустил → подтвердил» до боевого biweekly.
- Сверка одного бэкапа «до резака» vs «после» на объёме: уходит ли сырой фрагмент в путь бэкапа (инвариант «секреты до бэкапа»).

## Санитарные

- P0: довести до **green** прогон `media-library-service` / `background-media` — красные тесты с вечера 27.08, блокер гигиены и #2204.
- Хвост DoD #2204 п.3: стоп по порогу (remaining + сигнал наружу) не доказан в диффе — gap-таблица **или** воспроизводимый предикат.
- `main-day-assertions.json`: sources[0] уже мандат 28.08/#2204 (owner-choice); следить, чтобы recut не отставал от гейта при следующих выборах (норма У1).
- Claims-probe 27.08: в scripts нет удобного `yarn turbo run test --filter=…` как единого ярлыка; карточек `media-library-service` / `background-media` нет в registry — не маскировать RED отсутствием карточки.
- Oversized-хвосты #2208/#2211/#2212 — точечно, только если бьют квоту/прод на дежурстве.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `buffer-control-plugin-2204` (#2204): green media-тесты + DoD п.3 стоп по remaining | сессия | owner-choice@chat/magistral-28-08 → `main-day-assertions.json` sources[0] | 2026-08-28 |
| Продолжение вчерашнего выбора: плагин буфера (стоп + GC), дежурство 28.08, квота ~40 мин / 79% | сессия | owner-choice@chat/magistral-27-08 → sources[1], frozen top-3 | 2026-08-27 |
| Фокус стендапа совпадает: #2204 green + стоп; L из DAY_PLAN top-3 не магистраль | план | `docs/DAILY_STANDUP.md` (yarn standup), фокус дня | 2026-08-28 |
| Вечерний BLOCK: RED media-library / background-media; п.3 DoD не в диффе | issue / код | #2204 + вечерний code-review 27.08 (входы стендапа) | 2026-08-27 |
| Генератор DAY_PLAN top-3 (angelina-hostess / assets-container / batch-collection) — **не** выбор владельца; ведущая отложила снимок | план | `docs/DAY_PLAN.md` + sources[0] (отвод ведущей) | 2026-08-28 |
| Веха горизонта `secret-parser-built` — approaching, подкрепление/эксперимент, не primary | план | `docs/STRATEGY_DAY.md` / day-horizon.json #592 | 2026-08-28 |
| FFT / Этап 1.A / benchmark harmonic+cepstral+flux — не магистраль (потолок эшелона 0) | код | `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6 + detection-planning-priorities | 2026-06… |

**Голоса:** 1 владелецский источник на сегодня (sources[0], 28.08) задаёт магистраль; sources[1] (27.08) — тот же эпик, коррелированное продолжение (**1 линия owner-choice #2204, 2 датированных отражения**). Стендап и санитарные DAY_PLAN — отражения той же линии BLOCK/дежурства, не независимый выбор. Top-3 генератора плана **расходится** с владельцем и **не** синтезируется в магистраль (запрет probe 16.07 / 18.07).

Расхождение У1: живой sources[0] уже 28.08/#2204 — с гейтом утра согласован по смыслу; отдельной строки «магистраль с гейта, assertions не перечеканены» нет (assertions свежие). Если `morning-gates-state.json` позже перепишет magistral при stale sources — тогда явная строка обязательна.

## Посылки

Развилки A/B «работы ещё нет» нет: эпик в работе, ядро/dual-mount в стволе; назначение дня — **добить** green + п.3 DoD, а не доказать отсутствие символа.

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Тестовый контур media ещё RED / не принят как green к дежурству | test-фильтр `@membrana/media-library-service` + `@membrana/background-media` (turbo/package test) | `unknown` → к вечеру должен стать green или явный fail-log в #2204 |
| DoD п.3 (стоп по remaining + сигнал наружу) не зафиксирован как воспроизводимый предикат в диффе | symbol/file по стоп-предикату буфера / gap-таблица в #2204 | `unknown` — при отсутствии маркера в коде допустима **явная gap-таблица**, не тихий «сделано» |

`issue open` сам по себе **не** посылка. Развилки «нет работы → строить с нуля» нет; посылок отсутствия, блокирующих назначение, нет.

## Сегодня делаем

1. Прогнать и починить до **green** тесты `@membrana/media-library-service` и `@membrana/background-media` (фиксированный командный вызов + лог в #2204 при residual RED).
2. Закрыть DoD #2204 п.3: воспроизводимый стоп сценария по **remaining/порогу** с сигналом наружу **или** gap-таблица «что есть / чего нет / следующий шаг» в #2204.
3. Smoke частичной разгрузки буфера узла (не wipe-all): remaining до/после, сценарий не обнуляет квоту целиком.
4. Перед любым GC «самые ранние» — проверка ссылок вещдоков (пробы 22.08 / приёмочные доки); skip или отчёт.
5. Короткий статус в #2204 к концу дня: green|residual, стоп|gap, smoke, вещдоки — без подмены закрытия UI-only.

## Definition of Done (фокус)

- [ ] `media-library-service` + `background-media` тестовый прогон **green** (или приложенный fail-log + список оставшихся RED с владельцем)
- [ ] Стоп сценария по порогу **remaining** воспроизводится одним согласованным шагом (предикат/тест/ручной протокол с ожидаемым сигналом наружу)
- [ ] **Или** в #2204 опубликована gap-таблица по п.3 DoD без претензии «закрыто»
- [ ] Smoke частичной разгрузки ≠ wipe-all зафиксирован (артефакт/комментарий)
- [ ] GC «самые ранние» не выполняется вслепую по вещдокам; есть check ссылок или явный skip
- [ ] #2204 обновлён итогом дня (не только UI/GC как суррогат DoD)
- [ ] Магистраль не подменена L из generator top-3 без нового owner-choice

## Сознательно не делаем сегодня

- Новый L-эпик из top-3 DAY_PLAN: `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` как магистраль
- `secret-parser-built` / резак / ротация ключей с выкладкой — горизонт и эксперимент, не primary coding-focus дежурства
- FFT / «Этап 1.A» / benchmark harmonic+cepstral+flux / `detector-scoreboard` как витрина
- Oversized #2208/#2211/#2212 и play-path #2177 — если не цепляют прод/квоту сегодня
- Приём GC/UI за полное закрытие #2204 без green и п.3

## Вторично (если останется время)

1. Точечный oversized-хвост (#2208/#2211/#2212), только если бьёт квоту на дежурстве.
2. Черновик dry-run secret-redact / поля манифеста ротации (без закрытия вехи и без амнистии архива).

## Зависимости и риски

- **Блокер:** RED media-тесты с 27.08 — без green дежурство и квота небезопасны.
- **Риск подмены DoD:** закрыть «кнопки GC» без стопа по remaining и сигнала наружу.
- **Риск вещдоков:** GC «самые ранние» сносит пробы с приёмочными ссылками.
- **Риск расползания:** generator top-3 и веха `secret-parser-built` оттягивают день от #2204.

## Ссылки

- [docs/DAILY_STANDUP.md](./DAILY_STANDUP.md) — фокус #2204, BLOCK, «не делаем»
- [docs/DAY_PLAN.md](./DAY_PLAN.md) — top-3 кандидаты (не owner-magistral), санитарные
- [docs/STRATEGY_DAY.md](./STRATEGY_DAY.md) — веха `secret-parser-built`
- [docs/tasks/main-day-assertions.json](./tasks/main-day-assertions.json) — sources[0] owner 28.08
- GitHub Issue **#2204** — buffer-control / media buffer DoD
- [docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — почему FFT не магистраль