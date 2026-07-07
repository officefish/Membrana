# Архив: Epic: Живость присутствия + view-only борд под захватом (PCB1–PCB6)

| Поле | Значение |
|------|----------|
| **ID** | `presence-capture-board` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-07-04 |
| **Архивирована** | 2026-07-05 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/PRESENCE_CAPTURE_BOARD_SPRINT_PROMPT.md`](../../docs/prompts/PRESENCE_CAPTURE_BOARD_SPRINT_PROMPT.md) |

## Заметки при закрытии

Спринт PCB1-PCB6 полностью закрыт 2026-07-05: PCB1/PCB3 (#248/#249, корневой фикс persistent-offline, подтверждён на проде 2026-07-04), PCB4 link-state (#250, T1), PCB6 health-ping (#251, T2), PCB2 auth-fail banner (#252, T1), PCB5 force-viewonly-board (#253, T1) — все closure-review LGTM. PCB-D2 (multi-node, Phase 3) отвязан в standalone deferred backlog. Хвосты: lastSeenAt на registerNode не пишется; P2 rate-limit на link-state.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
