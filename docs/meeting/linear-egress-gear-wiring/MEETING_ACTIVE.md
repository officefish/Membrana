# MEETING ACTIVE — `linear-egress-gear-wiring`

> Протокол **контейнера**, отдельный от протоколов консилиумов.
> Открыто: 2026-07-20 · Ветка: `meeting/linear-egress-gear-wiring`
> PR: https://github.com/officefish/Membrana/pull/690

---

## СТАТУС: ВСЕ УЗЛЫ DAG CLOSED · заседание готово к закрытию

Все вопросы ратифицированного порядка закрыты вердиктами. Осталось:
аудит процедуры **отдельным** агентом (S-M5) · слово владельца на merge PR #690 ·
реализация вне контейнера заседания.

Председатель аудитора не играет.

## Задание

См. [`MEETING_BRIEF.md`](./MEETING_BRIEF.md). Сборка: [`EPIC.md`](./EPIC.md).

## Порядок (M0 — **РАТИФИЦИРОВАН владельцем 2026-07-20**)

```
К1 ∥ К4a → К2 → К3 → {К5, К4b}
```

## Статус вопросов

| Фаза | Вопрос | Статус | Протокол |
|---|---|---|---|
| M0 | порядок (`E1`) | CLOSED / ratified | [m0-order](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | egress (`E2`, К1) | CLOSED | [m1-egress-path](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | каркас (`E3`, К4a) | CLOSED | [m1b-sprint-scaffold](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| M2 | секреты (`E4`, К2) | CLOSED | [m2-secrets-trust](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) |
| M3 | снимок (`E5`, К3) | CLOSED | [m3-snapshot-dod](../../seanses/linear-egress-gear-wiring-m3-snapshot-dod-2026-07-20.md) |
| M4 | stub-lift (`E6`, К5) | CLOSED | [m4-stub-lift](../../seanses/linear-egress-gear-wiring-m4-stub-lift-2026-07-20.md) |
| M4b | closure (`E7`, К4b) | CLOSED | [m4b-closure-gate](../../seanses/linear-egress-gear-wiring-m4b-closure-gate-2026-07-20.md) |

### M4 (К5) — кратко

Снятие stub: `∃S: pullOk(S) ∧ media-NL ∧ ¬fixture`. Переключатель явный
`{movementMode, snapshotRef, switchedAt}`. Silent-flip запрещён. После `t₀` —
stub при live незаконен; единицы до `t₀` не переписываются. Closure stub не снимает.

### M4b (К4b) — кратко

Closure-гейт: closure artifact + card + снимок офлайн. Сверх `pullOk`: `present`,
`issueClosed@headRev`, `acceptedBy≠∅`. Digest не обязателен в `@1`. Коды: мягкий 10;
жёсткий 20/22/23. Stub ортогонален closure.

## Аудитор

```bash
yarn meeting:audit --id linear-egress-gear-wiring
```

## Журнал

| Когда | Что |
|---|---|
| 2026-07-20 | M0…M3 · M4 stub-lift · M4b closure. DAG закрыт. Ждёт audit + merge владельца. |
