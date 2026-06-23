# Архив: Day sprint: Server Tariff Enforcement v1 (workspace quota)

| Поле | Значение |
|------|----------|
| **ID** | `server-tariff-enforcement-v1` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-23 |
| **Архивирована** | 2026-06-23 |
| **GitHub Issue** | #150 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SERVER_TARIFF_DAY_SPRINT_PROMPT.md`](../../docs/prompts/SERVER_TARIFF_DAY_SPRINT_PROMPT.md) |

## Отчёт о выполнении

**Что сделано.** Day-sprint **Server Tariff Enforcement v1** (W5): серверная квота user workspace на media, синхронизация лимита из cabinet при pair, client UX для 403 `WORKSPACE_QUOTA_EXCEEDED`, исправлен блокер **400 Unsupported device-scenario version 2** (media принимает v1–v2). Prod deploy + smoke OK.

**Фазы.**

| Phase | id | Коммиты / итог |
|-------|-----|----------------|
| W1 | `ste-v1-w1-media-quota` | `c47f2c4` — `Device.maxUserWorkspaces`, PUT 403 |
| B0 | `ste-v1-b0-second-workspace` | `034950f`, `e67a427`, `8db252a` — cabinet sync, v2 assert, quota UX |
| W2/W3 | merged B0 | pair → media, `WorkspaceQuotaExceededError` |
| D1 | `ste-v1-d1-docs` | `020d749` — TARIFF_MATRIX v0.5, user-workspace.mdx, U10 deploy |
| S1 | `ste-v1-s1-prod-smoke` | deploy `020d749` + `cabinet-v0.2.0`, smoke 17/17 |

**Пакеты.** `@membrana/background-media`, `@membrana/background-cabinet`, `@membrana/client`.

**Prod.** `yarn cabinet:u10-workspace:prod` @ `020d749` (`cabinet-v0.2.0`). Smoke: `device-workspaces-put-v2`, `device-workspaces-put-v2-second`, `ste-quota-user-workspaces` — OK. Артефакт: `deploy-artifacts/u10-workspace-prod-2026-06-23T12-56-44-212Z.json`.

**Связь со стратегией.** W5 free tier: оператор может создать 2-й и 3-й user workspace на paired device; при исчерпании слотов — явное `used/max` в launcher.

**Out of scope (follow-up).** Billing/indie seeds, downgrade purge, client prod deploy pipeline.

**Ручная проверка.** Local client (`yarn workspace @membrana/client dev`) → launcher → 2-й сценарий на paired device.

## Заметки при закрытии

Day-sprint shipped W1+B0+D1+S1 prod; composeSha 020d749

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
