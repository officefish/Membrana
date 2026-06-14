# Промпт: Tariff Dataset DS2 — domain model (без benchmark)

> Task-промпт · размер **M** · **1 PR**.  
> Реестр: `tariff-dataset-ds2-domain` · эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md).  
> GitHub Issue: [#47](https://github.com/officefish/Membrana/issues/47).  
> **Зависит от:** merge DS1.

---

## Контекст

Убрать `__system_benchmark__`. Единственная system-коллекция: `__tariff_dataset__` (`systemKey: tariff-dataset`), read-only. Catalog samples не входят в user-квоту.

---

## Промпт целиком

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Domain | `packages/services/media-library` | constants, types, MemoryStorageBackend guards, `bundled-catalog.ts`, `seedBundledCatalogIfEmpty` |
| Server | `packages/background-media` | `ensureReserved`: buffer + tariff-dataset only |

### Запрещено

- `SYSTEM_BENCHMARK_COLLECTION_ID`, `systemKey: benchmark`.
- Upload/delete/move в tariff-dataset.

### Definition of Done

- [ ] `TARIFF_DATASET_COLLECTION_ID`, `FREE_V1_CATALOG_ID` экспортированы.
- [ ] `ensureReservedCollections` — buffer + tariff только.
- [ ] Unit-тесты: seed 120 (skip если v0.2 нет), guards upload/move/delete.
- [ ] `docs/MEDIA_LIBRARY_ARCHITECTURE.md` §2.2 обновлён.
- [ ] `yarn workspace @membrana/media-library-service test` green.
- [ ] Отчёт Issue #47 + `yarn task:archive tariff-dataset-ds2-domain`.

### Out of scope

- `apps/client/public/` (DS3).
- Server blob provisioning (DS5).
