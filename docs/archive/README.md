# Архив документов Membrana

Снимки рабочих артефактов из `docs/`, которые утром или вечером **перезаписываются** скриптами. Исходные файлы в корне `docs/` после архивации **остаются** на месте.

## Структура

| Папка | Команда | Что хранится |
|-------|---------|----------------|
| [`daily-day/`](./daily-day/) | `yarn archive:daily-day` | Бандл за день: `STRATEGIC_PLAN_DAY.md`, `DAILY_STANDUP.md`, `MAIN_DAY_ISSUE.md`, `manifest.json` |
| [`daily-code-review/`](./daily-code-review/) | `yarn save-code-review` | `DAILY_CODE_REVIEW-<ISO-время>.md` |

## Как найти снимок за день

1. **Утренний контекст (план, стендап, фокус):** `docs/archive/daily-day/YYYY-MM-DD/`  
   - Имена файлов совпадают с каноническими в `docs/`.  
   - В `manifest.json` — `archivedAt`, список файлов и размеры.

2. **Вечернее code-review:** `docs/archive/daily-code-review/DAILY_CODE_REVIEW-*.md`  
   - Сортировка по имени ≈ по времени снимка.

Повторный `yarn archive:daily-day` без `--force` **не дублирует** бандл, если байт-в-байт совпадает с уже сохранённым за тот же `dayKey`.

## Вечерний порядок

См. [`DEVELOPER_RHYTHM.md`](../DEVELOPER_RHYTHM.md): сначала `archive:daily-day`, затем `code-review`, затем `save-code-review`.
