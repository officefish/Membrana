# Промпт: доклад наружу (компонент R эпика ritual-refactor)

> **Task-промпт.** Размер: **M**. Артефакт: **1 PR** — линза-rephraser + чек живых ссылок + тесты.
> Реестр: `ritual-r-report`. Дизайн: заседание M4
> ([`ritual-refactor-m4-report-2026-07-20.md`](../seanses/ritual-refactor-m4-report-2026-07-20.md)).
> DAG: `A → K → {S → R → D}`; A, K, S в main.

## Что построить

1. **Линза = строгий rephraser** `text → text` при **изоморфизме дерева**:
   `structuralHash(report) = structuralHash(plan)`. НЕ redactor (не удаляет узлы, не смягчает статус).
2. **Защита фактов:** `protectedTokens(plan[n]) ⊆ tokens(report[n])` — числа, статус-метки, ссылки
   доживают дословно.
3. **Чек ссылок:** `internalRef` (бинарно alive/dead) + `externalRef` (тернарно alive/dead/**unverifiable**).
   `dead` — семантический 4xx/410 после ретраев; `unverifiable` — таймаут/шум.
4. **Предикат выпуска:** `canPublish = structuralIntact ∧ protectedTokensKept ∧ noInternalDead ∧
   noExternalDead`. `unverifiable` не блокирует, но считается. При `dead>0` — доклад не уходит.

## Контракт

| Слой | Путь |
|------|------|
| Ядро | `scripts/lib/report-lens.mjs` — structuralHash, protectedTokens, classifyLinkStatus, canPublish |
| Тесты | `scripts/report-lens.test.mjs` — без сети/моков |

**Инварианты (M4):** линза не redactor (structuralHash-гейт); факты дословно; `dead` блокирует,
`unverifiable` считается; ручной гейт «ок» владельца сверху `canPublish`.

## Definition of Done

- [ ] Линза-rephraser (изоморфизм дерева), protectedTokens, classifyLinkStatus, canPublish — чистые, тесты.
- [ ] `yarn test:scripts` зелёный; Teamlead LGTM.

## Движок задач

Linear (доступен через медиа-сервер): сценарий R, делегат — исполнитель.
