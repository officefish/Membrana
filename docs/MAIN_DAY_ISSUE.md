<!-- Сгенерировано: 2026-09-28T10:51:49.133Z (yarn main-day-issue@369cd8b9) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"f8b4637b67e5726702e764383640dea5f5e2c184","digest":"9dbdda055fb277398ac45183b944e06a4c1eea503ace1bde800f9e6152a9c821","versionAt":"2026-09-27T12:42:34+03:00"},"DAILY_STANDUP":{"version":"f8b4637b67e5726702e764383640dea5f5e2c184","digest":"212ede4be4de67a5b78fda1a9676aa842b46182e999449c3e41edc2c2cf74575","versionAt":"2026-09-27T12:42:34+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-28

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `pagination-sample-library` |
| `primaryTitle` | Пагинация библиотеки сэмплов |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-28 |

## Магистраль

Магистраль дня — **pagination-sample-library** — взята из прямого выбора владельца 28.09 (owner-choice@chat/magistral-28-09, `sources[0]`): «формально выбираем пагинацию». Библиотека сэмплов сейчас отображает все 1057 проб одновременно; это прямой кандидат в причину фризов #2476, которую не удалось измерить 27.09. Цель дня: реализовать постраничную загрузку в библиотеке сэмплов так, чтобы первый экран рендерился без блокировки UI, а дальнейшие страницы подгружались по запросу. Параллельным путём того же дня владелец обозначил опыт трёх дорог (`three-roads-experiment`) — он упирается в физические руки (сборка Студии на узле) и ведётся владельцем самостоятельно; пагинацию ведут сессии.

**Критерий успеха к вечеру:** открытие библиотеки на 1057 пробах не вызывает видимого фриза UI; счётчик страниц и навигация вперёд/назад работают; нет регрессий в существующих фильтрах и воспроизведении.

## Подкрепление

- **Архитектурный проход oversized PR #2488 → #2489 → #2499 как связка** — три PR четвёртый день лежат в стволе без верифицированной целостности; разбор снимает главный риск работы по пагинации поверх непроверенного ствола. Выделенный слот до первой строки нового кода — не попутно.
- **Перечеканка `main-day-assertions.json` под `pagination-sample-library`** — ассерции от 24.09 называли `cabinet-registration-rollout`; гейт 27.09 зачеканил `three-roads-experiment`, а выбор владельца 28.09 — `pagination-sample-library`; пока манифест не обновлён, `yarn main-day-probe` работает против устаревшей магистрали. XS, делать первым делом.

## Перспективные

- Закрытие архитектурного разбора #2488 → #2489 → #2499 откроет следующий шаг rollout-магистрали (`cabinet-registration-rollout` #2369) без риска скрытых перекрёстных зависимостей — тогда статус rollout можно будет честно назвать: магистраль позже или перевод в фон.
- После появления пагинации — smoke-измерение времени открытия библиотеки на 1057 пробах с трейсом; факт либо закрывает гипотезу о причине фриза #2476, либо называет новую.
- `batch-collection-run-contour` (буфер 95 %, ETA 293 с) — разблокируется после консилиум-гейта по модели исполнения; держим на виду, в код не идём без гейта.

## Экспериментальные

- **Smoke-тест парсера по реальной сессии:** запустить `night-triage-secret-scan.mjs` в режиме резака на архиве вчерашней сессии (без отправки) — проверить, режет ли агрессивно или только детектирует (кристалл `secret-parser-cuts-aggressively` получит подтверждение или опровержение фактом).
- **Граничный случай — пустой манифест ротации:** прогнать резак на сессии без засвеченных ключей и проверить exit-код и вывод — узнать, не ломается ли инструмент на пустом случае до первого датированного прохода.
- **Порог ложного срабатывания:** скормить резаку заведомо чистый текст (докстринг без секретов) и измерить количество ложных вырезаний — понять, насколько агрессивность управляема без ручного контроля.

## Санитарные

- **Ревью-долг P1: oversized #2488 / #2489 / #2499** — четвёртый день в стволе без развёрнутого диффа; выделенный слот до нового кода (не попутно, не маскировать частичным просмотром).
- **`night-hunt-graph.test.ts`** — пометить тегом `integration` (хрупкий путь `../../../../../yarn.lock`); 15 мин, четвёртый день висит, CI нестабилен.
- **Перечеканить `main-day-assertions.json`** под `pagination-sample-library` — гейт 27.09 свежее ассерций 24.09, выбор владельца 28.09 свежее обоих; расхождение не снято.
- **Исправить `CURRENT_TASK.md`** — убрать устаревший `detector-scoreboard`, вписать `pagination-sample-library`; третий день дезориентирует холодные сессии.
- **Rollout #2369** — четвёртый день OPEN без лога отказа сборки, без `docker push --no-cache`, без довнесения `cabinet.env`; зафиксировать решение: магистраль или фон (ответ владельца ожидается как подкрепление, не как блокер пагинации).
- **A11y `MoveAllToCollectionDialog`** (роль `dialog`, focus trap, Escape) — не проверена при разборе #2489/#2499; долг ревью oversized.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Владелец назвал `pagination-sample-library` магистралью: «формально выбираем пагинацию» | сессия (owner-choice) | `docs/tasks/main-day-assertions.json` → `sources[0]`, author=human | 2026-09-28 |
| Оговорка владельца: `three-roads-experiment` идёт вторым путём того же дня, не отменён, но упирается в физические руки (сборка Студии на узле) | сессия (owner-choice) | `sources[0].claim`, прямая цитата | 2026-09-28 |
| 1057 проб в библиотеке без пагинации — кандидат в причину фризов #2476; пагинация решает это прямо | код / issue | `sources[0].claim` (замер готовности опыта 28.09) | 2026-09-28 |
| Установщик собран (артефакт CI #36336034884, 145 МБ, не истёк); по коду `b44d05f3` и вершина `77a9063b` идентичны — пагинации в этой сборке нет, она и есть работа дня | код | `sources[0].claim` (замер готовности опыта) | 2026-09-28 |
| **Расхождение гейта и ассерций: магистраль взята с `sources[0]` (owner-choice 28.09); `main-day-assertions.json` перечеканен 24.09 под `cabinet-registration-rollout`; перечеканка под `pagination-sample-library` предписана и не сделана** | снимок-хардкод | `docs/tasks/main-day-assertions.json`, поле `//date` | 2026-09-24 (устарел) |
| Стендап 28.09: `pagination-sample-library` — второй в топ-3 кандидатов (после `cabinet-registration-rollout`), поднят выбором владельца в первую позицию | план | `docs/DAILY_STANDUP.md` 28.09 (отражение owner-choice) | 2026-09-28 |
| `DAY_PLAN.md` 28.09 называет три кандидата магистрали, в т.ч. `batch-collection-run-contour`; но выбор владельца (`sources[0]`) перекрывает синтез плана | план | `docs/DAY_PLAN.md` 28.09 (1 источник, отражение реестра) | 2026-09-28 |

**Счёт голосов по различным первоисточникам:**
- Owner-choice 28.09 (`sources[0]`, author=human) — 1 независимый первоисточник, несёт прямое волеизъявление; все остальные строки таблицы — его отражения или подтверждения. Вес одного независимого источника не суммируется с его отражениями.
- Синтез плана (`DAY_PLAN.md`) и стендапа — производные от реестра и owner-choice; самостоятельного веса не добавляют.

**Итог:** магистраль назначена единственным способом, которым это делается — словом владельца.

---

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Пагинация в библиотеке сэмплов отсутствует: компонент отображает все пробы одним списком | `symbol:SampleLibraryPagination` (или аналог) в `apps/client/src/**` | `holds` — символ не обнаружен (1057 проб рендерятся разом, зафиксировано в `sources[0]`) |
| Фриз #2476 при открытии библиотеки не измерен причинно | `file:docs/archive/` — нет трейса с причиной фриза | `holds` — трейс не зафиксирован, гипотеза открыта |

---

## Сегодня делаем

1. Перечеканить `main-day-assertions.json` под `pagination-sample-library` (XS, до кода).
2. Исправить `CURRENT_TASK.md`: убрать `detector-scoreboard`, вписать `pagination-sample-library` (XS).
3. Провести архитектурный разбор oversized PR #2488 → #2489 → #2499 в выделенном слоте (M, до нового кода).
4. Реализовать постраничную загрузку в библиотеке сэмплов: определить размер страницы, контракт `useSampleLibraryPage`, интеграцию с существующими фильтрами.
5. Покрыть навигацию страниц (вперёд / назад / номер страницы) и убедиться в отсутствии регрессий фильтрации и воспроизведения.
6. Smoke-замер: открыть библиотеку на 1057 пробах, зафиксировать отсутствие фриза; результат — один абзац в дневной фидбек.
7. Пометить `night-hunt-graph.test.ts` тегом `integration` (XS, до обеда).

---

## Definition of Done (фокус)

- [ ] `SampleLibraryPagination` (или эквивалент) реализован: первый экран рендерится без блокировки UI
- [ ] Навигация страниц работает (вперёд / назад / номер), размер страницы зафиксирован константой
- [ ] Существующие фильтры библиотеки работают поверх пагинации без регрессий
- [ ] Воспроизведение сэмпла из любой страницы работает
- [ ] Smoke-замер на 1057 пробах: видимый фриз при открытии отсутствует, результат зафиксирован
- [ ] `yarn turbo run typecheck test --filter=@membrana/client` — зелёный
- [ ] `yarn turbo run lint --filter=@membrana/client` — зелёный

---

## Сознательно не делаем сегодня

- **`batch-collection-run-contour`** — буфер давит, но запуск без консилиум-гейта по модели исполнения нарушает канон; не трогаем.
- **`cabinet-registration-rollout` #2369** — статус OPEN; ждём слова владельца (магистраль позже или фон); в код не идём.
- **DSP-бенчмарки, повтор free-v1, «Этап 1.A»** — потолок эшелона 0 зафиксирован; тема закрыта без смены датасета или алгоритма.
- **`angelina-hostess-impl`** — накопленный контекст есть, но владелец назвал пагинацию; откладываем.
- **Попутный архитектурный разбор #2488/#2489/#2499** — только выделенный слот, не между делом.

---

## Вторично (если останется время)

- Smoke-тест парсера `night-triage-secret-scan.mjs` на архиве вчерашней сессии (без отправки) — подтвердить или опровергнуть кристалл `secret-parser-cuts-aggressively`.
- Первый шаг `three-roads-experiment` на стороне команды — если владелец сообщит о готовности узла для сборки Студии.

---

## Зависимости и риски

- **Блокер:** oversized PR #2488/#2489/#2499 не прошли архитектурный разбор — новый код поверх непроверенного ствола несёт скрытый риск; разбор обязателен до реализации пагинации.
- **Риск:** `main-day-assertions.json` до перечеканки называет устаревшую магистраль — `yarn main-day-probe` будет давать ложный вердикт; снимается первым XS-шагом.
- **Риск:** пагинация на 1057 пробах может не устранить фриз #2476, если причина не в размере списка — smoke-замер это выявит и назовёт следующую гипотезу.
- **Наблюдение:** `three-roads-experiment` как второй путь дня упирается в физические руки владельца (сборка Студии на узле); команда не блокирует и не ускоряет этот путь.

---

## Ссылки

- [DAILY_STANDUP.md 28.09](docs/DAILY_STANDUP.md)
- [DAY_PLAN.md 28.09](docs/DAY_PLAN.md)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md)
- [STRATEGY_DAY.md #592](docs/STRATEGY_DAY.md)