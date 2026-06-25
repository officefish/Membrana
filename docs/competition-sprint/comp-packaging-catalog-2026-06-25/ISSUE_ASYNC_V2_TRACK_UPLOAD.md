## Context

**Sprint:** `comp-packaging-catalog-2026-06-25` · Phase C operator smoke  
**Task registry:** `async-v2-track-upload-178`  
**Prompt:** [`docs/prompts/ASYNC_V2_TRACK_UPLOAD_PROMPT.md`](../../prompts/ASYNC_V2_TRACK_UPLOAD_PROMPT.md)  
**UserCase:** `usercase-mvp-microphone-alpha-async-v2`  
**Pack wiring (L16):** fixed in `@membrana/device-board` — gate → sequence → observation/trends works.

**GitHub:** [#178](https://github.com/officefish/Membrana/issues/178)

**Smoke run `043ec8d6`** (logs: `logs/apps/client/logs.txt`, parse: `yarn logs:parse`):

| Metric | Value |
|--------|-------|
| gate-true | 3 (ticks 44, 91, 139) |
| publish-done / trends | 3/3 ✅ |
| upload-ok | **0** ❌ |
| async-jobs | start=3, resolved=0, **rejected=3** |
| detached drone report | 0 (blocked — needs async resolve) |
| operator smoke (no upload) | **PASS** |
| v2.0-async happy path | **FAIL** |

Runtime alive; gate loop + FFT trends publish OK. All three `StartAsyncJob` (`track-upload`) paths end with `[media] upload-failed` + `[async-job] rejected` (ticks 59, 100, 156).

## Problem

After `make-track` + `start-async-job-v20`, `scenarioMicJournalBridge` calls `getDefaultMediaLibraryService().importBlob()` (`BUFFER_COLLECTION_ID`, class `buffer`). Upload never reaches `upload-ok`; async job rejects → `fn-alpha-async-detached-report` never fires (`make-report-from-track` / detached publish).

**Not a pack/graph issue** — investigate client ↔ `background-media` (or local fallback) upload path **and server resources/quota** on limited VPS.

## Repro

1. Apply rebuilt `usercase-mvp-microphone-alpha-async-v2` (hard refresh).
2. Run scenario ≥60 s with mic linked to server/journal.
3. Paste console → `logs/apps/client/logs.txt`.
4. `yarn logs:parse` — expect `upload-ok ≥ gate-true`, `async-jobs resolved ≥ 1`, `detached > 0`.

### Server diag (phase 1b — обязательно)

```bash
yarn media:db:up && yarn media:migrate && yarn media:dev   # local baseline
yarn media:diag --register
yarn media:diag --device-id <paired-device-id> --base-url https://media.membrana.space --token <mediaToken>
```

Runbook: [`docs/deploy/MEDIA_SERVER_DIAGNOSTICS.md`](../../deploy/MEDIA_SERVER_DIAGNOSTICS.md)

## Investigation hints

- Expand DevTools object on `[media] upload-failed` — fields `error`, `code` (DomainError).
- Check `storageMode` / `serverReachable` in `upload-start` log line.
- Code: `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` (`uploadTrackAsync` ~L825).
- Media server: `packages/background-media`, `yarn media:dev` (3010). See `docs/BACKGROUND_SERVERS.md`.
- VPS: `df -h`, `docker stats`, `yarn media:docker:logs` (логи в `%TEMP%`).
- Prior run `887b7c6c` had 1 `upload-ok` then dispatch-error (fixed); current run all uploads fail — may be env/regression/quota.

## Acceptance criteria

- [ ] `upload-ok` count matches `gate-true` within session (or documented async lag in parser).
- [ ] `async-job resolved` ≥ 1; no `async-resolved-dispatch-error`.
- [ ] `make-report-from-track` + detached publish path runs (or explicit product decision documented).
- [ ] `yarn logs:parse` → `v20 happy path: PASS` on ≥60 s smoke.
- [ ] **Server diag** documented in ODF-av2-alpha-004 (`yarn media:diag` verdict + quota).
- [ ] `yarn media:diag` green on target environment.
- [ ] Unit/integration test if root cause is code bug (not env-only).

## Out of scope

- Further `usercase-competition-pack.ts` gate/sequence wiring (L16 closed).
- Beta/Gamma async-v2 rebuild (alpha smoke unblocks sprint).
- Full observability stack (Prometheus/Grafana).

## Return to parent chat

Post: issue/PR link, `upload-failed` `error` + `code`, `yarn logs:parse` summary for new runId, `yarn media:diag` verdict, whether `background-media` was required.
