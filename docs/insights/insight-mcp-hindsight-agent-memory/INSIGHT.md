# INSIGHT: Hindsight — обучающаяся память агента между сессиями

| Поле | Значение |
|------|----------|
| **ID** | `insight-mcp-hindsight-agent-memory` |
| **Статус** | draft |
| **Источник** | `mcp-tooling-consilium` (2026-06-27) |
| **Создан** | 2026-06-27 |

---

## Проблема / наблюдение

Два сигнала из практики:

1. **Phase F-fix инцидент (`repo-leveling`):** агент запустил оборванный ритуал поверх sealed-состояния — ошибка, которую уже видели раньше. Нет механизма «помни: если рабочее дерево sealed — не перезапускать ритуал».
2. **Ручные `*_LESSONS.md`:** уроки фиксируются вручную в Markdown, но агент при следующей сессии не читает их автоматически. Знание накапливается в документах, не в памяти агента.

Сейчас doc-RAG (`rag-evening-index`) + `DEVELOPER_RHYTHM.md` + Claude Code memory частично закрывают нишу, но не дают проактивного предупреждения о повторе конкретной ошибки.

## Гипотеза

Self-hostable hindsight-слой (Experiences / Mental Models) даёт агенту структурированную память о прошлых ошибках. При следующей сессии агент видит: «при такой конфигурации ты делал X — это привело к Y». Снижает класс Phase F-fix ошибок.

Если внедрить — получаем: автоматизацию `*_LESSONS.md`, проактивные предупреждения, уменьшение повторных инцидентов класса «оборванный ритуал».

## Scope (черновик)

- **In scope:** self-hostable вариант (не Vectorize), MCP-интеграция с Cursor/Claude Code, хранение Experiences по категориям (ritual, sprint, deploy), интеграция с вечерним ритуалом
- **Out of scope:** Vectorize-хостед (§5-запрет, данные уходят наружу); UI-дашборд; дублирование существующего doc-RAG

## Связи

- Консилиум: [`docs/discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md`](../../discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md)
- Инцидент: `repo-leveling` Phase F-fix (2026-06-27)
- Репо Vectorize: https://github.com/vectorize-io/hindsight (хостед, §5-запрет)
- Репо JetBrains: https://github.com/Shazil10/hindsight (не Cursor/Claude)
- `docs/DEVELOPER_RHYTHM.md` — вечерний ритуал, где могло бы писаться

## Вопросы для research (Q1–Q3)

1. **Landscape:** self-hostable agent memory MCP 2025–2026; альтернативы Vectorize (Mem0, Letta, Zep); совместимость с Cursor/Claude Code
2. **Fit (Membrana):** перекрытие с doc-RAG + consilium + Claude Code memory; что добавляет отдельный слой; интеграция с `DEVELOPER_RHYTHM.md`
3. **Risk:** §5 — что хранится, куда уходит; cold-start наполнение базы; maintenance overhead vs ценность
