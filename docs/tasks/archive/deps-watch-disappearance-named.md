# Архив: Исчезновение advisory называется поимённо и без выдуманной причины

| Поле | Значение |
|------|----------|
| **ID** | `deps-watch-disappearance-named` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-02 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEPS_WATCH_DISAPPEARANCE_NAMED_PROMPT.md`](../../docs/prompts/DEPS_WATCH_DISAPPEARANCE_NAMED_PROMPT.md) |

## Заметки при закрытии

Сделано в PR #1642 (4388f415, 02.08): ядро сравнения scripts/lib/deps-watch-diff.mjs + страж scripts/lib/deps-watch-audit-state.mjs, оба режима deps-watch.mjs сравнивают до перезаписи снимка, исчезнувшие advisory названы поимённо (severity/id/ссылка), слово «закрыто» изъято и держится зубом, пустой аудит блокирует и сравнение, и затирание. Ответ по brace-expansion дан замером (block-deps-watch-words-ozhegov.md).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
