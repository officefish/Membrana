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
