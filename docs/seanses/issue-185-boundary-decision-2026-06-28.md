# Issue #185 — services → device-board boundary decision

**Дата:** 2026-06-28
**Участники:** Ozhegov (lead), Vesnin (T2 review)
**Статус:** accepted for implementation

## M0 — факт

`check-package-boundaries.mjs` обнаруживал 8 срабатываний в
`packages/services/usercase-catalog`: source/test imports, Vite alias и external на
`@membrana/device-board`. При этом `docs/SERVICES.md` объявлял зависимость исключением,
что противоречило исполняемой политике архитектуры.

## M1 — варианты

1. Allowlist для facade — сохраняет обратную зависимость и ослабляет автоматический gate.
2. Перенести весь bundled catalog в `core` — смешивает нейтральные контракты и runtime/data.
3. Dependency inversion — DTO в `core`, порт в service, concrete catalog передаёт client.

## M2 — решение

Выбран вариант 3. `UserCaseCatalogEntrySummary`, `UserCaseTier` и
`UserCaseLayoutProfile` являются нейтральными контрактами и принадлежат `core`.
Bundled entries и `UserCaseCatalogService` остаются в `device-board`. Entitlement facade
принимает структурный `UserCaseCatalogPort`; composition root в `apps/client` связывает
оба пакета.

Следствия:

- направление зависимостей снова соответствует `core ← service/device-board ← client`;
- service можно тестировать через in-memory port без runtime device-board;
- старые type exports из device-board сохранены re-export'ом из core;
- allowlist и новое архитектурное исключение не нужны.
