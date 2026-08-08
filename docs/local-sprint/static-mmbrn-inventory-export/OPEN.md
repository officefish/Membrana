# Membrana Local Sprint OPEN: static-mmbrn-inventory-export

| Поле | Значение |
|------|----------|
| Sprint | `static-mmbrn-inventory-export` |
| Procedure | `membrana-local-sprint` |
| Registry card | `static-mmbrn-inventory-export` (#1305-A) |
| Parent epic | `static-mmbrn-container` |
| Plan | [`docs/sprint/cut/static-mmbrn-inventory-export.json`](../../sprint/cut/static-mmbrn-inventory-export.json) |
| Prompt | [`docs/meeting/static-mmbrn-container/EPIC.md`](../../meeting/static-mmbrn-container/EPIC.md) |
| Cutter | tarasov ([конспект](../../discussions/cut-static-mmbrn-inventory-export-tarasov.md)) |
| Team | ozhegov · dynin · vesnin |
| Status | CLOSED · gate pass 3/3 honest_pair · PR #1806 merged |

## Предмет

Построить воспроизводимый и fail-closed инструмент read-only source snapshot для
Affine. Он принимает только явно переданные офлайн-входы, строит канонический
sealed manifest и доказывает INV-1 на fixtures. Реальный production snapshot в
этом прогоне не берётся без отдельного owner/ops-разрешения.

## Accountable blocks

| Блок | Ответственный | Выход |
|------|---------------|-------|
| `snapshot-contract` | ozhegov | схема, canonicalization, seal и отрицательные предикаты |
| `offline-extractor` | dynin | детерминированный extractor и exact-set reconciliation |
| `cli-and-evidence` | vesnin | fail-closed CLI, fixtures, docs и процедурные evidence |

## Гейты

1. `sprint:cut` и owner ratification digest.
2. Byte-identical manifest и SHA-256 на двух прогонах одного fenced fixture.
3. Fail-closed на duplicate/missing/hash/fence/relation/grants mismatch.
4. Ноль сетевых и production-write путей; секреты и raw content не попадают в output.
5. По каждому блоку есть `context_run` и `review_pass`.
6. `sprint:gate`, journal, experience и exact-SHA closure review.

## Не делаем

- Не снимаем live production snapshot без отдельного разрешения.
- Не мигрируем страницы/assets и не создаём rehydrate bundle.
- Не заводим disposition ledger, canonical bindings или registry records.
- Не provision-им `static.mmbrn.tech` и не меняем DNS/Caddy/Panel.
- Не считаем baseline `82 pages / 57 assets` доказательством полноты.

## Результат и доставка

- Контракт, offline extractor и fail-closed CLI реализованы; focused suite 16/16.
- Два независимых smoke-прогона дали byte-identical manifest и seal.
- Ожегов, Дынин и Веснин увидели свои блоки; все финальные вердикты LGTM после
  сохранённых BLOCK и исправлений.
- Execution gate после recut: 3/3 `honest_pair`, 0 находок; старые следы Веснина
  сохранены как `superseded-by-recut`.
- `sprint:experience` записал прогноз 232/227/393, но его A→B адаптер не получает
  cut-act trail и потому видит `stale_partial`; прямой gate остаётся pass. Это gap
  sprint tooling, не зелёный факт INV-1.
- Live source snapshot и INV-1: **NOT_PERFORMED** до отдельного owner/ops-акта.
- Exact-SHA `0b559221` получил внутренний closure LGTM и канонический
  `review/teamlead=success`; GitHub CI прошёл полностью.
- PR #1806 смёржен в `main` как `741a403360497f4d62c427757e807ad00e94cd6a`.
- Итоговый акт: [`CLOSURE.md`](./CLOSURE.md).
