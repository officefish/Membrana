# Промпт: W0 — бриф bestiary-workshop

> **M** · `bw-w0-brief` · [#946](https://github.com/officefish/Membrana/issues/946) · lead **vesnin** · parent `bestiary-workshop`

## Контекст

Семя — закрытый шторм
[`storm-bestiary-workshop-2026-07-22`](../storm/storm-bestiary-workshop-2026-07-22/REPORT.md)
(T1–T18). Сценарий в
[`BESTIARY_WORKSHOP_PROMPT.md`](./BESTIARY_WORKSHOP_PROMPT.md) и OPEN.
W0 — **открытие** спринта по слову владельца: реестр, Issues, ACTIVE; без кода
ловушек/Mintlify/кита.

## Промпт целиком

1. Подтвердить slug эпика `bestiary-workshop`, фазы W0–W5 и lead’ов из эпик-промпта
   (или зафиксировать правки владельца в OPEN + эпик-промпте).
2. Зарегистрировать эпик + фазы (`yarn task:start` / `task:register` по процессу);
   проставить Issue-номера в OPEN и шапках промптов.
3. OPEN
   [`docs/day-sprint/bestiary-workshop-2026-07-22/OPEN.md`](../day-sprint/bestiary-workshop-2026-07-22/OPEN.md):
   Status **open**; ссылки на промпты; инварианты T1–T18.
4. Запись в [`docs/DAY_SPRINT_ACTIVE.md`](../DAY_SPRINT_ACTIVE.md) + строка в
   [`DAY_SPRINT_LOG.md`](../DAY_SPRINT_LOG.md).
5. Явно перечислить открытые входы из REPORT (K25 шов; имя кита; объём Mintlify) —
   решения = W1/W3/W4, не молчаливый пробел.

## Acceptance criteria

- [ ] Эпик + 6 фаз в `docs/tasks/registry.json` (`status: active`, `parentEpic` у фаз)
- [ ] OPEN Status **open**; промпты связаны; Issue-номера проставлены
- [ ] `DAY_SPRINT_ACTIVE` указывает на этот инстанс
- [ ] LGTM vesnin (owner ok)

## Out of scope

Манифест мастерской (W1), реестры (W2), Mintlify (W3), кит (W4), CLOSURE (W5).
