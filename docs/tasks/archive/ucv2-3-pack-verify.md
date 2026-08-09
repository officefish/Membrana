# Архив: UCV2-3: usercase:build + verify-pack + smoke

| Поле | Значение |
|------|----------|
| **ID** | `ucv2-3-pack-verify` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-06-23 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md`](../../docs/prompts/USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md) |

## Заметки при закрытии

Пак-тулинг живёт в main: yarn usercase:build / usercase:build-mvp-microphone (package.json), node scripts/usercase.mjs verify-pack <id> (layout+prerun) и smoke-секция «smoke v2.0-async» в yarn logs:parse (R11 PASS в DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md). Фаза поглощена device-board-async-pipeline-v1 (archived 2026-07-01).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
