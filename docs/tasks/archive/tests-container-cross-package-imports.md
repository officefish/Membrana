# Архив: Контейнер тестов: resolveImport слеп к @membrana/* и .tsx — gate-ярус scripts недобирает зависимости

| Поле | Значение |
|------|----------|
| **ID** | `tests-container-cross-package-imports` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-10 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TESTS_CONTAINER_CROSS_PACKAGE_IMPORTS_PROMPT.md`](../../docs/prompts/TESTS_CONTAINER_CROSS_PACKAGE_IMPORTS_PROMPT.md) |

## Заметки при закрытии

Закрыто спринтом s-queue-2026-08-11 b3, PR #1849 (6e4e1d84): workspacePackageDirs по глобам (40 пакетов, realpath-ключ), resolveImport видит @scope/pkg[/подпуть] и .tsx/index.tsx, попутно снят дефект «ребро в каталог» (firstFileOf). Замер: рёбра scripts→пакеты 0→11, всего 1490; зубы 8.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
