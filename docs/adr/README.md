# Architecture Decision Records (ADR)

Лёгкая запись архитектурного решения **ниже** консилиум-гейта: когда полный
`yarn consilium` (≥20 реплик, `docs/seanses/`) избыточен, но решение надо
зафиксировать явно и грунтованно кодом.

## Когда ADR, а когда консилиум

| Ситуация | Инструмент |
|----------|-----------|
| Новый контракт `@membrana/core`, новый пакет, новые узлы палитры, L-эпик, спор границ слоёв | **консилиум-гейт** (`membrana-consilium`) до кода |
| Решение по готовому канону / рантайм-рефактор без нового core-контракта / «не вводить контракт» / выбор реализации | **ADR** (этот каталог) |
| Разовое обсуждение одной персоны | `yarn ask <persona>` |

## Процесс

1. Скопировать [`ADR_TEMPLATE.md`](./ADR_TEMPLATE.md) → `docs/adr/ADR-NNNN-<slug>.md` (NNNN — следующий номер).
2. Заполнить: контекст → наблюдаемое состояние (грунтовать кодом, строки с датой) → решения Р1..Рn с границами → DoD.
3. Статус **DRAFT** до LGTM владельца; ревью через `code-review --staged`, шип `pr:ship`.
4. После LGTM — статус **ACCEPTED**; при замене — **SUPERSEDED-by-ADR-MMMM**.

Скилл: [`membrana-adr`](../../.cursor/skills/membrana-adr/SKILL.md).

## Реестр

Реестр обязан содержать **все** ADR: запись без строки здесь невидима — её не найдёт ни
человек, ни агент. Номер уникален и не переиспользуется.

