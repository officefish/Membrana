# Review: snapshot-contract

Reviewer: `ozhegov`  
Block: `snapshot-contract`  
Final verdict: **LGTM**

## Initial BLOCK

1. `sealInventoryManifest` мог подписать произвольный объект в обход схемы.
2. `Date.parse` принимал date-only и человеческие даты вместо ISO со смещением.
3. `localeCompare` делал порядок объектов зависимым от локали хоста.

## Resolution

- Seal сначала прогоняет полный manifest через закрытую схему и пересборку.
- Timestamp ограничен ISO-8601 со смещением и валидным временем.
- Идентификаторы имеют закрытую ASCII-грамматику; порядок задаётся сравнением
  code units, а не локалью.
- Добавлены отрицательные тесты на schema bypass, нестрогие даты и порядок.

Final focused test:
`node --test scripts/affine-inventory-lib.test.mjs` — 6 pass, 0 fail.

## Exact-SHA BLOCK follow-up

Teamlead review SHA `200cfc7a` выявил permissive calendar validation. Первый fix
через `Date.UTC` получил профильный BLOCK: годы 0000–0099 трактовались как
1900–1999. Итоговая реализация считает Gregorian leap year арифметикой и держит
зубы `0000-02-29` valid / `1900-02-29` invalid / offset выше `+14:00` invalid.

Follow-up verdict: **LGTM**; focused test 6/6.
