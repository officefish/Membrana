# Day Sprint — Closure: Device-board server-first (2026-06-26)

| Поле | Значение |
|------|----------|
| **sprintId** | `db-server-first-2026-06-26` |
| **Registry epic** | `device-board-server-first` |
| **closed** | 2026-06-26 (code) · prod-gate pending |
| **outcome** | **Code complete** — SF0–SF9 все ✅; prod smoke + deploy не выполнен (pending operator) |

---

## Acceptance criteria

| # | Критерий | Статус |
|---|----------|--------|
| SF0 | Консилиум + `DEVICE_BOARD_SERVER_FIRST.md` v1.0 | ✅ |
| SF1 | core: board + runtime extensions | ✅ |
| SF2 | Gateway channel `board` | ✅ |
| SF3 | REST lease + DeviceBoardPage | ✅ |
| SF4 | Client follower mode | ✅ |
| SF5 | Nodes UI controls (flags) | ✅ |
| SF6 | Nodes runtime enforcement | ✅ |
| SF7 | Last-track preview | ✅ |
| SF8 | Tests + smoke | ✅ |
| SF9 | Docs sync CONCEPT/catalog/ARCHITECTURE | ✅ |
| Prod | Smoke E2E на проде + cabinet deploy | ⏳ prod-gate pending |

---

## Gate

Код принят (LGTM SF0–SF9). Prod deploy и E2E-smoke отложены до следующего окна деплоя cabinet.
Следующий шаг: `docs/day-sprint/db-server-first-2026-06-26/DEPLOY.md` → `yarn deploy:cabinet` → smoke.
