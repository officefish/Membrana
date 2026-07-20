# MEETING ACTIVE — `linear-egress-gear-wiring`

> Протокол **контейнера**, отдельный от протоколов консилиумов.
> Открыто: 2026-07-20 · Ветка: `meeting/linear-egress-gear-wiring` · worktree: `Membrana-meeting-egress`
> PR: https://github.com/officefish/Membrana/pull/690

---

## СТАТУС: M0–M1–M1b–M2 CLOSED · следующий — К3

Закрыты: порядок · форма egress · каркас процедур · секреты/trust.
Дальше по DAG: **К3** (контракт снимка + DoD первого боевого pull) → {К5, К4b}.

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
| Председатель | агент сессии | не судит соблюдение процедуры |
| Аудитор | **отдельный** агент, read-only | не пишет повестку, не голосует, не чинит (S-M5) |
| Владелец | druid | задание, ратификация порядка M0 |

## Порядок (M0 — **РАТИФИЦИРОВАН 2026-07-20**)

```
К1 ∥ К4a → К2 → К3 → {К5, К4b}
```

## Вердикты слоёв

### M1 (К1) — CLOSED
[`m1-egress-path`](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md):
media-NL = клиент+pull; office = потребитель снимка.

### M1b (К4a) — CLOSED
[`m1b-sprint-scaffold`](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md):
`task:start` · посев паспорта · Issue/registry/Linear roles.

### M2 (К2) — CLOSED
[`m2-secrets-trust`](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md).

| Вопрос | Решение |
|---|---|
| Где `LINEAR_API_KEY` | **только media-NL** (политика; inventory на VPS не выдуман) |
| Кто инициирует egress к Linear | **только процесс на media** (cron / локальный webhook) |
| Office / агент РФ НЕ держат | `LINEAR_API_KEY`, прямой GraphQL, путь к egress |
| Auth office→media (trigger) | существующий `X-Membrana-Token` / `API_INTERNAL_TOKEN`; Linear key не передаётся |
| Отложено | узкий egress-secret при k≥2; cold-only pull при on-demand+полной изоляции |

Уходит в К3: провенанс `producedBy: media-NL` + регион (контракт, не секрет).

## Статус вопросов

| Фаза | Вопрос | Статус | Протокол / повестка |
|---|---|---|---|
| M0 | порядок (`E1`) | CLOSED / ratified | [m0-order](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) · [M0-topic](./M0-topic.md) |
| M1 | egress (`E2`, К1) | CLOSED | [m1](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) · [M1-topic](./M1-topic.md) |
| M1b | каркас (`E3`, К4a) | CLOSED | [m1b](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) · [M1b-topic](./M1b-topic.md) |
| M2 | секреты (`E4`, К2) | CLOSED | [m2](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) · [M2-topic](./M2-topic.md) |
| след. | снимок / DoD pull (`К3`) | **следующий** | — |
| далее | {К5, К4b} | ждут К3 | — |

## Решено владельцем (посылки)

- Egress → media-VPS NL · агент РФ ≠ Linear напрямую · гейты = снимок · нет Issue → незаконно

## Аудитор

```bash
yarn meeting:audit --id linear-egress-gear-wiring
```

(отдельный агент; председатель не играет)

## Журнал

| Когда | Что |
|---|---|
| 2026-07-20 | M0 ratified · M1 · M1b |
| 2026-07-20 | M2: LINEAR key только media; trigger office→media через X-Membrana-Token. Следующий — К3. |
