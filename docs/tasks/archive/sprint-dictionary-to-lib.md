# Архив: Переезд словаря спринта в scripts/lib + структурный orphanedBy через closeProcedureRun

| Поле | Значение |
|------|----------|
| **ID** | `sprint-dictionary-to-lib` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-04 |
| **Архивирована** | 2026-08-04 |
| **GitHub Issue** | #1681 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SPRINT_DICTIONARY_TO_LIB_PROMPT.md`](../../docs/prompts/SPRINT_DICTIONARY_TO_LIB_PROMPT.md) |

## Заметки при закрытии

Спринт membrana-local-sprint, ратифицирован владельцем 04.08 (v2). PR #1706 merged: словарь прогона спринта (SPRINT_PROCEDURE_ID, sprintTrailRelPath, ensureSprintRunOpen) в scripts/lib/sprint-cut/sprint-run.mjs, импорт скрипт-к-скрипту execution-gate→sprint-cut-check мёртв; closeProcedureRun проносит структурный orphanedBy, кросс-файловая сирота несёт {runId, sequence, trail}. Гейт: 2/2 honest_pair, 0 находок. Зубы 88/88 + 33/33.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
