<!-- Сгенерировано: 2026-09-21T12:03:49.286Z (yarn main-day-issue@ec28d222) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"87d5fb8f001fbad4dfc3f1cf0eb2976acc015e4d","digest":"318aeb2a7a1f6dad5eecd29c5d6d95eedb1dfad4656a0e3d53cb8d69ba5e615d"},"DAILY_STANDUP":{"version":"bac1180ca66e4ba4a017264cce7f225843026b9d","digest":"cdfd7d32c62254603fbbcd20ef4130cb45f53dbe8b960830985d924e2bf56911"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-21

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `tariff-transitions-live-day2` |
| `primaryTitle` | Живые переходы тарифов: выкатка кабинета + tariff:project-cabinet + замер предела по трём тарифам |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-21 |

## Магистраль

Магистраль взята из `sources[0]` — прямой выбор владельца 21.09 (ответ «1» на замороженный снимок топ-3: tariff-transitions-live-day2 · tariff-downgrade-cold-m4 · tool-silence-fixes). Синтез запрещён; магистраль не вычислена из стендапа.

Предмет дня: разрыв между матрицей тарифов (ствол, растущий буфер 512/2048/4096 MiB, ratifiedAt 2026-09-08) и тем, что фактически видит прод-кабинет — таблица Tariff базы заполняется только при первом развёртывании через seed; кабинет на проде запущен 07.09, сетка влита 09.09, образ и база старые. Разведка #2358 подтвердила: цепочка матрица→сетка→кабинет→GET /v1/devices/:id/quota→прибор в коде цела, рвётся именно в таблице Tariff на проде.

Шаг дня: (1) выкатить кабинет с актуальным образом, (2) прогнать `yarn tariff:project-cabinet --check` → убедиться, что таблица Tariff актуальна, (3) зафиксировать живой замер предела буфера по трём тарифам на приборе (free-v1 / checkpoint-v1 / observatory-v1), (4) доставить материалы заседаний M0–M4 из ветки `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` в ствол — без файлов дня 12.09 (DAILY_CODE_REVIEW, morning-gates-state, DAILY_AUDIT).

**Критерий успеха к вечеру:** прод-кабинет отдаёт `buffer.limitBytes` согласно матрице (512/2048/4096 MiB), замер зафиксирован словом владельца, материалы M0–M4 в стволе.

## Подкрепление

- **Доставить материалы заседаний в ствол.** Ветка `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` (39 файлов, спасена 17.09) не влита. Без этого повестки M1–M5 и разборы M0–M4 живут вне ствола и недоступны агентам. Правило: исключить файлы дня 12.09 (DAILY_CODE_REVIEW, morning-gates-state, DAILY_AUDIT — затрут сегодняшние). Результат: один PR, только документы заседаний.
- **Прогон `yarn tariff:project-cabinet --check` + публикация вердикта.** После выкатки кабинета скрипт сравнивает таблицу Tariff с матрицей и выводит расхождения; вердикт фиксируется в docs/tariffs/projection-check-2026-09-21.md (дата, ствол, хэш образа, три строки: тариф → ожидаемый limitBytes → фактический). Только после чистого чека идём к замеру предела на приборе.

## Перспективные

- **M4 (понижение и холод) — прогон 2.** Прогон 1 отклонён аудитом, прогон 2 отложен из-за исчерпания панельной цепочки LLM. После живого замера предела (сегодня) у M4 появится реальная основа — фактическое поведение буфера при переходе вниз.
- **M5 — созыв заседания.** Повестка готова, созыв за владельцем; разблокируется после того, как M3 и M4 закрыты с живыми данными.
- **Механизм проекции тарифа при деплое.** Разведка #2358 выявила: в deploy/generate-cabinet-env.sh нет шага `tariff:project-cabinet`; сид сбрасывается в false после первого запуска. Кандидат в следующий спринт — добавить `yarn tariff:project-cabinet` как обязательный post-deploy шаг в `_ssh-cabinet-post-smoke.mjs`.

## Экспериментальные

- **Проба: замер перехода тариф↑ в live.** Заполнить буфер на free-v1 → переключить на checkpoint-v1 → убедиться, что запись немедленно открывается под 2048 MiB, а старые данные не затронуты. Узнаем: насколько прод ведёт себя как код (M3 принят аудитом, но только в тексте, не в металле).
- **Проба: спуск обратно с заморозкой.** После замера на checkpoint-v1 вернуть тариф на free-v1 → убедиться, что буфер заморожен, новая запись не идёт, старые пробы под удалением по политике. Узнаем: отрабатывает ли M4 «холод» в живом кабинете или только в тестах.
- **Проба: пусковик охоты.** Workflow не запускался по расписанию 19.09 и 21.09 при живом планировщике GitHub (cron `10 7 * * 1-5`); nightly-потоки в те же дни отработали, #2350 открыт. Одна минута: `gh workflow list --all` + `gh run list --workflow=hunt` — убедиться, что workflow не disabled и не throttled; залогировать в #2350.

## Санитарные

- Перевыпустить токен бота `@MembranaWatchdog_bot` — дважды попадал в переписку (#2148); включить в манифест ротации если ещё не вошёл.
- Проверить `health/deep` на проде кабинета после выкатки: убедиться, что `busy` в простое снят (кусок D, PR #2144).
- Ревизия старых PR: `#1939`, `#1831`, `#1846`, `#1876`, `#1728`, `#1793` — все старше недели; пройти `membrana-pr-audit`, результат одной строкой в журнал.
- Сверить зуб `union-merge-all-jsonl` (#2096): `git check-attr merge` = union на всех `docs/**/*.jsonl`; конфликт повторился 24.08.
- Убедиться, что `pr:ship` в ритуале не выходит нулём без PR — факт мёржа только через `gh pr view --json state`.
- Вечерняя ласточка 18.09 не отправлена (ключ офиса ротирован 18.09, локальный .env был от 11.09; перенесён 21.09) — её суть уходит в утреннюю сводку 21.09; зафиксировать факт в журнале.
- Снос трёх мёртвых каталогов в `.worktrees` (#2350) стоит до починки — не трогать до закрытия issue; статус проверить одной командой `ls .worktrees/`.

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Владелец выбрал `tariff-transitions-live-day2` ответом «1» из замороженного снимка топ-3 | сессия | owner-choice@chat/magistral-21-09 (`sources[0]`) | 2026-09-21 |
| Предмет дня — слово владельца 18.09: «сценарий малый тариф → переключение → запись → спуск с заморозкой»; «план не на один день» | сессия | owner-choice@chat/magistral-18-09 (`sources[1]`) | 2026-09-18 |
| Разрыв матрица↔прод подтверждён разведкой #2358: таблица Tariff заполняется только при seed, кабинет запущен 07.09, сетка влита 09.09 | код / issue | разведка #2358 (bf1938e6) | 2026-09-21 |
| Матрица тарифов (растущий буфер 512/2048/4096 MiB) в стволе с 2026-09-08 (storm T1, #2331, влито f5dcc7f4) | код | docs/containers/strategic-docs/granules/tariff-buffer/resource.json | 2026-09-08 |
| M3 принят аудитом (прогон 2, «28/28 цитат»); M4 прогон 2 отложен; материалы M0–M4 в ветке, не в стволе | план / сессия | MEETING_ACTIVE.md (7f6c2875, #2359) — 1 источник | 2026-09-18 |
| Стендап дня называет `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour` кандидатами, но **не** называет магистраль — выбор словом владельца | план | docs/DAILY_STANDUP.md | 2026-09-21 |
| **Расхождение:** `sources[0]` несёт `tariff-transitions-live-day2`; `morning-gates-state.json` в контексте не представлен с сегодняшней датой — расхождение отсутствует; магистраль взята с `sources[0]` как единственного владельческого волеизъявления на 21.09. Если `morning-gates-state.json` на 21.09 существует и несёт иное — `main-day-assertions.json` подлежит перечеканке (не сделано, находка). | — | — | — |

**Счёт независимых источников: 4 различных первоисточника** (owner-choice 21.09 · owner-choice 18.09 · разведка #2358 · resource.json). DAY_PLAN и DAILY_STANDUP — производные от одного контекста планирования; их суммарный вес = 1 отражение, не голоса.

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Таблица Tariff на проде не содержит актуальных строк матрицы (512/2048/4096 MiB) — проекция не выполнялась после влития сетки 09.09 | `file:deploy/generate-cabinet-env.sh` (отсутствие вызова tariff:project-cabinet в post-deploy шаге) + разведка #2358 | holds |
| Материалы заседаний M0–M4 отсутствуют в стволе — живут только в `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` | `file:docs/sessions/meeting-tariff-single-truth` (каталог отсутствует в main) | holds |

## Сегодня делаем

1. Выкатить кабинет с актуальным образом (тот, что несёт сетку от 09.09); зафиксировать хэш образа.
2. Прогнать `yarn tariff:project-cabinet --check` на проде; записать результат в `docs/tariffs/projection-check-2026-09-21.md` (тариф → ожидаемый limitBytes → фактический).
3. Если `--check` выявил расхождение — прогнать без `--check` (режим проекции), убедиться что таблица Tariff обновлена; повторить `--check` до чистого вердикта.
4. Живой замер предела буфера по трём тарифам на приборе (GET /v1/devices/:id/quota): зафиксировать три числа; слово владельца о соответствии матрице.
5. Собрать PR из ветки `rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917` — только файлы заседаний (исключить DAILY_CODE_REVIEW, morning-gates-state, DAILY_AUDIT дня 12.09); влить в ствол.
6. Прогнать санитарные: `health/deep` после деплоя, статус `@MembranaWatchdog_bot`, `gh run list --workflow=hunt` (#2350).
7. Зафиксировать вечернюю сводку: что из критерия успеха закрыто, что переносится с причиной.

## Definition of Done (фокус)

- [ ] `yarn tariff:project-cabinet --check` на проде возвращает 0 расхождений с матрицей
- [ ] GET /v1/devices/:id/quota отдаёт `buffer.limitBytes` = 536870912 / 2147483648 / 4294967296 по трём тарифам (free-v1 / checkpoint-v1 / observatory-v1)
- [ ] Живой замер принят словом владельца (реплика в сессии)
- [ ] PR с материалами M0–M4 влит в ствол; файлы дня 12.09 в нём отсутствуют
- [ ] `health/deep` после деплоя: `busy = false` в простое
- [ ] Результат зафиксирован в `docs/tariffs/projection-check-2026-09-21.md`
- [ ] Вечерняя сводка написана; незакрытые пункты критерия успеха названы явно

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — требует снятой амнистии архива (гейт `secret-parser-built`); не открываем.
- **`assets-container`** — блокирован тем же гейтом и нестабильным билдом (красный `@membrana/media-library-service`); не трогаем до зелёного CI.
- **`batch-collection-run-contour`** — требует консилиум-гейта по модели исполнения; в код не идём.
- **DSP-бенчмарки / trends-calibration** — потолок эшелона 0 зафиксирован (FFT_METRICS §6); повтор без смены алгоритма или датасета не даёт нового знания.
- **`mfcc-compare-sprint` в код** — worktree нестабилен (красный билд, issue #2345 «разобрать»).
- **Работа с архивом сессий** — заблокирована амнистией; открывается только после `secret-parser-built`.
- **M5 — созыв** — созыв за владельцем; не инициируем без явного слова.

## Вторично (если останется время)

- Разобрать статус `#2345` (красный `@membrana/media-library-service` / `@membrana/background-media`): воспроизвести локально `yarn turbo run build test --filter=...`, зафиксировать диагноз одним абзацем — не чинить, только диагноз.
- Gap `morning-care` в trail: проверить `docs/procedure-runs/trail/2026-09-17.jsonl` на наличие `friction`-записи; если отсутствует — добавить запись с причиной «не воспроизводится» или зафиксировать конкретный диагноз.

## Зависимости и риски

- **Блокер: доступ к проду кабинета.** Ключ офиса ротирован 18.09, локальный `.env` обновлён 21.09; если деплой-ключ не обновлён в CI — выкатка не пройдёт. Проверить до начала деплоя: `gh secret list --repo membrana/cabinet`.
- **Риск: `tariff:project-cabinet` без `--check` перезапишет таблицу Tariff.** Запускать только после `--check` с явным расхождением; не запускать в режиме проекции «на всякий случай».
- **Риск: PR из rescue-ветки затянет файлы дня 12.09.** Обязателен явный `git diff --name-only rescue/angelina/... main` перед созданием PR; исключить три файла вручную.
- **Риск: пусковик охоты (#2350).** Три мёртвых каталога в `.worktrees` стоят заблокированными до закрытия issue; не сносить без явного решения по #2350 — иначе сломаем связанные worktree-ссылки.

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md)
- [STRATEGY_DAY.md](docs/STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built`
- [DAY_PLAN.md](docs/DAY_PLAN.md) — топ-3 кандидата магистрали (владелец выбрал `tariff-transitions-live-day2`)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0]: owner-choice@chat/magistral-21-09
- [разведка #2358](https://github.com/officefish/Membrana/issues/2358) — подтверждение разрыва матрица↔прод
- [rescue-ветка материалов M0–M4](https://github.com/membrana/membrana/tree/rescue/angelina/docs/meeting-tariff-single-truth-20260908-20260917)
- [tariff-buffer/resource.json](docs/containers/strategic-docs/granules/tariff-buffer/resource.json) — матрица тарифов, ratifiedAt 2026-09-08
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md §6](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0 зафиксирован