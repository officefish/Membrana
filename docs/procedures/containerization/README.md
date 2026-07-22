# Процедура: containerization — крафт контейнеров и китов

**Определение.** Процедура работы **Мастера контейнеризации**: различить оси
пространства (`GROUP_CONTAINERIZATION`) и времени (`PINNED_SUBGRAPH_VERSIONING`),
опереться на опыт живых домов, прогнать зубы аудита и собрать/достроить контейнер
или кит без смешения слоёв.

**Держатель:** Ozhegov (`leadPersona` манифеста).

**Системный промпт:** [`CONTAINERIZATION_MASTER_PROMPT.md`](../../prompts/CONTAINERIZATION_MASTER_PROMPT.md).

## Определение ↔ прогон

Этот каталог — **определение**. Прогоны (сессии крафта) не мигрируют сюда:
артефакты пишутся в дом целевой группы (`docs/audit/*`, `scripts/`, `kits/<id>/`).
Эпик оснащения: `kits-containerization-master`.

## Движки

Код — плоский `scripts/` (Т12). Полный набор пинится китом
[`kits/containerization-master/`](../../../kits/containerization-master/)
(`yarn kits:audit`). В `engines[]` — якоря слоя (kit-audit + layer-direction +
procedures-registry), не дубль всех roots.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `kitVersion: kits/containerization-master`.
Зуб: `validateProcedure`.

## Не путать

| Это | Не это |
|-----|--------|
| Процедура крафта контейнеров | Сами контейнеры git/tasks/scripts |
| `kitVersion` → кит инструментов | Пин Mintlify в `docs/audit/git/pins/` |
| Cold-start Мастера | Спринт `procedure-frames` (#900) — `frames[]` |
| `docs/procedures/containerization/` | Достройка органов всего `docs/procedures/` (следующий трек) |
