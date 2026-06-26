---
name: membrana-client-logs-parsing
description: >-
  Parses Membrana client device-board console logs (logs_parsing workflow) via
  yarn logs:parse. Use when user updates logs, says «читай лог», «обновил логи»,
  smoke P5 sign-off, reports vs tracks timing, or runId/gate-true analysis.
  Do NOT grep gitignored logs manually — run the script first.
---

# Membrana client logs parsing (`logs_parsing`)

## Canon

[`docs/device-board-scripts/CLIENT_LOGS_PARSING.md`](../../docs/device-board-scripts/CLIENT_LOGS_PARSING.md)  
Desktop hosts (Studio/Device): [`docs/DESKTOP_APP_LOGGING_POLICY.md`](../../docs/DESKTOP_APP_LOGGING_POLICY.md)  
Chain markers: [`docs/device-board-scripts/SCENARIO_CHAIN_LOG_COOKBOOK.md`](../../docs/device-board-scripts/SCENARIO_CHAIN_LOG_COOKBOOK.md)

## Entry

```bash
yarn logs:parse
yarn logs:parse -- --run-id <8-char-id> --json
yarn logs:parse -- --list-runs
```

Default file (first existing): `logs/apps/client/logs.txt` → `logs/apps/client/console-logs.txt`.

## Workflow (agent)

1. **Read canon** — skim `CLIENT_LOGS_PARSING.md` § process (5 steps).
2. **Run parser** — `yarn logs:parse` (add `--run-id` if user named one).
3. **Do not** hand-roll `node -e` / PowerShell `Select-String` on gitignored logs; parser lives in `scripts/lib/client-logs-parser.mjs`.
4. **Interpret** using report fields:
   - P0.3 → `onStart fn-1 bootstrap`
   - P5 gate → `gate-true` ticks, `publish-done`, `upload-ok` (async lag OK)
   - reports > tracks → expected until P7; cite `drone-skip: track-not-in-journal`
5. **Optional** — update sprint `OPEN.md` smoke reference with `runId` + gate ticks from JSON.

## Output to user

- `runId`, gate-true tick list, publish vs upload counts
- PASS/WARN on operator smoke lines
- One paragraph on reports-vs-tracks if asked
- Cabinet `live-records 500` as separate anomaly (not media)

## Tests

```bash
node --test scripts/client-logs-parser.test.mjs
```

## Package scope

`scripts/parse-client-logs.mjs`, `scripts/lib/client-logs-parser.mjs` — not `@membrana/device-board` runtime.
