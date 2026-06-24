<!-- Сгенерировано: 2026-06-24 (branch review, pre-PR) -->

Tier: T2

[Teamlead]: Ветка `fix/user-function-delete-repair` — follow-up к P0 duplicate `fn-1` (симптом: React duplicate keys в `BoardFunctionList` / MiniMap после перезапуска). Repair на hydrate переназначает коллизии id и subgraph-блоки; удаление функции — по `draftIndex`, снимается один блок (`stripSubgraphBlocksForFunctionOccurrence`). `activeFunctionDraftIndex` разводит commit/select при совпадающих id. Комплементарно PR #159 (профилактика при collapse). **LGTM** после зелёного CI.

[Структурщик]: **C1** — только `@membrana/device-board`. Pure repair в `repair-duplicate-scenario-functions.ts`, hydrate вызывает до `syncAllSubgraphBlocksFromFunctionDrafts`. UI передаёт индекс в delete/select — без ломки публичного API core. Тесты: repair + remove by index + occurrence strip. ✅

[Математик]: —

[Музыкант]: —

[Верстальщик]: Список функций: `key={fn.id::index}`, active по id+index. Модалки удаления получают корректное имя по индексу. Консольные warning duplicate key должны исчезнуть после hydrate repair. ✅

---

**Итоговый артефакт:**  
Восстановление и безопасное удаление пользовательских функций при legacy-дубликатах `fn-N`.

**Definition of Done:**
```bash
yarn workspace @membrana/device-board run test -- src/graph/repair-duplicate-scenario-functions.test.ts src/graph/remove-user-function.test.ts
yarn workspace @membrana/device-board run lint
```

**Риски:** P2 — без PR #159 новые collapse всё ещё могут создавать дубликаты; repair/delete смягчают последствия. Рекомендуется мержить #159 первым или параллельно.

**Вердикт:** **LGTM**
