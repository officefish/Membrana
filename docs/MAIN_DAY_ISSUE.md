<!-- Сгенерировано: 2026-09-26T08:56:38.992Z (yarn main-day-issue@779a59a4) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"779a59a4cc2f328357f4d0e54b9959879cf1f103","digest":"d3ae1c2fbe9e28dd52a2920a35971a2305801783defb2a523d5532a405702be8","versionAt":"2026-09-26T11:51:45+03:00"},"DAILY_STANDUP":{"version":"779a59a4cc2f328357f4d0e54b9959879cf1f103","digest":"dc34bc2ddd88a379f14bfc963a44de10b9801bf80c926961ea2f0d72ced38d54","versionAt":"2026-09-26T11:51:45+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE · 2026-09-26

<!-- Сгенерировано: 2026-09-26 (yarn main-day-issue) -->
<!-- Магистраль: cabinet-registration-rollout — источник sources[0].claim, owner-choice@chat/magistral-24-09, дата 2026-09-24 -->
<!-- Расхождение: morning-gates-state.json не предъявлен во входах; sources[0] — единственный владельческий источник -->

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `cabinet-registration-rollout` |
| `primaryTitle` | Выкатка регистрации по приглашению на прод (rollout, день 3) |
| `githubIssue` | #2369 |
| `size` | L |
| `promptPath` | `docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md` |
| `сгенерировано` | 2026-09-26 |

## Магистраль

**`cabinet-registration-rollout`** — выкатка регистрации по приглашению на прод, третий день.

Второй день остановился на шаге 1 по правилу fail-closed: сборка нового образа офиса упала с несовместимостью `RunRecord.mountTarget` для дома `background-cabinet/journal`. Старый офис работает (образ 4af378da42f5, healthy), внешний смоук 5/0/1, пишущий смоук шага 6 не гонялся. Диагностированный класс: образ несёт устаревшие собранные пакеты соседей (рецидив 21.08 и 27.08, зуб `verify:image-workspace-deps`) — но вывода отказа от исполнителя на 24.09 во входах нет, первый шаг — получить вывод и подтвердить или опровергнуть класс, не чинить типы вслепую.

Весь код эпика в стволе: A дверь офиса (#2393), B клиент офиса в кабинете (#2396), C регистрация по коду (#2397), лендинг (#2398), D форма (#2401) — сборка ствола зелёная дважды (`turbo run typecheck build --filter=@membrana/background-office`, 6 задач, 0 ошибок). Расхождение живёт в образе, не в исходниках.

**Критерий успеха к вечеру:** офис-смоук шаг 6 зелёный (mint → check → redeem → revoke без 5xx), в `/etc/membrana/cabinet.env` пара `OFFICE_URL`/`OFFICE_API_TOKEN` и `ALLOW_REGISTRATION=true`, лендинг на membrana.space обновлён, Issue #2369 закрыт.

## Подкрепление

- **Получить вывод отказа сборки образа 24.09** от исполнителя выкатки: точная строка ошибки `RunRecord.mountTarget` + полный docker build log — без этого класс «устаревшие пакеты соседей» остаётся гипотезой и любая правка вслепую. Если класс подтверждён — пересобрать образ с `--no-cache` и прогнать `verify:image-workspace-deps` до `docker push`.

- **Завести билет-сторож дыры CI:** `.github/workflows/office-image-smoke.yml` не включает `packages/background-cabinet/**` в paths-trigger — сборка образа офиса ломается молча при правках кабинета. Завести issue, добавить путь в триггер, чтобы рецидив 22.09→24.09 не повторился.

## Перспективные

- **Амнистия архива после прохождения `secret-parser-built`:** rollout разблокирует среду, в которой предикат `amnestyLifted` станет проверяемым — следующий вектор после закрытия #2369.
- **`sequence`-контракт trail-агрегатора (P1, четвёртый день):** синтетический тест двух пересекающихся `runId` с `sequence:1` в `night-summary.test.mjs` — откроет починку без rollout-зависимости, можно параллельно во второй половине дня если образ собрался.
- **Ограничение oversized-PR правилом ≤ 400 строк в pre-merge check:** три PR (#2441, #2450, 4473df99) влиты без разбиения; правило предотвратит следующее поколение слепых архитектурных слияний.

## Экспериментальные

- **Проба «образ с workspace-freeze»:** при рецидиве класса «устаревшие пакеты соседей» — собрать образ с явным `yarn install --frozen-lockfile` внутри Dockerfile и сравнить с текущим recipe; узнаем, закрывает ли это класс полностью или нужен отдельный `verify`-шаг в CI.
- **Синтетический тест `sequence`-контракта как блокер:** добавить в `night-summary.test.mjs` кейс двух пересекающихся `runId` прямо сейчас (XS) — узнаем, воспроизводится ли P1 детерминировано до rollout, что разблокирует починку независимо от выкатки.
- **Проверка `CURRENT_TASK.md` на протухание:** файл предположительно указывает на устаревший эпик `detector-scoreboard` вместо `cabinet-registration-rollout` — XS-правка, висит третий день; заодно проверить, не сломан ли какой-либо агент, читающий этот файл как ориентир.

## Санитарные

- `CURRENT_TASK.md` указывает на устаревший эпик `detector-scoreboard` вместо `cabinet-registration-rollout` — XS-правка третий день висит.
- `friction`-запись за 24.09 в trail не добавлена — агрегатор читает день как безупречный, что даст ложный манифест ротации.
- `sequence`-контракт trail-агрегатора: P1, четвёртый день — синтетический тест двух пересекающихся `runId` не написан, агрегатор пишет `sequence:1` дважды.
- Три oversized-PR (#2441/725 строк, #2450/1074, 4473df99/1147) влиты без разбиения — архитектурный проход по ним не проведён.
- Дыра CI: `packages/background-cabinet/**` отсутствует в paths-trigger `office-image-smoke.yml` — правки кабинета не инициируют проверку образа офиса (прямая причина молчания 22.09→24.09).
- Lint-warning в `apps/cabinet` и плавающий тест `journal/selection/chain-rehearsal` — не критично, но третий день без фиксации.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `cabinet-registration-rollout`, выбор владельца (ответ «1» на замороженный снимок топ-3) | сессия | `owner-choice@chat/magistral-24-09` (прямое слово владельца) | 2026-09-24 |
| Продолжение вчерашнего: выкатка остановлена на шаге 1, прод не тронут, старый офис healthy | сессия | замер утра 24.09 в `sources[0].claim` | 2026-09-24 |
| Весь код эпика в стволе (#2393, #2396, #2397, #2398, #2401); `turbo build` зелёный 6/0 | код | PR-список в `sources[0].claim` + ствол | 2026-09-24 |
| Класс сбоя — «устаревшие пакеты соседей» (рецидив 21.08, 27.08); `background-cabinet/**` вне CI-trigger | код / issue | `sources[0].claim` → анализ `.github/workflows/office-image-smoke.yml` | 2026-09-24 |
| `DAY_PLAN.md` называет `cabinet-registration-rollout` магистралью (три кандидата, выбор словом владельца) | план | `docs/DAY_PLAN.md` (генератор #1363) — **отражение** того же owner-choice | 2026-09-26 |
| Стендап фиксирует отсутствие назначенной магистрали скриптом; фокус не самоназначается | план | `docs/DAILY_STANDUP.md` (патч #2410, влит 7b5b4679) — **отражение** того же owner-choice | 2026-09-26 |
| **Расхождение:** `morning-gates-state.json` во входах не предъявлен; если он несёт `magistral` с датой 2026-09-26 — он свежее `sources[0]` и должен победить по норме У1 (31.07). Магистраль взята с `sources[0]`, assertions не перечеканены | — | норма У1 / `main-day-assertions.json` | — |

> **Счёт независимых источников: 1 владельческий** (`owner-choice@chat/magistral-24-09`) **+ 1 технический** (анализ CI-trigger). DAY_PLAN и DAILY_STANDUP — 2 отражения одного owner-choice, суммарный вес = 1. Итого 2 независимых источника согласны; несогласных нет.

## Посылки (обязательно, если фокус строится на «работы ещё нет»)

| Посылка | Маркер | Вердикт |
|---|---|---|
| Новый образ офиса не поднят на проде (несовместимость `RunRecord.mountTarget`) | `file:docs/evidence/office-image-smoke-24-09.log` — вывод отказа сборки 24.09 (артефакт ожидается; до его получения — unknown) | **unknown** → первый шаг дня: получить вывод |
| В `/etc/membrana/cabinet.env` отсутствует пара `OFFICE_URL`/`OFFICE_API_TOKEN` и `ALLOW_REGISTRATION=false` | `file:/etc/membrana/cabinet.env` (VDS, содержимое зафиксировано в `sources[0].claim` на 24.09) | **holds** |
| Пишущий смоук шага 6 не прогонялся (mint cabinet-register → redeem → revoke) | `file:docs/evidence/cabinet-smoke-step6-24-09.log` — отсутствует | **holds** |
| Лендинг на membrana.space не обновлён | `file:docs/evidence/landing-deploy-24-09.log` — отсутствует | **holds** |

## Сегодня делаем

1. **Получить полный вывод docker build от 24.09** (точная строка `RunRecord.mountTarget`) — подтвердить или опровергнуть класс «устаревшие пакеты соседей»; зафиксировать в `docs/evidence/office-image-smoke-24-09.log`.
2. **Пересобрать образ офиса** с `--no-cache` (или с `verify:image-workspace-deps` перед push) — добиться `docker push` без ошибок и `/health` 200 на туннеле.
3. **Прогнать офис-смоук шаг 6** (`node scripts/_ssh-panel-smoke.mjs`): mint → 401 без ключа → check → redeem → 409 exhausted → 400 иной mode → revoke — все шаги зелёные.
4. **Владелец вносит пару в `cabinet.env`** (`OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`) и запускает `CABINET_IMAGE_TAG=main node scripts/_ssh-cabinet-deploy-image.mjs` (DR0/DR1).
5. **Проверить `GET /health/deep`** → `office_registration` healthy; прогнать `GET /health/deep` кабинета — убедиться, что кабинет видит офис.
6. **Обновить лендинг** membrana.space — зафиксировать снимок `docs/evidence/landing-deploy-26-09.log`.
7. **Закрыть Issue #2369** и завести issue на дыру CI (`background-cabinet/**` → `office-image-smoke.yml`).

## Definition of Done (фокус)

- [ ] Вывод отказа сборки 24.09 получен и класс сбоя подтверждён или опровергнут документально.
- [ ] Новый образ офиса собран (`--no-cache`), `verify:image-workspace-deps` зелёный, образ запущен на VDS.
- [ ] Офис-смоук шаг 6 зелёный (все 7 шагов mint→revoke без 5xx).
- [ ] `/etc/membrana/cabinet.env` содержит `OFFICE_URL`, `OFFICE_API_TOKEN`, `ALLOW_REGISTRATION=true`; `GET /health/deep` офиса и кабинета — healthy.
- [ ] Лендинг membrana.space обновлён, снимок в `docs/evidence/`.
- [ ] Issue #2369 закрыт.
- [ ] Issue на дыру CI (`background-cabinet/**` в paths-trigger) заведён.

## Сознательно не делаем сегодня

- **`mfcc-compare-sprint` и `dads-benchmark-bridge`** — блокированы до стабилизации rollout и `secret-parser-built`.
- **Ревью oversized-PR (#2441, #2450, 4473df99)** — каждый требует выделенного архитектурного слота (725–1147 строк), попутно не ревьюируется.
- **DSP-бенчмарки (harmonic/cepstral/flux повтором)** — потолок эшелона 0 зафиксирован в `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; новых чисел на free-v1 не получим.
- **`angelina-hostess-impl` и `assets-container`** — ждут завершения rollout; запуск без него создаёт висящие треки поверх незакрытого #2369.
- **`batch-collection-run-contour`** — консилиум-гейт по модели исполнения не пройден; в код не идём.
- **`sequence`-контракт trail-агрегатора (P1)** — в основной слот не берём; допустимо как XS параллельная правка если rollout разблокирован раньше вечера.

## Вторично (если останется время)

- Написать синтетический тест `sequence`-контракта в `night-summary.test.mjs` (два пересекающихся `runId`, ожидаем монотонный счётчик) — XS, разблокирует P1.
- Правка `CURRENT_TASK.md`: заменить `detector-scoreboard` на `cabinet-registration-rollout` — XS, третий день.

## Зависимости и риски

- **Блокер 1:** вывод отказа сборки 24.09 не получен — без него правка вслепую; день может уйти на диагностику, а не выкатку.
- **Блокер 2:** пара `OFFICE_URL`/`OFFICE_API_TOKEN` вносится руками владельца — без неё шаг DR1 кабинета невозможен; нужна синхронная точка контакта.
- **Риск 1:** рецидив класса «устаревшие пакеты соседей» после `--no-cache` — если `verify:image-workspace-deps` даёт красный, rollout снова останавливается по fail-closed; потребуется отдельная сессия починки Dockerfile.
- **Риск 2:** `morning-gates-state.json` может нести более свежее волеизъявление владельца (гейт утра); если его `magistral.day` = 2026-09-26 и он расходится с `sources[0]` — магистраль должна быть перечеканена по норме У1 до начала работы.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md)
- [DAY_PLAN.md](docs/DAY_PLAN.md)
- [Регламент выкатки: MEETING_ACTIVE.md](docs/meeting/cabinet-registration-promo/MEETING_ACTIVE.md)
- [GitHub Issue #2369](https://github.com/officefish/Membrana/issues/2369)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md §6](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md)