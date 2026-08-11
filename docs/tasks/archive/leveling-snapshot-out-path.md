# Архив: Снимок выравнивания ломается на абсолютном --out (клеит путь к корню репозитория)

| Поле | Значение |
|------|----------|
| **ID** | `leveling-snapshot-out-path` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/LEVELING_SNAPSHOT_OUT_PATH_PROMPT.md`](../../docs/prompts/LEVELING_SNAPSHOT_OUT_PATH_PROMPT.md) |

## Заметки при закрытии

Закрыто спринтом s-queue-2026-08-11 b6, PR #1849 (6e4e1d84): resolve вместо join(cwd,·) в трёх точках (snapshot --out, workspace-level --snapshot/--out), три зуба живьём (абсолютный путь во вложенный каталог, абсолютный snapshot, ..-сегмент). Симлинк-зуб честно отложен: нужен терминал с привилегией reparse points (вещдок env-symlink-probe-2026-08-11).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
