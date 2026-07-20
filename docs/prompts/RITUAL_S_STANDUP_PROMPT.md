# Промпт: стендап Тимлидом (компонент S эпика ritual-refactor)

> **Task-промпт.** Размер: **M**. Артефакт: **1 PR** — чистый детерминированный стендап
> Тимлида + handoff + тесты. Реестр: `ritual-s-standup`. Дизайн: заседание M3
> ([`ritual-refactor-m3-standup-2026-07-20.md`](../seanses/ritual-refactor-m3-standup-2026-07-20.md)).
> DAG: `A → K → {S → R → D}`; A и K в main.

## Что построить

1. **`standup(dayIssue, engineSnapshot) → Plan`** — чистая, детерминированная. Автор и
   единственный писатель — `vesnin`. Читает Day Issue (каркас K) + снимок движка задач.
2. **Три состояния пункта:** `назначено` (владелец + живой taskRef) / `пробел` (намерение
   без живой задачи, warning) / `осиротело` (задача без владельца, error). Не два серых.
3. **Стендап РЕЗОЛВИТ и привязывает** существующие задачи, снимок замораживает; **НЕ
   создаёт** (Linear-контейнеры — в спринтах, не на планёрке). Нет задачи → `пробел`.
4. **`handoff(plan, persona) → HandoffCache | undefined`** — ссылки (taskRef, memoryRef,
   planRef), не копии; только для персон с ≥1 назначением; `memoryRef=(persona, revision=git log -1)`.
5. **`emptyPlan=true`** при непустом Day Issue без назначений — обязательный сигнал (анти-«молчун»).

## Контракт

| Слой | Путь |
|------|------|
| Ядро | `scripts/lib/standup-plan.mjs` — `standup`, `handoff`, `classifyAssignment`, без сети |
| Тесты | `scripts/standup-plan.test.mjs` — без моков |

**Инварианты (M3):** детерминизм (тот же вход+снимок → тот же план+order); движок читается
только снимком (не создаёт); `handoff` — проекция, ссылки; `emptyPlan` сигнален; исполнитель→движок
в обход плана запрещён.

## Definition of Done

- [ ] `standup`/`handoff`/`classifyAssignment` чистые; юнит-тесты (три состояния, детерминизм, emptyPlan).
- [ ] `yarn test:scripts` зелёный; Teamlead LGTM.

## Движок задач

Linear (доступен через медиа-сервер): сценарий S, делегат — исполнитель.
