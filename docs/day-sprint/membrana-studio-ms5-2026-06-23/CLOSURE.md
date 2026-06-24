# MS5 closure — membrana-studio-ms5-prod-smoke (2026-06-23)

| Поле | Значение |
|------|----------|
| **Task id** | `membrana-studio-ms5-prod-smoke` |
| **Epic** | `membrana-studio-desktop` (#93) |
| **Verdict** | **partial** — automated smoke OK; MP7 WS timeout blocks epic LGTM |

## Automated (`yarn studio:ms5-smoke --no-mp7`)

| Check | Result |
|-------|--------|
| `studio-main-js` | OK |
| `client-dist-index` | OK |
| `prod-cabinet-url-baked` | OK (`https://cabinet.membrana.space`) |
| `nsis-installer` | OK (`Membrana Studio Setup 0.1.0.exe`) |
| `cabinet-health` | OK |

Prod rebuild: `MEMBRANA_STUDIO_PROD=1 yarn studio:build`.

## MP7 prod (`yarn cabinet:mp7:prod`)

| Step | Result |
|------|--------|
| MP1–MP5 regression | OK (`health OK`) |
| WebSocket `journal.append` / `analysis.brief` | **FAIL** — `msg timeout` (2× retry) |

## Deliverables shipped

- `scripts/lib/studio-ms5-prod-smoke.mjs` + `yarn studio:ms5-smoke`
- MS5 runbook in `apps/membrana-studio/README.md`

## Manual operator (not run in this session)

1. Install `release/Membrana Studio Setup 0.1.0.exe`
2. StorageRuntimeIndicator → **Electron FS**
3. Connector pairing + Microphone live on Windows
4. Verify `%APPDATA%/Membrana/journal/` after capture

## Epic blocker

Epic `membrana-studio-desktop` **stays active** until MP7 WS smoke passes (DoD § paired + journal brief).

**Follow-up:** investigate prod realtime gateway / `journal.append` relay (same script as browser paired smoke).
