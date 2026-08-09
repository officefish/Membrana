# Архив: NB1: кнопка «Экспорт меток (JSON)» коллекции в SampleLibraryModule

| Поле | Значение |
|------|----------|
| **ID** | `nb-vlr-1-labels-export-ui` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-03 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md`](../../docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

Кнопка «Экспорт меток (JSON)» у коллекции живёт в main: apps/client/src/modules/SampleLibraryModule.tsx, handleExportLabels (L178) + кнопка L397-399, выгрузка fileName/label/notes как вход для vdr:labels-merge. Влито aaf4d119 (PR #241).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
