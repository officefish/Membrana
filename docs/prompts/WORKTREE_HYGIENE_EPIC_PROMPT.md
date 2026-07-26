# Промпт: Эпик — гигиена рабочих деревьев (#1232)

> **L** · `worktree-hygiene-epic` · [#1232](https://github.com/officefish/Membrana/issues/1232) · lead **vesnin**
> Цепь: Ф1–Ф2 в этом PR · Ф3 (норма в cold-start) частично · Ф4 инвентарь — follow-up.

## Контекст

Правило «ветка утра — main» выродилось в конкуренцию за чекаут. Ритуалу нужен
свежий чистый код, а не `HEAD == main`.

## Фазы

| Фаза | Суть | Статус |
|------|------|--------|
| Ф1 | `ritualTreeReady = freshEnough ∧ clean` в `morning-care`; порог behind=0 | этот PR |
| Ф2 | гард держателя main (путь+имя) + хуки commit/push | этот PR |
| Ф3 | норма в skill + AGENTS (cold-start) | этот PR (лёгкая) |
| Ф4 | инвентарь деревьев живое/спящее/снос | follow-up |

## DoD эпика (Ф1–Ф3)

- [ ] `morning-care` не делает `checkout main`
- [ ] отставание / грязь / держатель main — `[fail]` с причиной
- [ ] хуки режут commit/push с `HEAD == main` без `ALLOW_MAIN_COMMIT=1`
- [ ] тесты `ritual-tree-hygiene.test.mjs` зелёные
