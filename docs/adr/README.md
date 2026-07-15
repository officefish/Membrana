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

| ADR | Дата | Статус | Тема |
|-----|------|--------|------|
| [ADR-0006](./ADR-0006-single-detector-report-node.md) | 2026-07-15 | ACCEPTED | PC-1: отчёт одиночного детектора — расширить `make-report-from-analysis` до `DetectionAnalysisRef`, не вводить новый узел |
| [loop-switch-control](../actions/device-board/LOOP_SWITCH_CONTROL_ADR.md) | 2026-07-11 | DRAFT | Переключение лупов main↔alarm: тумблер/захват/узлы (пример формата; исторически вне `docs/adr/`) |
