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

