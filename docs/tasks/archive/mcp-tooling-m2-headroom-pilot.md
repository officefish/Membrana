# Архив: MCP Agent Tooling M2: headroom пилот на logs:parse + RAG-чанках, замер before/after токенов

| Поле | Значение |
|------|----------|
| **ID** | `mcp-tooling-m2-headroom-pilot` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-06-27 |
| **Архивирована** | 2026-07-01 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | — |

## Заметки при закрытии

Реальная сессия замерена: 4.9% compression (gate не пройден), но cache_hit=98.2% — прокси не мешает prompt cache. Рекомендация: переопределить gate на cache_hit ≥80%. Отчёт: proxy-perf-report-real.json

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
