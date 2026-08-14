<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-14
  archived-at: 2026-08-14T16:52:18.587Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-14T04:59:26.393Z (yarn main-day-issue@3d7dfd00) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"1aef04fb607332802084a7a85123f88c0e6d9c6d","digest":"e3578b7b71a3fcf17ae431124d331c17d00ba49e08dec7e02a0c608f2ccb7c66"},"DAILY_STANDUP":{"version":"1aef04fb607332802084a7a85123f88c0e6d9c6d","digest":"0b467c34df661a659d98c750e69644ff50f73a691c5144fe2fe219c4d5532822"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: static-mmbrn-live-inventory, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, archivarius-sessions-container, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-08-14

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `archivarius-sessions-container` |
| `primaryTitle` | Построить живой ingest-эндпоинт archivarius-sessions-container с подтверждённым trace |
| `githubIssue` | #1330 |
| `size` | L |
| `promptPath` | docs/prompts/archivarius-sessions-container_PROMPT.md |
| `сгенерировано` | 2026-08-14 |

## Магистраль

**`archivarius-sessions-container`** (L, #1330) — контейнер сессий Archivarius: Mongo office, адресуемые span, ingest/search с секрет-маской.

Магистраль взята из `sources[0].claim` (`main-day-assertions.json`, выбор владельца от 13.08) и подтверждена `morning-gates-state.json` (`magistral: "archivarius-sessions-container"`, дата гейта 14.08). Оба источника владельческие; гейт свежее assertions — расхождение не замалчивается: **магистраль взята с гейта, assertions не перечеканены** (канон предписывает перечеканку до конца дня).

Первый шаг — до любого кода: проверить существование тела `yarn main-day-probe` (`cat package.json | grep main-day-probe`) и получить именованный вердикт по трём посылкам. Параллельно — поимённое ревью oversized PR #1907 (archivarius) и #1908 (network M1–M7): Vesnin зафиксировал скрытый C1-риск в фундаменте archivarius вечером 13.08, ingest-слой на непроверенном фундаменте кладётся под удар.

**Критерий успеха к вечеру:** вечерний протокол команды содержит живой trace вызова `sessionIngest` с реальным span (uuid, timestamp, sessionId, maskedPayload) — или письменный диагноз блокера с указанием PR и причины.

## Подкрепление

- **Preflight через `yarn main-day-probe`** — три дня подряд посылки возвращают `unknown` вместо `holds`/`violated`; проверить существование тела скрипта (`cat package.json | grep main-day-probe`) и получить письменный вердикт по `sessionIngest`, `span-schema.ts`, `searchSpan` до первой строки кода. Без этого paттерн 11–13.08 воспроизводится четвёртый день.
- **Поимённое ревью PR #1907 и #1908** — оба лежат в фундаменте магистрали; PR #1907 касается archivarius напрямую, PR #1908 — сетевого слоя M1–M7; C1-риск, зафиксированный Vesnin 13.08, должен быть закрыт письменным вердиктом по каждому PR до старта реализации ingest-эндпоинта.

## Перспективные

- Подтверждённый живой вердикт `yarn main-day-probe` откроет следующий день без повтора паттерна 11–13.08 — три `unknown` подряд блокируют любую будущую магистраль, именованный вердикт снимает этот системный риск навсегда.
- Закрытие ревью PR #1907 и #1908 откроет реальный старт ingest-слоя на верифицированном фундаменте — span-schema.ts и searchSpan можно будет класть поверх проверенной сети.
- Построенный парсер-резак `night-triage-secret-scan.mjs` (веха `secret-parser-built`) стоит вплотную к магистрали: контейнер сессий несёт требование секрет-маски, и переход вехи снимет заморозку на правку архива.

## Экспериментальные

- Прогнать `night-triage-secret-scan.mjs` на одной заведомо «грязной» фикстуре (не прод): узнать, режет ли модуль `scripts/lib/secret-redact.mjs` ключ до записи в архив или только детектирует паттерн — граница между детектором и резаком критична для секрет-маски ingest.
- Сверить один живой ключ из `credential-rotation-biweekly` с черновиком манифеста ротации без выпуска: выяснить, хватает ли полей манифеста, чтобы закрыть критерий «датированный проход» вехи `secret-parser-built`.
- Один холостой вызов `yarn main-day-probe` против посылок `secret-parser-built`: выяснить, возвращает ли probe `holds`/`violated` или снова `unknown` из-за отсутствующего тела — это разделит дефект инструмента и дефект посылки.

## Санитарные

- **`yarn main-day-probe` три дня даёт `unknown`** — проверить существование тела скрипта в `package.json` до любой другой работы; без именованного вердикта probe — системный риск дня (Тарасов, резюме 13.08).
- **Ревью-долг PR #1907 и #1908 не закрыт поимённо** — фундамент магистрали под C1-риском; ревью обязательно до старта кода (Vesnin, фидбек 13.08).
- **`makeIsIgnored`: exit-код `git check-ignore` ≠ 0/1 бросает необработанный throw** — заменить именованным исходом; паттерн найден, правка маленькая (Ozhegov, фидбек 13.08).
- **9 мёртвых душ реестра** (Issue закрыт, карточка активна) — повердиктить и `task:archive` со свидетельством; бухгалтерия реестра накапливает дрейф (рука 12.08).
- **`aria-live="polite"` на блок `promo-deny-text` отсутствует** — `aria-describedby` объявляет связь, но не объявляет смену значения экранному читателю (Rodchenko, фидбек 13.08).

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Владелец выбрал `archivarius-sessions-container` магистралью | owner-choice (1 источник) | `chat/magistral-13-08` → `main-day-assertions.json sources[0]` | 2026-08-13 |
| Гейт утра несёт `magistral: "archivarius-sessions-container"` с сегодняшней датой | гейт (1 источник, свежее assertions) | `morning-gates-state.json` | 2026-08-14 |
| **Расхождение: магистраль взята с гейта, assertions не перечеканены** — оба источника владельческие, спор решается свежестью гейта; перечеканка `main-day-assertions.json` предписана каноном и не сделана — это находка, не замалчиваемая | расхождение двух владельческих источников | `morning-gates-state.json` vs `main-day-assertions.json` | 2026-08-14 |
| Дрейф три дня подряд: ingest/span-schema/searchSpan не появились 11.08, 12.08, 13.08 | сессия (фидбек команды, 1 источник) | `DAILY_STANDUP.md`, протоколы 11–13.08 | 2026-08-13 |
| Oversized PR #1907 и #1908 несут C1-риск в фундаменте archivarius | код / issue (1 источник) | Vesnin, фидбек-запись 13.08 | 2026-08-13 |
| `yarn main-day-probe` три дня даёт `unknown` — тело скрипта не проверено | план / сессия (1 источник, 3 отражения) | Тарасов, резюме 13.08 | 2026-08-13 |

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `sessionIngest` в archivarius-sessions-container не реализован | `symbol:sessionIngest` в `packages/services/archivarius/**` | unknown — тело `yarn main-day-probe` не подтверждено; требует прогона |
| `span-schema.ts` не существует в archivarius | `file:packages/services/archivarius/src/span-schema.ts` | unknown — требует прогона probe |
| `searchSpan` не реализован | `symbol:searchSpan` в `packages/services/archivarius/**` | unknown — требует прогона probe |

> Все три посылки в статусе `unknown` по одной причине: тело `yarn main-day-probe` не подтверждено три дня подряд. Первый шаг дня — `cat package.json | grep main-day-probe`, именованный вердикт, и только затем — код.

## Сегодня делаем

1. `cat package.json | grep main-day-probe` — получить письменный вердикт: скрипт существует или нет; зафиксировать результат текстом.
2. Прогнать `yarn main-day-probe` (если тело есть) по трём посылкам (`sessionIngest`, `span-schema.ts`, `searchSpan`); получить `holds`/`violated`/`unknown` по каждой — зафиксировать в дневном протоколе.
3. Поимённое ревью PR #1907 (archivarius): письменный вердикт по C1-риску — блокирует ingest или нет.
4. Поимённое ревью PR #1908 (network M1–M7): письменный вердикт — влияет ли на archivarius ingest-слой.
5. При `holds` по всем трём посылкам и зелёных ревью — реализовать ingest-эндпоинт: `sessionIngest` → `span-schema.ts` → `searchSpan` с секрет-маской.
6. Вызвать `sessionIngest` с тестовым span (uuid, timestamp, sessionId, maskedPayload) и зафиксировать живой trace в вечернем протоколе.
7. Перечеканить `main-day-assertions.json` под сегодняшнюю магистраль (снять расхождение с гейтом — канон предписывает, не сделано).

## Definition of Done (фокус)

- [ ] `cat package.json | grep main-day-probe` дал письменный вердикт (скрипт есть / нет) — зафиксировано в протоколе.
- [ ] `yarn main-day-probe` вернул именованный вердикт (`holds`/`violated`) по каждой из трёх посылок — не `unknown`.
- [ ] PR #1907 и PR #1908 закрыты поимённым письменным вердиктом по C1-риску до старта кода.
- [ ] `sessionIngest` реализован и вызывается без необработанного исключения.
- [ ] `span-schema.ts` существует в `packages/services/archivarius/src/`.
- [ ] `searchSpan` реализован и возвращает результат по sessionId.
- [ ] Вечерний протокол содержит живой trace (uuid, timestamp, sessionId, maskedPayload) **или** письменный диагноз блокера с указанием PR и причины.

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — рекомендация Тимлида третий день; владелец сознательно уступил контейнеру сессий словом 13.08; возвращается завтра с probe-вердиктом как условием входа.
- **`assets-container`** — весомый кандидат, но два незакрытых L-блока параллельно воспроизводят паттерн 11–13.08; берётся после письменного вердикта по archivarius.
- **DSP-бенчмарки и прогон harmonic/cepstral/flux на free-v1** — потолок эшелона 0 зафиксирован (FFT_METRICS §6); повтор без смены датасета или fusion не даёт новой информации.
- **Перечеканка `main-day-assertions.json` до вердикта probe** — фиксирует фантомную посылку, воспроизводит паттерн четвёртый день; перечеканка — пункт 7 «сегодня делаем», после вердикта.

## Вторично (если останется время)

- Закрыть 9 мёртвых душ реестра командой `task:archive` со свидетельством по каждой — бухгалтерия накапливает дрейф.
- Исправить `makeIsIgnored`: заменить необработанный throw при exit-коде `git check-ignore` ≠ 0/1 именованным исходом (правка маленькая, изолированная).

## Зависимости и риски

- **Блокер 1:** тело `yarn main-day-probe` не подтверждено — если скрипт отсутствует в `package.json`, посылки останутся `unknown` и ingest-слой кладётся вслепую; диагноз обязателен до кода.
- **Блокер 2:** PR #1907 несёт C1-риск в archivarius по оценке Vesnin 13.08 — без поимённого ревью ingest-эндпоинт строится на непроверенном фундаменте.
- **Риск:** расхождение `morning-gates-state.json` и `main-day-assertions.json` не перечеканено; если не закрыть сегодня пунктом 7, завтра генератор снова прочитает устаревший sources[0] и предложит фантом.
- **Риск:** секрет-маска ingest зависит от `scripts/lib/secret-redact.mjs`; если резак не покрывает формат span — maskedPayload в trace будет грязным, и критерий DoD не выполнен.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md)
- [Task-промпт archivarius-sessions-container](docs/prompts/archivarius-sessions-container_PROMPT.md)
- [GitHub Issue #1330](https://github.com/membrana/membrana/issues/1330)
- [PR #1907 (archivarius, oversized)](https://github.com/membrana/membrana/pull/1907)
- [PR #1908 (network M1–M7, oversized)](https://github.com/membrana/membrana/pull/1908)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md §6](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json)
- [morning-gates-state.json](docs/tasks/morning-gates-state.json)