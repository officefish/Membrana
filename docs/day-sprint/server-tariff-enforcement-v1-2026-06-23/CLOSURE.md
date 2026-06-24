# Day sprint closure — server-tariff-enforcement-v1

| Поле | Значение |
|------|----------|
| **Epic id** | `server-tariff-enforcement-v1` |
| **Kind** | day-sprint |
| **Issue** | [#150](https://github.com/officefish/Membrana/issues/150) |
| **Opened** | 2026-06-23 |
| **Closed** | 2026-06-23 |
| **Verdict** | **shipped (prod)** |

## Phases

| Phase | Task id | Status | Deliverable |
|-------|---------|--------|-------------|
| W1 | `ste-v1-w1-media-quota` | **done** | `Device.maxUserWorkspaces`, PUT 403 `WORKSPACE_QUOTA_EXCEEDED` |
| B0 | `ste-v1-b0-second-workspace` | **done** | Cabinet sync, media v2 assert, client 403 + quota UX |
| W2 | `ste-v1-w2-cabinet-sync` | **done** (B0) | `maxUserWorkspaces` в membrane sync при pair |
| W3 | `ste-v1-w3-client-403` | **done** (B0) | `WorkspaceQuotaExceededError`, launcher refresh |
| D1 | `ste-v1-d1-docs` | **done** | TARIFF_MATRIX v0.5, user-workspace.mdx, U10 STE |
| S1 | `ste-v1-s1-prod-smoke` | **done** | Prod deploy + 17/17 smoke |

## Shipped highlights

- **Root cause fix:** media `device-scenario-assert` принимает v1–v2 (`e67a427`) — второй сценарий больше не падает с 400.
- **Quota chain:** cabinet `Tariff` → media `Device.maxUserWorkspaces` → client `resolveWorkspaceTariff` + list `userWorkspacesQuota`.
- **Prod:** `composeSha` `020d749`, image `cabinet-v0.2.0`, smoke OK 2026-06-23.

## Commits (main)

`c47f2c4` · `034950f` · `8db252a` · `e67a427` · `020d749`

## Deferred / follow-up

| Topic | Notes |
|-------|--------|
| Client prod deploy | Проверка launcher — local dev build |
| Billing / indie tariff | Out of scope STE v1 |
| Downgrade purge | Out of scope STE v1 |

## Prompt

[`SERVER_TARIFF_DAY_SPRINT_PROMPT.md`](../../prompts/SERVER_TARIFF_DAY_SPRINT_PROMPT.md) — **closed** (ретроспектива).
