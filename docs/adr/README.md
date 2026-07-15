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
| [ADR-0008](./ADR-0008-root-domain-scenarios-docs-topology.md) | 2026-07-15 | DRAFT | Топология корня membrana.space: docs на /scenarios/docs (Mintlify subpath-proxy) + лендинг; cabinet-VPS; план-B subdomain |
| [ADR-0007](./ADR-0007-night-narrative-provider-chain.md) | 2026-07-13 | ACCEPTED | Нарратив ночных агентов: цепочка провайдеров Claude → DeepSeek(direct) → graceful-пропуск (перенумерован из 0005, #504) |
| [ADR-0006](./ADR-0006-single-detector-report-node.md) | 2026-07-15 | ACCEPTED | PC-1: отчёт одиночного детектора — расширить `make-report-from-analysis` до `DetectionAnalysisRef`, не вводить новый узел |
| [ADR-0005](./ADR-0005-panel-users-store.md) | 2026-07-14 | ACCEPTED | panel-users store: первый персистентный стейт office (реестр партнёров панели) |
| [ADR-0004](./ADR-0004-drift-anchor-journal-transport.md) | 2026-07-13 | ACCEPTED | Транспорт журнала drift-anchor: push через `background-office`, не pull из Actions API |
| [ADR-0003](./ADR-0003-drift-anchor-record-in-core.md) | 2026-07-13 | ACCEPTED | Контракт `DriftAnchorRecord` живёт в `@membrana/core`, а не в `@membrana/drift-anchor` |
| [ADR-0002](./ADR-0002-pure-eligible-getmicrophone-getaudiostream.md) | 2026-07-12 | ACCEPTED | pure-toggle для `get-microphone` / `get-audio-stream` (default IMPURE) |
| [loop-switch-control](../actions/device-board/LOOP_SWITCH_CONTROL_ADR.md) | 2026-07-11 | DRAFT | Переключение лупов main↔alarm: тумблер/захват/узлы (пример формата; исторически вне `docs/adr/`) |

> **История нумерации.** ADR 0002–0005 лежали под именами `NNNN-<slug>.md`, а канон процесса
> (шаг 1 выше) требует `ADR-NNNN-<slug>.md` — приведено к канону 2026-07-15 (#504). Тогда же
> разведён дубль: два разных решения носили номер 0005 (`panel-users-store` и
> `night-narrative-provider-chain`); второе стало ADR-0007. ADR-0001 не существует — нумерация
> исторически начата с 0002.
