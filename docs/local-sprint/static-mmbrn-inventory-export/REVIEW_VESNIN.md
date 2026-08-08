# Review: cli-and-evidence

Reviewer: `vesnin`

Block: `cli-and-evidence`

Final verdict: **LGTM**

## Initial BLOCK

1. Entrypoint через `URL.pathname` молча не запускался из пути с пробелом.
2. Evidence hash зависел от порядка строк логически равного set.
3. `LOCAL_SPRINT_ACTIVE` отставал от владельческой ратификации; trace pairs ещё
   не были записаны.

## Resolution

- Entrypoint сравнивает `fileURLToPath` и `realpath`; тест проходит через junction
  с пробелами.
- DB/export evidence канонизируются после сортировки по ключу объекта.
- Активный указатель обновлён; эта запись и машинная trail фиксируют три пары
  только после финальных профильных LGTM.

Final focused test:
`node --test scripts/affine-inventory.test.mjs scripts/affine-inventory-lib.test.mjs scripts/affine-inventory-extractor.test.mjs`
— 16 pass, 0 fail.

## Recut v2 review

Первый просмотр recut дал BLOCK: `OPEN.md` и `LOCAL_SPRINT_ACTIVE.md` оставались
в состоянии ожидания уже состоявшейся ратификации. После исправления оба
указателя согласованы с owner digest. Добавлены ровно два фактических carrier
канонического `sprint:experience`; scope не расширен. Финальный перемер
`232/227/393` сохраняет превышение `cli-and-evidence` над прогнозом 330 (384 на входе review; 393 вместе с этим review и свежей парой traces).

Final recut verdict: **LGTM**.
