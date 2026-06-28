# Промпт: регистрация инсайтов и прогон через все стадии lifecycle

> **Task-промпт** для задачи `insights-lifecycle-2026-06-28`. Размер: **S**.

---

## Контекст

В `docs/` обнаружены два брифа для инсайтов:
- Хранилище архива закрытых задач (append-only JSONL vs Postgres / SQLite)
- Архивация сессий AI-агентов (Claude JSONL / Langfuse / LangSmith)

## Задача

1. Создать систему инсайтов `docs/insights/` (структура директорий, `registry.json`, `INSIGHTS.md`).
2. Зарегистрировать оба инсайта в `docs/insights/registry.json` со статусом `draft`.
3. Провести каждый инсайт через все стадии:
   - `draft` → создать `INSIGHT.md` и `meta.json`
   - `researched` → создать `RESEARCH.md`, обновить `meta.json`
   - `reviewed` → создать `REVIEW.md` с консилиумом 5 ролей, выставить итоговый weight
   - `adopted` → обновить `meta.json` (status, reviewedAt) и `registry.json`
4. Все инсайты должны завершить цикл со статусом `adopted` или `deferred`.

## Принятые решения

- `insight-task-archive-storage`: adopted, weight 7.6, horizon week
- `insight-sessions-archive`: adopted, weight 6.8, horizon quarter
- Структура директорий: `docs/insights/<id>/{INSIGHT,RESEARCH,REVIEW}.md + meta.json`
- Навигационный документ: `docs/INSIGHTS.md`
