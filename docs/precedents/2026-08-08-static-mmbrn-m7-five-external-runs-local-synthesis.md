# Прецедент: M7 исчерпал 5 внешних прогонов и перешёл к local synthesis

<!-- precedent-meta
{
  "id": "2026-08-08-static-mmbrn-m7-five-external-runs-local-synthesis",
  "date": "2026-08-08",
  "class": "session-report",
  "symptom": "Пять внешних прогонов M7 не дали семантически годный migration delivery carrier",
  "rootCause": "Структурно полные ответы повторно подменяли точные M3-M6 predicates метками, вводили reverse edges и неполные route rows",
  "fix": "После исчерпания 5/5 председатель собрал local synthesis из run5, устранил доказанные BLOCK и предъявил ограничение независимого recheck владельцу",
  "canonicalCause": "Структурно полные ответы повторно подменяли точные M3-M6 predicates метками, вводили reverse edges и неполные route rows",
  "prevention": "Ограничивать комнату пятью внешними попытками, сохранять raw carriers, проверять predicates семантически и после потолка переходить к локальной сборке",
  "actionItems": [
    {"text": "Разобрать, почему structural PASS не удерживает exact M3-M6 predicates M7", "owner": "ozhegov", "status": "open"},
    {"text": "Сохранить raw run1-run5 и раскрыть отсутствие финального independent PASS", "owner": "vesnin", "status": "done"}
  ],
  "related": ["2026-08-05-static-mmbrn-m4-run4-overlay-chain-rate-limit", "2026-08-04-static-mmbrn-m3-run4-overlay-chain-exhausted"]
}
-->

## Предмет

Комната M7 заседания `static-mmbrn-container` должна была назначить исполнимый контракт
переезда `strategy.mmbrn.tech -> static.mmbrn.tech`, не переопределив ратифицированные M1-M6.
Владелец заранее установил предел: не больше пяти внешних попыток на комнату; после исчерпания
верстать протокол локально из добытых материалов, а вызовы сохранить как прецедент.

## Пять внешних попыток

| Попытка | Сырой carrier | Итог постаудита |
|---|---|---|
| run1 | [`run1`](../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-06-run1-m3-actions-rollout-cycles-inventory-retirement-predicates.md) | M3 actions, циклы DAG, недоказанный inventory, premature retirement |
| run2 | [`run2`](../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-07-run2-m3-objects-gate-cycles-m6-corpus-rollback-retirement.md) | вымышленные M3 objects, cycles, потеря M6 corpus, destructive rollback |
| run3 | [`run3`](../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-07-run3-cyclic-dag-readiness-ledger-inventory-routes-retirement.md) | cyclic readiness, открытый ledger, representative вместо per-object evidence |
| run4 | [`run4`](../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-08-run4-carrier-replies-cyclic-gates-m6-ledger-tables.md) | wrong carrier, 29 replies, M4/M5/M6 подменены, две таблицы отсутствуют |
| run5 | [`run5`](../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-08-run5-ledger-routes-m5-m6.md) | 42/7x6 и семь tables PASS, но reverse edge, multi-action routes, collapsed M5/M6 |

Шестой внешний вызов запрещён. Бюджет комнаты закрыт `5/5`.

## Что показал прецедент

1. `--min-replies 36` не гарантирует ролевой минимум: run4 записал 29 реплик и 5/5/5/5/5/4.
2. Названия `M4 G1-G10`, `M5 G1-G10` и `full M6` не удерживают semantics: модель сохраняла
   labels, но несколько раз заменяла predicates.
3. Требование append-only не предотвращает reverse edge, если модель называет его `new attempt`.
4. Ссылка на exact action set не предотвращает `one of 8` и multi-action route rows.
5. Structural `meeting:audit` честно не судит эти дефекты: все пять carriers могли иметь
   structural PASS при содержательном BLOCK.
6. Дата carrier является частью contract: run4 объявил `2026-08-07`, инструмент записал
   `2026-08-08`.

## Local synthesis

Canonical candidate:
[`static-mmbrn-container-m7-migration-delivery-2026-08-08.md`](../seanses/static-mmbrn-container-m7-migration-delivery-2026-08-08.md).

Он собран из run5 с сохранением сырого файла и явной provenance note. Исправлены:

- reverse retry заменён terminal attempt + child `INIT`;
- каждый forward развёрнут в одну M3 action/object pair либо pre-action deny;
- M5 G1-G10 и девять M6 predicates развёрнуты построчно;
- access-dependent M4 G5, M5 G6-G7 и M6 bypass перенесены после route staging;
- M4 G6 повторяется после S8 writes;
- M4 G1 несёт полную quota/capacity formula;
- M6 включает `A_all` и state-linked `0/0`, `0/1`, `1/1/1` cardinalities.

## Граница завершения

Смысловые BLOCK первого local audit устранены. Финальный независимый recheck завис и не дал
вердикта; повторный короткий dispatch также не стартовал. Это не PASS и не новый внешний run.
Владелец ратифицировал local synthesis 2026-08-08 с явно раскрытым отсутствием конечного
независимого PASS. Зависший вызов остаётся отказом дать verdict, а не PASS. Доставка в
review/ствол выполняется отдельно обычным PR-процессом.
