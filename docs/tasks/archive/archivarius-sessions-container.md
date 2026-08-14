# Архив: Контейнер сессий Archivarius: Mongo office, адресуемые span, ingest/search с секрет-маской

| Поле | Значение |
|------|----------|
| **ID** | `archivarius-sessions-container` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-07-27 |
| **Архивирована** | 2026-08-14 |
| **GitHub Issue** | #1330 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/ARCHIVARIUS_SESSIONS_CONTAINER_PROMPT.md`](../../docs/prompts/ARCHIVARIUS_SESSIONS_CONTAINER_PROMPT.md) |

## Заметки при закрытии

Приёмка 14.08: контейнер построен 27.07–04.08 (PR #1335/#1407/#1711), acceptance #1330 сверен по пунктам — docs/archivarius/acceptance-2026-08-14.md (PR #1930). Живой след: заливка 111073/111074 спанов, GET span сегодняшней сессии, sha сошёлся. Посылки MAIN_DAY_ISSUE опровергнуты probe (violated, фактические маркеры). Находка+фикс: именованный пропуск 413-гиганта (PR #1930).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
