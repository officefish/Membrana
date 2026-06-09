# Архив: Media library A2: sample library UI and quota banner

| Поле | Значение |
|------|----------|
| **ID** | `media-library-a2-ui` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-09 |
| **Архивирована** | 2026-06-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/MEDIA_LIBRARY_A2_UI_PROMPT.md`](../../docs/prompts/MEDIA_LIBRARY_A2_UI_PROMPT.md) |

## Заметки при закрытии

SampleLibraryModule + quota banner; resolveMediaLibraryStorageMode(quota); import blocked at 100% quota; browser smoke OK.

## Отчёт о выполнении

- Модуль «Библиотека сэмплов» в `registerClientModules` (lazy).
- `MediaLibraryQuotaBanner`: fallback warning по `quota.backend`, пороги квоты.
- Import WAV, move buffer → user/system, CRUD коллекций.
- `yarn workspace @membrana/client typecheck` — OK.

## Артефакты

- `apps/client/src/modules/SampleLibraryModule.tsx`
- `apps/client/src/components/MediaLibraryQuotaBanner.tsx`
- `apps/client/src/lib/mediaLibraryStorageMode.ts`
- `docs/prompts/MEDIA_LIBRARY_A2_UI_PROMPT.md`

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
