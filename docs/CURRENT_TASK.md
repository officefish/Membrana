# CURRENT_TASK

> **Активный спринт:** `async-v2-track-upload-178` · GitHub [#178](https://github.com/officefish/Membrana/issues/178)  
> **Parent:** `comp-packaging-catalog-2026-06-25` Phase C (Alpha blocked)  
> **Prompt:** [`docs/prompts/ASYNC_V2_TRACK_UPLOAD_PROMPT.md`](./prompts/ASYNC_V2_TRACK_UPLOAD_PROMPT.md)

## Фокус

Fix `StartAsyncJob(track-upload)` → `importBlob` → `upload-failed` (×3); разблокировать `make-report-from-track` / detached publish.

**Не трогать:** L16 pack wiring (`usercase-competition-pack.ts`).

## Фазы

| Phase | Статус | Действие |
|-------|--------|----------|
| 1a Client | ✅ | `whenMediaLibraryConfigured`, `ensureReservedCollections`, upload-failed `code` |
| 1b Server | ✅ | VPS diag + hotfix deploy; ensure-reserved ~0.1s — [`MEDIA_SERVER_DIAGNOSTICS.md`](./deploy/MEDIA_SERVER_DIAGNOSTICS.md) |
| 2 Fix | ✅ | client + `@membrana/background-media` (prod hotfix 2026-06-25) |
| 3 Sign-off | ⏳ | Browser re-smoke Alpha ≥60s → `yarn logs:parse` → `v20 happy path: PASS` |

## Команды

```bash
yarn media:prod:diag                    # VPS (SSH)
yarn media:prod:upload-smoke            # prod upload path
yarn workspace @membrana/client dev
# Apply alpha-async-v2 → Run ≥60s → logs → yarn logs:parse
```

## DoD

`v20 happy path: PASS` · `upload-ok ≥ gate-true` · `yarn media:diag` green · ODF-av2-alpha-004 resolved.
