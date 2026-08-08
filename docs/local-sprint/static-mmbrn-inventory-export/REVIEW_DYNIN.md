# Review: offline-extractor

Reviewer: `dynin`

Block: `offline-extractor`

Final verdict: **LGTM**

## Initial BLOCK

1. Лексическая path-проверка допускала выход через junction/symlink.
2. Секрет мог пройти внутри разрешённого поля `databaseId`.

## Resolution

- Контеймент проверяется до чтения и после `realpath`; link наружу даёт fail.
- Идентификаторы и colon-delimited refs имеют закрытую грамматику без URL,
  credentials и путей.
- Добавлены отрицательные тесты на junction escape и credential-bearing field.
- Evidence rows сортируются по `kind:id`, поэтому равный exact set не зависит от
  порядка строк входного JSON.

Final focused test:
`node --test scripts/affine-inventory-lib.test.mjs scripts/affine-inventory-extractor.test.mjs`
— 11 pass, 0 fail.

## Exact-SHA BLOCK follow-up

Teamlead review SHA `200cfc7a` выявил order-sensitive nested `rels/grants` в
evidence hash. Первый fix получил профильный BLOCK, потому что relation fixture
был одноместным и `reverse()` ничего не проверял. Fixture теперь несёт по два
валидных relations и grants; перестановка обоих наборов сохраняет manifest/seal,
а exact-set и metadata comparison не ослаблены.

Follow-up verdict: **LGTM**; focused extractor test 6/6.
