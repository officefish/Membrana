# Headroom agent telemetry summary

Deterministic fixture output for `agent-telemetry-sample.json`; this is not a live proxy measurement.

| Client | Requests | Cache hit % | Savings % | Avg duration ms | Top transforms |
|---|---:|---:|---:|---:|---|
| claude-code | 2 | 50 | 16.4 | 131.5 | FileSystemSync (1), TokenCounter (1) |
| codex | 2 | 50 | 18 | 21 | PromptTemplateApply (1), TaskClosureContext (1) |

## Operational work not measured by Headroom

- codex: Issue #178 reconciliation, PR/CI/merge actions were operational work and not part of this Headroom telemetry fixture.
