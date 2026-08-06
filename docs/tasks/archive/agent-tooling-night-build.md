# Архив: Night Build: инструменты агента — pr:ship, build:affected, wire-sync, хуки, хелперы, скиллы

| Поле | Значение |
|------|----------|
| **ID** | `agent-tooling-night-build` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-07-08 |
| **Архивирована** | 2026-08-06 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`](../../docs/prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

Эпик выполнен ночью 2026-07-08. Все девять фаз доставлены в origin/main и проверены пофайлово 06.08: NB1 строка .gitignore:149; NB2 pr-ship.mjs+зуб; NB3 build-affected.mjs+зуб; NB4 verify-wire-sync.mjs+зуб и шаг pre-push; NB5 .githooks/commit-msg (архивирована ранее); NB6 deploy-when-green.mjs и prisma-migration-new.mjs+зубы; NB7 tasks-archive-closed.mjs и lib/git-day-context.mjs (архивирована ранее); NB8 скиллы membrana-ship и membrana-tooling-doctor. Строить нечего. ВАЖНО: карточка два дня подряд (05.08, 06.08) выбиралась магистралью дня, и оба дня магистраль не двигалась — двигать было нечего. Намерение тех выборов (что зубит ночной прогон, кто судья зелёного, где живёт журнал) относится к СОСЕДНЕЙ живой карточке night-build-format-v2, а не к этому эпику.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
