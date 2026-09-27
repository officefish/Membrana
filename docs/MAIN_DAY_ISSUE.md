<!-- Сгенерировано: 2026-09-27T09:32:42.621Z (yarn main-day-issue@5cf6539e) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"5b65e02b109167289e1724aeaa4b72d4adcb4743","digest":"65d8188fed683dd5c15bc578b8139984a8ce8a96500ef2f6124554021a469b3b","versionAt":"2026-09-26T14:43:18+03:00"},"DAILY_STANDUP":{"version":"5b65e02b109167289e1724aeaa4b72d4adcb4743","digest":"3ea9d98f4e4f42309aab20969617361f264a7f80fffa6e0fa311244d5cefe84b","versionAt":"2026-09-26T14:43:18+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE · Membrana · 2026-09-27

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Пересборка образа офиса и прохождение rollout день 3 |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` |
| `сгенерировано` | 2026-09-27 |

---

## Магистраль

**Магистраль взята с `sources[0].claim` из `docs/tasks/main-day-assertions.json` — это прямой выбор владельца от 24.09 (ответ «1» на замороженный снимок топ-3: `cabinet-registration-rollout` · `tooling-guards-day` · `tariff-transitions-live-day3`). Синтез из входов запрещён, пока owner-source задан.**

> ⚠️ **Расхождение зафиксировано (норма У1, 31.07):** `docs/tasks/main-day-assertions.json` несёт `sources[0]` с датой 24.09; `docs/tasks/morning-gates-state.json` в стендапе за 27.09 не содержит поля `magistral` с сегодняшней датой (генератор стендапа прямо пишет «магистраль владельцем ещё не выбрана»). Следовательно, более свежего гейтового выбора НЕТ — `sources[0]` остаётся единственным владельческим источником. **Магистраль взята с `assertions.sources[0]`, `morning-gates-state` не перечеканен под 27.09 — перечеканка предписана каноном и не сделана; это сама по себе находка, требующая фиксации.**

**`cabinet-registration-rollout`** — выкатка кабинетного контура, третий день. Образ офиса не собран из-за несовместимости `RunRecord.mountTarget` для `background-cabinet/journal`; старый офис работает здоровым (`/health` 200, внешний смоук 5 ok), прод не тронут (fail-closed соблюдён). Исходники ствола чисты (`turbo build --filter=@membrana/background-office` зелёный дважды — из кеша и с `--force`). Класс отказа: устаревшие собранные пакеты соседей в образе (рецидив 21.08 и 27.08, `verify:image-workspace-deps`). `cabinet.env` на сервере не содержит `OFFICE_URL`/`OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=false`.

**Критерий успеха к вечеру:** новый образ офиса собран с `--no-cache`, `docker push` выполнен, `verify:image-workspace-deps` зелёный, `/health` нового контейнера 200, пишущий смоук панели (шаг 6, живая дверь) пройден без ошибок, `cabinet.env` дополнен `OFFICE_URL`/`OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=false` → `true` (или по плану встречи), rollout-чеклист закрыт на сегодняшнюю дату.

---

## Подкрепление

- **Написать синтетический тест `sequence`-контракта** в `night-summary.test.mjs` (XS, Математик/Dynin): два пересекающихся `runId` с `sequence:1` → ожидаем монотонный счётчик. Прямой технический предикат гейта `secret-parser-built` — четвёртый день заблокирован именно из-за этого нарушения; без теста гейт технически непроходим и амнистия архива не снимается.
- **Закрыть lint `titleOf`** (`react-hooks/exhaustive-deps`) в `apps/cabinet` (XS, Верстальщик/Rodchenko): снимает CI-шум четвёртый день, расчищает путь к пересборке rollout и к чистому прогону `office-image-smoke`-ворклоу (который сейчас не покрывает `packages/background-cabinet/**` — системная причина молчания CI при правках кабинета).

---

## Перспективные

- Прохождение гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) снимает мораторий амнистии архива и разблокирует правку исторических транскриптов — ближайший горизонт после закрытия rollout.
- Добавление `packages/background-cabinet/**` в пути `office-image-smoke.yml` закроет системную дыру: образ офиса сейчас может ломаться молча при правках кабинета (именно это произошло 22.09 — CI не среагировал).
- Архитектурное ревью трёх oversized-PR (#2467, #2461, `36e88e71`) разблокирует нормальный поток мерджей и закроет ревью-долг третьего дня; его нельзя делать попутно — требует выделенного слота.

---

## Экспериментальные

- **Dry-run резака на одном архивном файле** (`scripts/lib/secret-redact.mjs`) — узнаем, не задевает ли агрессивный срез легитимные строки до первого датированного прохода; ложные срабатывания лучше найти до включения в ночной пайплайн.
- **Запуск `verify:image-workspace-deps` вручную на текущем образе** до `docker push --no-cache` — проверяем, стоит ли класс «устаревшие пакеты соседей» за отказом сборки rollout 24.09, прежде чем чинить типы вслепую.
- **Синтетический `sequence`-тест с двумя пересекающимися `runId`** в режиме `--dry-run` против `2026-09-26.jsonl` — до коммита проверяем, ловит ли агрегатор нарушение монотонности, которое четвёртый день молчит в trail.

---

## Санитарные

- Закрыть lint `titleOf` (`react-hooks/exhaustive-deps`) в `apps/cabinet` — XS, четвёртый день висит без фиксации
- Написать синтетический тест `sequence`-контракта в `night-summary.test.mjs` — два `runId` с `sequence:1`, монотонный счётчик; гейт `secret-parser-built` непроходим без этого
- Пометить `night-hunt-graph.test.ts` тегом `integration` или зафиксировать фикстуру `yarn.lock` вместо хрупкого пути `../../../../../yarn.lock`
- Правка `CURRENT_TASK.md`: заменить устаревший `detector-scoreboard` на `cabinet-registration-rollout` — XS, третий день без фиксации
- Заполнить `root`/`fix` в friction-записях trail за 26.09 (`morning-care`/`angelina` fail без диагноза) — `root:null, fix:null` делают агрегатор слепым: манифест ротации ключей будет ложным
- Добавить `packages/background-cabinet/**` в пути `office-image-smoke.yml` — системная дыра, которая позволила образу сломаться молча 22.09

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `cabinet-registration-rollout` (ответ «1» на замороженный топ-3) | `docs/tasks/main-day-assertions.json` · `sources[0].claim` | Прямое слово владельца (owner-choice) | 24.09.2026 |
| Продолжение второго дня: выкатка остановлена по fail-closed, прод не тронут | `sources[0]` (замер утра 24.09 в теле claim) | Отчёт исполнителя выкатки · слово владельца | 24.09.2026 |
| Класс отказа — устаревшие пакеты соседей в образе (`verify:image-workspace-deps`) | `sources[0]` (замер ведущей: `turbo build` зелёный дважды) | Вывод `turbo run typecheck build --filter=@membrana/background-office` | 24.09.2026 |
| Стендап 27.09 подтверждает: rollout #2369 OPEN, статус не изменился | `docs/DAILY_STANDUP.md` P1-риски | Стендап 27.09 — **1 источник, отражение того же owner-choice** | 27.09.2026 |
| DAY_PLAN 27.09 выставляет rollout первым кандидатом из P1-рисков | `docs/DAY_PLAN.md` | DAY_PLAN — **1 источник, отражение того же owner-choice** | 27.09.2026 |
| ⚠️ **Расхождение:** `morning-gates-state.json` не несёт `magistral` за 27.09 — перечеканка `main-day-assertions.json` каноном предписана и не сделана | `docs/DAILY_STANDUP.md` («источник фокуса: нет») | `morning-gates-state.json` + `main-day-assertions.json` | 27.09.2026 |
| **Магистраль взята с `assertions.sources[0]` (24.09); гейтового выбора за 27.09 нет — `sources[0]` свежее** | норма У1, 31.07 | `docs/tasks/main-day-assertions.json` | 24.09.2026 |

> Стендап и DAY_PLAN — **1 источник, 2 отражения** одного owner-choice от 24.09. Суммарный вес равен весу одного. Независимых первоисточников два: owner-choice 24.09 и отчёт исполнителя (класс отказа).

---

## Посылки (фокус строится на «работа не завершена»)

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Новый образ офиса с исправленным `RunRecord.mountTarget` не собран и не задеплоен | `file:docs/evidence/rollout-cabinet-registration-2026-09-27.ok` (артефакт приёмки отсутствует) | `holds` |
| `cabinet.env` на сервере не содержит `OFFICE_URL`/`OFFICE_API_TOKEN` | `symbol:OFFICE_URL` в `scripts/` / `.env`-шаблонах кабинета (в `cabinet.env` на сервере — по замеру `sources[0]`) | `holds` |
| `office-image-smoke.yml` не покрывает `packages/background-cabinet/**` | `file:.github/workflows/office-image-smoke.yml` (путь background-cabinet отсутствует — зафиксировано в sources[0]) | `holds` |
| Тест `sequence`-контракта не написан → гейт `secret-parser-built` непроходим | `symbol:sequence` в `night-summary.test.mjs` (отсутствует — P1, четвёртый день по стендапу) | `holds` |

---

## Сегодня делаем

1. Получить дословный вывод отказа сборки образа от исполнителя — подтвердить или опровергнуть класс «устаревшие пакеты соседей» до любых правок кода.
2. Запустить `verify:image-workspace-deps` вручную на текущем образе; если подтверждён класс — пересобрать с `--no-cache`.
3. Выполнить `docker build --no-cache` → `docker push` нового образа офиса с исправленным `RunRecord.mountTarget`.
4. Прогнать внешний смоук + пишущий смоук панели (шаг 6, живая дверь) — зафиксировать 5 ok / 0 fail / 0 skip.
5. Дополнить `/etc/membrana/cabinet.env` парами `OFFICE_URL`/`OFFICE_API_TOKEN`; выставить `ALLOW_REGISTRATION` по плану встречи.
6. Написать синтетический тест `sequence`-контракта в `night-summary.test.mjs` (два `runId` с `sequence:1` → монотонный счётчик) — разблокирует гейт `secret-parser-built`.
7. Закрыть lint `titleOf` (`react-hooks/exhaustive-deps`) в `apps/cabinet` — XS, CI-шум четвёртый день.

---

## Definition of Done (фокус)

- [ ] Получен и зафиксирован дословный вывод отказа сборки образа; класс отказа подтверждён или опровергнут явно
- [ ] `verify:image-workspace-deps` прогнан на текущем образе; результат задокументирован
- [ ] Новый образ офиса собран с `--no-cache`, `docker push` выполнен, `docker inspect` несёт сегодняшний digest
- [ ] `/health` нового контейнера офиса возвращает 200; внешний смоук 5 ok / 0 fail
- [ ] Пишущий смоук панели (шаг 6, живая дверь) пройден без ошибок
- [ ] `/etc/membrana/cabinet.env` дополнен `OFFICE_URL`/`OFFICE_API_TOKEN`; `ALLOW_REGISTRATION` выставлен по плану встречи
- [ ] Rollout-чеклист `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` закрыт на 27.09

---

## Сознательно не делаем сегодня

- **Не берём `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`** — они кандидаты стендапа (план их ранжировал при отсутствии owner-choice), но `sources[0]` однозначен: магистраль — rollout.
- **Не ревьюим oversized-PR (#2467, #2461, `36e88e71`) попутно** — каждый требует выделенного архитектурного слота; попутный разбор создаёт ложное ощущение закрытости.
- **Не запускаем `batch-collection-run-contour` без консилиум-гейта** по модели исполнения.
- **Не повторяем DSP-бенчмарки на free-v1** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md §6`).
- **Не берём `mfcc-compare-sprint`, `dads-benchmark-bridge`** — блокированы до стабилизации rollout-среды (#2369 ещё OPEN).

---

## Вторично (если останется время)

- Добавить `packages/background-cabinet/**` в пути `office-image-smoke.yml` — XS, системная дыра, закрывает молчание CI при правках кабинета.
- Правка `CURRENT_TASK.md`: заменить `detector-scoreboard` на `cabinet-registration-rollout` — XS, третий день.

---

## Зависимости и риски

- **Блокер 1:** дословный вывод отказа сборки от исполнителя не получен — без него правка типов вслепую (класс отказа не подтверждён). Первый шаг дня — именно это.
- **Блокер 2:** `secret-parser-built` гейт непроходим без теста `sequence`-контракта — четвёртый день; если тест не написан сегодня, амнистия архива продолжает блокироваться.
- **Риск:** `office-image-smoke.yml` не покрывает `packages/background-cabinet/**` — образ может снова сломаться молча при следующей правке кабинета до патча ворклоу.
- **Риск:** расхождение `main-day-assertions.json` ↔ `morning-gates-state.json` (перечеканка предписана и не сделана) — если владелец сделает новый owner-choice сегодня утром, текущий документ устареет; перечеканить `main-day-assertions.json` при первой возможности.

---

## Ссылки

- [`docs/DAILY_STANDUP.md`](docs/DAILY_STANDUP.md) — стендап 27.09 (широкий вход)
- [`docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md`](docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md) — активный чеклист rollout
- [`docs/tasks/main-day-assertions.json`](docs/tasks/main-day-assertions.json) — `sources[0]`, owner-choice 24.09
- [GitHub Issue #2369](../../issues/2369) — `cabinet-registration-rollout`, OPEN