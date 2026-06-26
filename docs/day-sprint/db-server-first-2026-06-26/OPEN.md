# OPEN: Device-board server-first (2026-06-26)

| Поле | Значение |
|------|----------|
| **Sprint** | `db-server-first-2026-06-26` |
| **Registry epic** | `device-board-server-first` |
| **Status** | **code complete** — SF0–SF9 ✅; prod smoke + deploy next |
| **Size** | L |
| **Blocks** | `db3h-s4-microphone-detectors` (остаётся closed/deferred) |

**Prompt:** [`DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md`](../prompts/DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md)  
**Канон:** [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md)  
**Консилиум:** [`device-board-server-first-2026-06-26.md`](../seanses/device-board-server-first-2026-06-26.md)

---

## Принцип

**Server-first:** кабинет приоритетен для edit lease и capture authority. Поле — follower (soft / strict).

---

## Phases

| Phase | Task id | Deliverable | Status |
|-------|---------|-------------|--------|
| SF0 | `db-sf-0-canon` | Консилиум + `DEVICE_BOARD_SERVER_FIRST.md` v1.0 | ✅ |
| SF1 | `db-sf-1-core-contracts` | core: board + runtime extensions | ✅ |
| SF2 | `db-sf-2-gateway-board` | Gateway channel `board` | ✅ |
| SF3 | `db-sf-3-cabinet-lease-api` | REST lease + DeviceBoardPage | ✅ |
| SF4 | `db-sf-4-client-follower` | Field follower enforcement | ✅ |
| SF5 | `db-sf-5-board-flags-ui` | `resolveServerFirstFlags` + badges | ✅ |
| SF6 | `db-sf-6-nodes-runtime` | Nodes: pause/stop/mode | ✅ |
| SF7 | `db-sf-7-last-track-preview` | ▶ последний трек на карточке | ✅ |
| SF8 | `db-sf-8-tests-smoke` | Tests + smoke runbook | ✅ |
| SF9 | `db-sf-9-docs-sync` | CONCEPT, catalog, ARCHITECTURE | ✅ |
| **Deploy** | — | [`DEPLOY.md`](./DEPLOY.md) — prod smoke + `cabinet:deploy:image:prod` | ⏳ next |

---

## Не в спринте

- `db3h-s4-microphone-detectors`
- Neural detector tier
- Strict monitoring window
- Studio DL-3 in-app diagnostics

---

## Команды (после SF1)

```bash
yarn turbo run lint typecheck test build --continue
# prod smoke (после деплоя): docs/device-board-scripts/DEVICE_BOARD_SERVER_FIRST_SMOKE.md
# deploy: docs/day-sprint/db-server-first-2026-06-26/DEPLOY.md
```
