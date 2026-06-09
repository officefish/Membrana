# Промпт: Media Library A1 — storage backend и домен

> **Task:** `media-library-a1-storage` · фаза **A1** · размер **M**  
> Архитектура: [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md)

---

## Цель

`@membrana/media-library-service`: порт `IStorageBackend`, `BrowserLimitedStorageBackend`, домен `MediaLibraryService`, unit-тесты.

## DoD

- [x] Типы Collection / MediaSample / StorageQuota
- [x] Reserved: `__buffer__`, `__system_benchmark__` (system undeletable)
- [x] moveSample, quota, delete guards
- [x] `yarn workspace @membrana/media-library-service test` зелёный

## Out of scope

- UI (A2), mic hub (A3), Electron/server (A4–A5)
