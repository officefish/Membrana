# Промпт: W5 — CLOSURE bestiary-workshop

> **M** · `bw-w5-closure` · [#951](https://github.com/officefish/Membrana/issues/951) · lead **vesnin** · parent `bestiary-workshop`

## Контекст

Эпик закрывается после W0–W4. Образец CLOSURE:
[`bestiary-container-2026-07-21/CLOSURE.md`](../day-sprint/bestiary-container-2026-07-21/CLOSURE.md).

## Промпт целиком

1. Написать
   [`docs/day-sprint/bestiary-workshop-2026-07-22/CLOSURE.md`](../day-sprint/bestiary-workshop-2026-07-22/CLOSURE.md):
   фазы W0–W5 + PR; матрица DoD эпика; handoff / follow-up (полный каталог ловушек,
   доп. Mintlify-страницы, новые детекторы — явно).
2. OPEN → Status **closed**;
   [`DAY_SPRINT_ACTIVE.md`](../DAY_SPRINT_ACTIVE.md) → нет активного **или**
   следующий спринт (не затирать чужой без нужды).
3. Сверить acceptance [`BESTIARY_WORKSHOP_PROMPT.md`](./BESTIARY_WORKSHOP_PROMPT.md).
4. Sanity: `yarn bestiary:audit` (дом #878 не сломан) + `yarn kits:audit --id <id>`
   (кит W4).
5. Archive фазы W5 + эпик `bestiary-workshop` после merge (`yarn task:archive` + notes).

## Acceptance criteria

- [ ] CLOSURE.md полный; OPEN closed; ACTIVE cleared/обновлён
- [ ] Эпик acceptance отмечен; follow-up названы (не молчаливые пробелы)
- [ ] Sanity audit дома + кита зелёные (или ⚠ с причиной в CLOSURE)
- [ ] LGTM vesnin (owner ok) → archive после merge

## Out of scope

Новые ловушки/классы; правки HOME_WORKSHOP сверх уже принятого в W1; внешний
Mintlify-community.