| ADR | Дата | Статус | Тема |
|-----|------|--------|------|
| [ADR-0023](./ADR-0023-deploy-node-form-one-procedure-per-echelon.md) | 2026-08-04 | ACCEPTED | Узел разворачивания: ОДНА процедура `deploy` (фреймы `build → rollout → smoke → record`), сервис — параметр, не копия; выкладка только через owner-gate (механика `deploy:when-green` — канон); деплой пишет прогон в общий журнал; датированным одноразовым ssh-скриптам — правило осадка; дрейф прод↔ствол — шаг smoke для всех сервисов. Грунт: обзор `deploy-survey-2026-08-03` (52 глагола + 56 ssh при нуле процедур). LGTM владельца 04.08 |
| [ADR-0024](./ADR-0024-morning-gates-two-subjects-two-moments.md) | 2026-08-07 | ACCEPTED | Состояние утренних гейтов: ДВА субъекта (магистраль, ласточка) — ДВА момента вместо одного поля day. Предикат сверяет СВОЙ момент; ни один шаг не поднимает чужой; старое состояние читается как «оба момента неизвестны», а не наследуется. Грунт: morning-gate.mjs:61 (freeze сбрасывает оба) против morning-gate.mjs:111 (swallow --draft поднимает day, магистраль не трогая) — ложный owner-choice наблюдался трижды 05.08–07.08. Долг #gates-state-magistral-carryover, #1764. LGTM владельца 07.08 |
| [ADR-0026](./ADR-0026-forecast-required-amnesty-by-schema.md) | 2026-08-10 | ACCEPTED | Amnesty-by-schema для обязательности записи «предсказание ↔ исход»: лента прогонов получает `procedure-run-journal@2`, у `@2`-open обязателен `forecastRequired` (ставит держатель прогона, гейт только читает); `@1` без поля = амнистия по построению — ни дат, ни списков исключений. Гейт на close (`execution-gate`, только `membrana-local-sprint`): при флаге требует существующей валидной записи прогноза `sprintId==runId` (predicted достаточно, ретро — на своём такте) — стоп, не жалоба. Грунт: procedure-run-journal.mjs:12,198; долг мостика #forecast-record-step-optional (13 записей из 47 нарезок, тишина с 03.08). Рамка tarasov 10.08 (BLOCK локальному комментарию), форма vesnin. Блок b2 спринта s-queue-tail-2026-08-10 |
| [ADR-0025](./ADR-0025-frame-holder-and-moderator-two-roles.md) | 2026-08-08 | ACCEPTED | У фрейма ДВЕ роли: holder — разработчик, который чинит код фрейма (обязателен), moderator — кто ведёт момент с владельцем (необязателен). Модератор в holder становится ОШИБКОЙ валидатора, а не умолчанием. Грунт: ADR-0015:28 вводит holder и не определяет его; validate-procedure.mjs:120-128 держит angelina в одном списке с разработчиками; 20 фреймов из 87 (23%) числятся за тем, кто по кодексу #922 кода не пишет — у их дефектов нет исполнителя по построению. Мотивирующий случай: в манифесте утра есть journal-open и нет закрытия, чинить некому. Уточняет ADR-0015, родствен ADR-0024. LGTM владельца 08.08 |
| [ADR-0022](./ADR-0022-run-journal-event-not-mutation.md) | 2026-08-03 | ACCEPTED | Журнал прогонов @1.1: событие вместо мутации (open/close/friction-amend — записи, не правки); одна форма времени на прогон. LGTM владельца 03.08 |
| [ADR-0021](./ADR-0021-procedure-kind-two-closed-lists.md) | 2026-08-01 | ACCEPTED | Род процедуры — пятая статья словаря, три значения (`разработка` · `решение` · `ритм`), делят реестр без остатка 7/3/12. Два закрытых списка: маршруты разработки (7) и форматы решения (4, включая `adr`, который сам не был процедурой); ритм не запирается — закрывают там, где есть выбор из альтернатив. Два интерфейса, а не один: у заседания нет зоны и объёма, у спринта нет повестки. Путь расширения словаря — по вердикту Р2 заседания `procedural-layer` (21.07). LGTM владельца 01.08 |
| [ADR-0020](./ADR-0020-worktree-removal-is-controlled-demolition.md) | 2026-07-29 | ACCEPTED | Снос рабочего дерева — контролируемый снос: ратификация владельца, одна цель за проход, пост-чек после каждой |
| [ADR-0019](./ADR-0019-case-mechanism-friction-to-tooth-same-day.md) | 2026-07-29 | ACCEPTED | Механизм кейса «помеха, ставшая зубом в тот же день» |
| [ADR-0018](./ADR-0018-tests-container-selective-gate-nightly-full.md) | 2026-07-26 | ACCEPTED | Мердж-гейт выборочный (`smoke` + `gate`), полный набор `full` — ночной от пина на `main`; результат ночи приходит в утро через фрейм `night-report` как блокер дня; дом контейнера тестов — корневой `tests/`, оснастка — мастерская. Условие честности: отчёт «что не гонялось». Предусловие: защита `main` · эпик `tests-container` (#1291/#1292/#1293) |
| [ADR-0017](./ADR-0017-linear-board-is-mirror.md) | 2026-07-23 | DRAFT | Linear UI-доска = зеркало GitHub; слой движения = `linear-snapshot@1` + `startedAt` + `yarn linear:movement-audit` · #1000 / DRU-364 · LGTM владельца → ACCEPTED |
| [ADR-0016](./ADR-0016-lpc-evidence-minimum.md) | 2026-07-23 | ACCEPTED | LPC T1 evidence minimum: sha256 тел + params в emit; сырые тела запрещены; дом `docs/audit/llm-calls` · эпик #1033 |
| [ADR-0015](./ADR-0015-frame-pins-array-shape.md) | 2026-07-22 | ACCEPTED | Шов Ф1↔Ф3: канон `pins?: Pin[]` (не скаляр `pin?`); transitional чтение `pin`→`[pin]` в F1; запись F3 только `pins`. Спринт #900 F0 · LGTM владельца 22.07 |
| [ADR-0014](./ADR-0014-worktree-base-branch-sync.md) | 2026-07-20 | ACCEPTED | Синхрон базовых веток рабочих деревьев с `main` (K1 заседания `worktree-hygiene-gaps`): сигнал на входе в дерево (`ritual:day` + `yarn worktree:sync`), чистый предикат после fetch (`fresh`/`ff-able`/`diverged`/`dirty`), авто только `--ff-only`, расхождение/грязь — сигнал; область из реестра K2, `main` исключён. Записан ADR т.к. комната M2 4× уронила секцию посылок (S-M2), содержание стабильно. Реализация — спринт `worktree-hygiene-order` (#717/DRU-234) |
| [ADR-0013](./ADR-0013-daily-audit-is-chronicle.md) | 2026-07-18 | ACCEPTED | `DAILY_AUDIT.md` — **хроника дня** (репозиторий · реестр задач · граф правды + строки по пяти областям), а не аудитор плана по форме F1/M4: сверка с планом и тернарный вердикт принадлежат документу-аудитору. Разрез областей и правило отнесения пути — канон, не деталь реализации |
| [ADR-0012](./ADR-0012-membrana-device-build-profile.md) | 2026-07-16 | ACCEPTED | Membrana Device = **профиль сборки** `apps/client` (один модуль борда + pairing + список UC), а не регистрационный пакет: отдельная точка входа (не рантайм-флаг — плагины импортятся статически), журнал/библиотека остаются сервисами; `client-board-registry` не создаётся, host-обвязка не выносится. **Заменяет ADR-0011** |
| [ADR-0011](./ADR-0011-client-board-registry-layer.md) | 2026-07-16 | SUPERSEDED-by-ADR-0012 | ⛔ НЕ исполнять — премиса не подтвердилась кодом: палитра борда захардкожена в `packages/device-board` (39 узлов) и у кабинета **уже та же**; 16 плагинов — панели сайдбара, узлов не дают; Studio = apps/client, отдельного bootstrap нет. История решения |
| [ADR-0010](./ADR-0010-panel-route-bridge-gated-sections.md) | 2026-07-16 | ACCEPTED | Маршрут-мост панели `/panel/section/<id>/*` за `forward_auth` office: graphify/research-tree — гейтнутые разделы `panel.mmbrn.tech` (не поддомены); office единственный арбитр (`canAccessSection`), реальная security-граница; панель iframe'ит, не импортирует блоки (GRP1) |
| [ADR-0009](./ADR-0009-night-sprint-delegated-execution.md) | 2026-07-15 | ACCEPTED | Ночной спринт исполняет делегированный фоновый субагент в изолированном worktree (Р1 делегирование по умолчанию · Р2 промпт=контракт · Р3 human-in-loop владельцу · Р4 утренняя верификация HANDOFF · Р5 масштаб · Р6 изоляция) |
| [ADR-0008](./ADR-0008-root-domain-scenarios-docs-topology.md) | 2026-07-15 | ACCEPTED | Топология корня membrana.space: docs на /scenarios/docs (Mintlify subpath-proxy, доки публичны) + лендинг + /downloads; VPS 72.56.27.58; план-B subdomain спящий |
| [ADR-0007](./ADR-0007-night-narrative-provider-chain.md) | 2026-07-13 | ACCEPTED | Нарратив ночных агентов: цепочка провайдеров Claude → DeepSeek(direct) → graceful-пропуск (перенумерован из 0005, #504) |
| [ADR-0006](./ADR-0006-single-detector-report-node.md) | 2026-07-15 | ACCEPTED | PC-1: отчёт одиночного детектора — расширить `make-report-from-analysis` до `DetectionAnalysisRef`, не вводить новый узел |
| [ADR-0005](./ADR-0005-panel-users-store.md) | 2026-07-14 | ACCEPTED | panel-users store: первый персистентный стейт office (реестр партнёров панели) |
| [ADR-0004](./ADR-0004-drift-anchor-journal-transport.md) | 2026-07-13 | ACCEPTED | Транспорт журнала drift-anchor: push через `background-office`, не pull из Actions API |
| [ADR-0003](./ADR-0003-drift-anchor-record-in-core.md) | 2026-07-13 | ACCEPTED | Контракт `DriftAnchorRecord` живёт в `@membrana/core`, а не в `@membrana/drift-anchor` |
| [ADR-0002](./ADR-0002-pure-eligible-getmicrophone-getaudiostream.md) | 2026-07-12 | ACCEPTED | pure-toggle для `get-microphone` / `get-audio-stream` (default IMPURE) |
| [loop-switch-control](../actions/device-board/LOOP_SWITCH_CONTROL_ADR.md) | 2026-07-11 | DRAFT | Переключение лупов main↔alarm: тумблер/захват/узлы (пример формата; исторически вне `docs/adr/`) |
| [0006-benchmark-runs-calibrated-preset](./0006-benchmark-runs-calibrated-preset.md) | 2026-07-18 | ACCEPTED | Прогон бенчмарка исполняет калиброванный пресет; владелец истины — JSON калибратора, TS генерируется из него |

> **История нумерации.** ADR 0002–0005 лежали под именами `NNNN-<slug>.md`, а канон процесса
> (шаг 1 выше) требует `ADR-NNNN-<slug>.md` — приведено к канону 2026-07-15 (#504). Тогда же
> разведён дубль: два разных решения носили номер 0005 (`panel-users-store` и
> `night-narrative-provider-chain`); второе стало ADR-0007. ADR-0001 не существует — нумерация
> исторически начата с 0002.
