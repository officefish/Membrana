# Промпт: Провод sprint:experience — живой путь записи растит seq; путь ленты — одна константа

> **Task-промпт для агента-разработчика.** Размер: **S**. Lead: dynin, support: vesnin.
> Реестр: `id` = `fix-sprint-experience-dead-ends` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Источник: долг мостика `sprint-experience-dead-ends-after-recut` (detector, 10.08) —
> условие LGTM тимлида по PR #1833.

## Два шва одного файла

1. **Дедуп глотает новый прогноз после перерезки.** Гейт ADR-0026 требует прогноза по
   НОВОМУ составу блоков (`plan_blocks_mismatch` иначе — «перерезка требует нового
   прогноза»), а живой путь записи `scripts/sprint-experience.mjs` строит запись с тем же
   id (`<persona>-<sprintId>-cut-1`: seq не растёт, `forecastRecordId` дефолтит seq=1) и
   `added = fresh.filter((r) => !known.has(r.id))` молча её отбрасывает. Законной двери
   записать второй прогноз нет — закрытие спринта стопится навсегда.
   **Фикс:** живой путь вычисляет next seq по ленте (`max(seq по personaId+sprintId+subject)+1`);
   зуб: после перерезки запись с seq=2 дописывается и проходит гейт.
2. **Путь ленты продублирован.** `FORECAST_RECORDS_REL_PATH`
   (`scripts/lib/sprint-integration/forecast-record-gate.mjs:27`) против `RECORDS_PATH`
   (`scripts/sprint-experience.mjs:45`). Писатель переедет — читатель молча смотрит в
   старое место. **Фикс:** одна константа в lib (гейт уже там), скрипт импортирует из lib
   (lib→скрипт запрещён, скрипт→lib законен); зуб на равенство путей убрать за ненадобностью.

## Границы

- Формат записи рода (`forecast-record.mjs`) не менять — только seq у живого пути.
- `checkAppendOnly` остаётся: правка predicted существующей записи по-прежнему запрещена.
- Кандидат тем же заходом (оговорка Дынина 10.08): зуб инъективности `cutBlockId` в
  пределах окна плана.
