# Нарезка static-mmbrn-inventory-export

Дата: 2026-08-08  
Резчик: `tarasov`  
Карточка: `static-mmbrn-inventory-export` (#1305-A)

## Решение резчика

Задача исполняется как один `membrana-local-sprint` и один PR. Формулировка
«Affine export» сужена до **read-only source snapshot extraction**: миграционный
export, rehydrate и перенос байтов принадлежат #1305-C/S5 и в этот спринт не входят.

Нарезка состоит из трёх атомов:

1. `snapshot-contract` — Ожегов держит форму sealed manifest и запреты на
   disposition/binding/canonical records.
2. `offline-extractor` — Дынин держит детерминированную сборку из явно переданных
   офлайн-входов и доказательство exact-set, а не counts-only.
3. `cli-and-evidence` — Веснин держит fail-closed CLI, документацию, fixtures и
   полную процедурную ленту.

## Профильные заключения

### Дынин

GO на инструмент, NO-GO на эксплуатационный экспорт и S5. Manifest обязан нести
идентичность fenced source, версию extractor, строки объектов с
`id/kind/hash/ts/rels/grants`, evidence descriptors и detached SHA-256 seal.
Одинаковый fenced input обязан давать byte-identical manifest. Baseline `82/57`
информативен, но не доказывает полноту. Неизвестность, несовпадение fences,
duplicate key, dangling relation, отсутствие grants или hash mismatch дают FAIL.

### Ожегов / Структурщик

Первоначальная широкая формулировка BLOCK: она смешивала source snapshot с S5.
После явного сужения — LGTM. CLI принимает только явные `--input`/`--out`, не
имеет production default, не читает `.env`, не ходит по SSH/HTTP/GraphQL и не
вызывает `affine:import`, `affine:sync`, publish или frozen bypass. Реальный INV-1
остаётся `NOT PERFORMED`, пока отдельным owner/ops-актом не предоставлен fenced
read-only source snapshot.

## Стоп-условия

- Любая запись в production Affine, БД, DNS, Caddy, Panel или target storage.
- Секреты, raw document bytes или приватные ссылки в коммитимом evidence.
- Подмена exact set числом страниц/assets или выводом `affine-cli doc list`.
- Disposition, canonical binding, registry ledger, rehydrate или migration copy.
- Зелёный результат при неполном входе, несовпавших fences либо неизвестном поле.

## Definition of Done нарезки

- Машинный `sprint:cut` видит три непересекающиеся зоны и только ожидаемую
  находку `plan_unratified` до слова владельца.
- После ратификации каждый блок оставляет `context_run` и `review_pass`.
- Реализация и fixture evidence доказывают воспроизводимость без обращения к
  production; живой read-only snapshot требует отдельного разрешения.
- Exact-SHA Teamlead review и обычная task closure обязательны до доставки.

