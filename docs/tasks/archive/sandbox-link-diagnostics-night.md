# Архив: Night Build: диагностика связи узел↔cabinet из песочницы (NB0 пробник, NB1 видимый deviceId, NB2 флап вкладки Узлы)

| Поле | Значение |
|------|----------|
| **ID** | `sandbox-link-diagnostics-night` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-06 |
| **Архивирована** | 2026-07-07 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SANDBOX_LINK_DIAGNOSTICS_NIGHT_BUILD_EPIC_PROMPT.md`](../../docs/prompts/SANDBOX_LINK_DIAGNOSTICS_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

Night build HANDOFF 2026-07-06 (`docs/archive/night-build/2026-07-06/HANDOFF.md`); NB0–NB2 pass, main merged 2026-07-07 squash (#270, `0f828da1`). Корень флапа «установлена↔переподключение»: кабинетная WS без исходящего трафика падала по idle-таймауту прокси — фикс keepalive 45с.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
