# Регламент: day-sprint

> Операционный lifecycle дневного эпика (карточки + фазы + инстанс-папка).
> Определение процедуры: [`docs/procedures/day-sprint/`](./procedures/day-sprint/).
> Не путать с [Night Sprint](./NIGHT_SPRINT_REGULATION.md),
> [Cowork](./COWORK_SPRINT_REGULATION.md), [Competition](./COMPETITION_SPRINT_REGULATION.md).

---

## Когда day-sprint

- Работа режется на **эпик L** + **фазы M** с отдельными Issue/карточками.
- Нужны OPEN / CLOSURE и хронология в `DAY_SPRINT_LOG`.
- Держатели фаз — `leadPersona` (виртуальная команда), не агент-исполнитель.

**Не day-sprint:** ночной автономный прогон (`night:*`); cowork/competition как
отдельные форматы; одиночная S-задача без эпика.

---

## Определение ↔ инстанс

| Слой | Путь |
|------|------|
| Определение (класс) | `docs/procedures/day-sprint/` |
| Инстанс (прогон) | `docs/day-sprint/<id>/` (OPEN, CLOSURE, …) |
| Указатели | `DAY_SPRINT_ACTIVE.md`, `DAY_SPRINT_LOG.md` |
| Карточки | `docs/tasks/registry.json` (`sprintKind: day-sprint`) |

Инстансы **не** переезжают в `docs/procedures/`.

---

## Жизненный цикл

1. **Старт эпика** — `yarn task:start` (эпик) + фазы с `--parent-epic` / `leadPersona`.
2. **OPEN** — `docs/day-sprint/<id>/OPEN.md` (руками / агент по skill; yarn open нет).
3. **Фазы** — каждая со своим Issue; archive по фазе после merge.
4. **ACTIVE / LOG** — обновить указатели (при параллели — не затирать чужой спринт без нужды).

   **Параллель в `DAY_SPRINT_ACTIVE.md` (канон ATF4-2 / #970):**

   - Блок **Focus** — спринт текущего сеанса; чужой Focus **не переписывать**.
   - Блок **Also open (не затирать)** — соседний open-спринт: обновлять только
     свою строку фазы/PR; при закрытии — снять блок, не трогая Focus.
   - Запрещено подменять весь файл однострочным «Активен: мой спринт», если
     Focus уже указывает на другой эпик (рецидив конфликтов F3–F5 / bestiary).
5. **CLOSURE** — `docs/day-sprint/<id>/CLOSURE.md` + archive фаз и эпика.
6. **GitHub** — вечерний батч `yarn task:close-github` (не блокирует archive).

Канон закрытия: [`TASK_CLOSURE_REGULATION.md`](./prompts/TASK_CLOSURE_REGULATION.md).  
Операторский skill: `membrana-task-lifecycle`.

---

## Движки

См. `engines[]` в [`procedures/day-sprint/MANIFEST.json`](./procedures/day-sprint/MANIFEST.json):
`task:start`, `task:register`, `task:archive`, `task:close-github`, `task:sync-readme` / list,
`task-registry` lib. `kitVersion: null`.

---

## Acceptance (инстанс закрыт)

- [ ] DoD фаз выполнены; CLOSURE написан
- [ ] Карточки archived с `archiveNotes` (PR)
- [ ] Определение процедуры не разъехалось с фактическим ритмом (или follow-up Issue)
