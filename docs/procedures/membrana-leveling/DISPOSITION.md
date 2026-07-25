# disposition — гранула K1 (§8.2)

Чистая функция: [`scripts/lib/membrana-leveling-disposition.mjs`](../../../scripts/lib/membrana-leveling-disposition.mjs).

```
disposition(path, ctx) → live | ready | unfinished | trash
```

## Порты ctx

| Порт | Смысл |
|------|--------|
| `dirty` | путь изменён относительно базы снимка |
| `registered` | явная запись в реестре leveling / привязка к unit |
| `inActiveSession` | **session-lock / membership** оркестратора (не mtime) |
| `ciGreen` | CI зелёный для unit |
| `conflictsMain` | конфликт с main |
| `prApproved` | PR одобрен |
| `leadStamp` | штамп тимлида (T8); решение выставить — вне функции |
| `isTempOrScratch` | опционально перекрывает path-эвристику |
| `unitOf` | id единицы поставки (PR/ветка/карточка) |

## Порядок (R2)

1. `isTempOrScratch` → `trash`
2. `dirty ∧ inActiveSession` → `live`
3. `registered ∧ readyFacts ∧ leadStamp ∧ ¬session` → `ready`
4. `registered` → `unfinished` (в т.ч. readyFacts ∧ ¬stamp)
5. иначе → `trash` (fallback / тотальность)

`readyFacts ⇔ ciGreen ∧ ¬conflictsMain ∧ prApproved`.

## Продуктовый критерий

Таблица «путь → ожидание → факт» (≥10 разнородных):  
[`scripts/fixtures/membrana-leveling-disposition-product.mjs`](../../../scripts/fixtures/membrana-leveling-disposition-product.mjs)  
гоняется в `scripts/membrana-leveling-disposition.test.mjs`.
