# Headroom agent telemetry

Headroom metrics must be reported as measured traffic, not as a proxy for all agent work.

Current rule:

- `client=claude-code` means the event came from Claude Code traffic measured by Headroom.
- `client=codex` means the event came from a Codex workflow or Codex-triggered context/prompt transform.
- `client=cursor` and `client=opencode` are reserved for their respective agent runtimes.
- missing or legacy client labels are `unknown`; never attribute them to Codex by inference.

Minimum event shape:

```json
{
  "client": "codex",
  "workflow": "task-closure-review",
  "phase": "NB1",
  "transform": "PromptTemplateApply",
  "durationMs": 12,
  "cacheHit": true,
  "inputTokens": 1000,
  "outputTokens": 820,
  "tokensSaved": 180,
  "savingsPct": 18
}
```

Use:

```bash
node scripts/headroom-agent-report.mjs --input docs/insights/insight-headroom-server-deploy/proxy-perf-report.json
node scripts/headroom-agent-report.mjs --input path/to/agent-events.json --format json
```

The report groups metrics by client and can also list operational work that was not measured by
Headroom. Daily summaries should use that distinction explicitly:

```text
Headroom measured traffic:
  Claude Code: ...
  Codex: ...

Operational work not measured by Headroom:
  Codex: PR #..., tests, merge, closure review.
```

Safety:

- Do not send `.env`, API keys, tokens, passwords, or authorization headers into telemetry.
- The repo helper redacts obvious secret keys/values before summary.
- Missing Headroom proxy must not block Codex workflows.
