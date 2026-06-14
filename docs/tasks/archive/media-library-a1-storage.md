# Архив: Media library A1: storage backend and domain service

| Поле | Значение |
|------|----------|
| **ID** | `media-library-a1-storage` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-09 |
| **Архивирована** | 2026-06-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/MEDIA_LIBRARY_A1_STORAGE_PROMPT.md`](../../docs/prompts/MEDIA_LIBRARY_A1_STORAGE_PROMPT.md) |

## Заметки при закрытии

IStorageBackend + MemoryStorageBackend/browser-limited + MediaLibraryService + quota-status; 8 unit tests green.

## Отчёт о выполнении

- Пакет `@membrana/media-library-service`: порт `IStorageBackend`, in-memory browser-limited backend, `MediaLibraryService` (CRUD, move, quota, buffer limit).
- Reserved collections `__buffer__`, `__system_benchmark__`; delete guards на backend.
- `quota-status.ts`: пороги 90%/100%, `resolveMediaLibraryStorageMode`.
- `yarn workspace @membrana/media-library-service test` — 8/8.

## Артефакты

- `packages/services/media-library/`
- `docs/MEDIA_LIBRARY_ARCHITECTURE.md`
- `docs/prompts/MEDIA_LIBRARY_A1_STORAGE_PROMPT.md`

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
