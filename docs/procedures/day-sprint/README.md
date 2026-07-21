# Процедура: day-sprint — дневной спринт (эпик + фазы)

**Определение.** Day-sprint — процедура ведения **дневного** эпика разработки:
регистрация карточек (`task:start`), фазы с `parentEpic` и `leadPersona`,
инстансы в `docs/day-sprint/<id>/` (OPEN → работа → CLOSURE), архивация
реестра и вечернее закрытие GitHub Issues. Оперирует категориями слоя: задачей
(карточки M/L), командой (`leadPersona` / виртуальная команда на фазах),
ответственностью (принимающий выход фазы) и стратегической целью (эпик дня).

**Держатель:** Vesnin (`leadPersona` манифеста).

**Регламент:** [`docs/DAY_SPRINT_REGULATION.md`](../../DAY_SPRINT_REGULATION.md).

## Определение ↔ прогон (вердикт Р1)

Этот каталог — **определение** (класс). **Прогоны** (инстансы) живут в
`docs/day-sprint/<id>/` и сюда не мигрируют; манифест ссылается на закрытые
CLOSURE через `precedents[]`. Указатели `DAY_SPRINT_ACTIVE.md` /
`DAY_SPRINT_LOG.md` — операторские, не часть контейнера определения.

## Движки

Код — плоский `scripts/` (Т12). Оркестратора `day-sprint:open` **нет**: OPEN/CLOSURE
пишет агент по skill `membrana-task-lifecycle`; жизненный цикл карточек —
`task:start` / `archive` / `close-github`.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `id`, `leadPersona`, `kitVersion: null`
(кит не требуется), `engines[]`, `precedents[]`. Зуб: `validateProcedure`.

## Не путать

| Это | Не это |
|-----|--------|
| day-sprint (ритм эпика+фаз) | Night Sprint / Cowork / Competition |
| `docs/procedures/day-sprint/` | `docs/day-sprint/<id>/` (инстансы) |
| `kitVersion: null` | киты `angelina-morning` / `dream-master` |
