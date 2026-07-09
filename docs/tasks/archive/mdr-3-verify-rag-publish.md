# Архив: mdr-3: docs:lint + catalog:verify-client + RAG-ритуал (index + smoke query) + проверка деплоя на аккаунте Mintlify

| Поле | Значение |
|------|----------|
| **ID** | `mdr-3-verify-rag-publish` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-09 |
| **Архивирована** | 2026-07-09 |
| **GitHub Issue** | #330 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/MINTLIFY_DOCS_REFRESH_SPRINT_PROMPT.md`](../../docs/prompts/MINTLIFY_DOCS_REFRESH_SPRINT_PROMPT.md) |

## Заметки при закрытии

docs:lint OK (51 pages) + catalog:verify-client OK; RAG: operative smoke query находит свежие термины, archive-контур (apps/docs mdx) DEFER — требует OPENAI_API_KEY; деплой-аудит: аккаунт Mintlify = ОТДЕЛЬНЫЙ репозиторий mintlify-community/docs-membrana-d6be932a (англ. реструктуризация, '37 файлов' ~2026-06-25), разошёлся с apps/docs; detection-контент доставлен туда аддитивным PR #1 (5 node pages + cookbook + palette index через Admin MCP), merge PR = решение владельца

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
