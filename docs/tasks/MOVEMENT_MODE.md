# Movement mode (К5 / M4)

> Вердикт: `docs/seanses/linear-egress-gear-wiring-m4-stub-lift-2026-07-20.md`  
> Паспорт: [`LINEAR_TASKS_GEAR.md`](./LINEAR_TASKS_GEAR.md) §6

## Носитель (единственный)

| Поле | Где |
|---|---|
| Атомарная запись | **`docs/tasks/movement-mode.json`** |
| Ссылка на артефакт | `snapshotRef` → файл в git (`docs/tasks/snapshots/…`) |
| Писатель | **только** `scripts/movement-mode-lift.mjs` (`yarn movement:lift`) после `pullOk(S)` |
| Читатели | `scripts/lib/movement-mode.mjs` → `yarn movement:status` / будущие гейты `task:start` |

Значения `movementMode`:

- `deferred-egress` — stub (нет честного live артефакта **или** файл отсутствует → default stub)
- `live-snapshot` — фикция снята; обязательны `snapshotRef` + `switchedAt` (= `t₀`)

**Не** холод (`archive.jsonl`), **не** env, **не** silent-flip из producer/capture.

## Явный lift

```bash
# 1) сохранить S с pullOk=true (media-NL)
# 2) dry-run
yarn movement:lift -- --snapshot docs/tasks/snapshots/linear-snapshot-live-ref.json
# 3) записать
yarn movement:lift -- --snapshot docs/tasks/snapshots/linear-snapshot-live-ref.json --execute --by issue-N/who
yarn movement:status -- --audit
```

## Что незаконно после `t₀`

| Правило | Код |
|---|---|
| Печать stub `deferred-egress` при `live-snapshot` | 21 |
| `live-snapshot` без `snapshotRef` | 20 |
| Единица с `createdAt ≥ switchedAt` без `snapshotRef` | 21 |

Единицы **до** `t₀` не переписываются — исторический stub легитимен (`assertUnitMovementLegal`).

## Связь с office GraphQL

Office issue-view **не** ходит в Linear (К1). Live факты движения — только через media egress + этот флаг/снимок.
