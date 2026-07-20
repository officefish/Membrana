# MEETING ACTIVE — `linear-egress-gear-wiring`

> Протокол **контейнера**, отдельный от протоколов консилиумов.
> Открыто: 2026-07-20 · Ветка: `meeting/linear-egress-gear-wiring` · worktree: `Membrana-meeting-egress`
> PR: https://github.com/officefish/Membrana/pull/690

---

## СТАТУС: M0–M1–M1b CLOSED · следующий по цепочке — К2

Слой 0 закрыт: К1 (форма egress) и К4a (каркас процедур). Цепочка дальше: **К2**
(секреты/trust) → К3 → {К5, К4b}.

Аудитор (S-M5) — **отдельный** агент; председатель аудитора не играет.

## Задание

**Спланировать и зафиксировать порядок решений, чтобы движок задач `LINEAR_TASKS_GEAR`
получил боевое движение через Linear и подводку спринта: региональные блокировки
разруливаются egress’ом через media-VPS NL; до провода — честные stub/фикстуры;
спринт согласуется с аксиомами движка (Issue = счёт, Linear = движение,
leadPersona + closure = след).**

Полностью: [`MEETING_BRIEF.md`](./MEETING_BRIEF.md). Изменение только через
`BRIEF_AMENDMENT.md` + LGTM владельца (S-M4).

## Роли

| Роль | Кто | Ограничение |
|---|---|---|
| Председатель | агент сессии (этот прогон) | не судит соблюдение процедуры |
| Аудитор | **отдельный** агент, read-only | не пишет повестку, не голосует, не чинит (S-M5) |
| Владелец | druid | задание, ратификация порядка M0 |

## Порядок (вердикт M0 — **РАТИФИЦИРОВАН владельцем 2026-07-20**)

**DAG (ратифицирован, дословно):**

```
К1 ∥ К4a → К2 → К3 → {К5, К4b}
```

## Вердикт M1 (К1 — форма egress) — CLOSED

Протокол: [`linear-egress-gear-wiring-m1-egress-path-2026-07-20.md`](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md).

media-NL = клиент Linear + инициатор pull; office = потребитель `linear-snapshot@1` только.

## Вердикт M1b (К4a — каркас процедур) — CLOSED

Протокол: [`linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md`](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md).

| Вопрос | Решение |
|---|---|
| Законный старт до кода | `yarn task:start`: Issue → биекция registry↔Issue → шаблон acceptance → stub `movement: deferred-egress` → `leadPersona` |
| register vs start | `task:register` = содержание (черновик ок); `task:start` = событие старта (Issue обязателен) |
| Гейт | `active ∧ ¬issueExists → reject` (register/pre-push) |
| Посев | убрать registry-only из AGENTS/lifecycle; поставить паспорт §2–§4 + словарь + `task:start` |
| Три носителя | Issue = удостоверение/счёт · registry = содержание · Linear parent = контейнер движения (stub, opt) |
| MAIN_DAY | единица вне магистрали — только с явным `override` + Issue владельца |

Секреты (К2), гейт closure (К4b), снятие stub (К5) — не решались здесь.

## Статус вопросов

| Фаза | Вопрос | Статус | Протокол / повестка |
|---|---|---|---|
| M0 | порядок (`E1`) | **CLOSED / ratified** | [m0-order](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) · [M0-topic](./M0-topic.md) |
| M1 | форма egress (`E2`, К1) | **CLOSED** | [m1-egress-path](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) · [M1-topic](./M1-topic.md) |
| M1b | каркас процедур (`E3`, К4a) | **CLOSED** | [m1b-sprint-scaffold](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) · [M1b-topic](./M1b-topic.md) |
| след. | секреты / trust (`К2`) | **следующий** | — |
| далее | К3 → {К5, К4b} | ждут К2 / К3 | — |

## Решено владельцем (посылки)

- Egress Linear / RU-блоков → **media-VPS NL**
- Агент/ноут в РФ не ходит в Linear напрямую
- Гейты читают снимок, не live fetch
- Задача без GitHub Issue незаконна

## Аудитор

Отдельный агент (председатель не играет, S-M5):

```bash
yarn meeting:audit --id linear-egress-gear-wiring
```

## Журнал

| Когда | Что |
|---|---|
| 2026-07-20 | Контейнер · M0 · ратификация DAG · M1 (К1). |
| 2026-07-20 | M1b (К4a): `task:start` + посев паспорта + роли трёх носителей. Следующий — К2. |
