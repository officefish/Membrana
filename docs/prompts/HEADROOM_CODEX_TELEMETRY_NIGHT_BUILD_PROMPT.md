# TASK PROMPT — Headroom × Codex first-class telemetry night build

> Night Build epic under `docs/NIGHT_SPRINT_REGULATION.md`.
> Registry id: `headroom-codex-telemetry-night-build`.
> GitHub: #187 (Headroom proxy-perf live measurement), related epic #186.
> Date: 2026-06-29.
> Size: M.

## Context

Headroom already produced proxy measurements for a Claude Code path, but Codex work is not yet
represented as a first-class measured client. This creates a blind spot: daily/evening summaries can
report Headroom savings for Claude Code while Codex performs sprint, PR, CI, and closure-review work
outside the measured telemetry loop.

Recent evidence:

| Artifact | Role |
|---|---|
| GitHub #187 | open proxy-perf measurement task |
| GitHub #186 | closed agent-context optimization epic; Headroom/RAG context |
| `docs/insights/insight-headroom-server-deploy/proxy-perf-report.json` | synthetic baseline; real client measurement pending |
| `scripts/_anthropic-env.mjs` | shared `.env` resolver; `MEMBRANA_ENV_PATH` + upward discovery |
| `AGENTS.md` | agent-facing instructions that must keep future Codex work discoverable |

## Night Build — full prompt

You are the Membrana night-build coordinator. Implement the smallest safe Headroom × Codex
telemetry integration that makes Codex observable as a distinct Headroom client/runtime without
making Headroom a hard dependency for Codex work.

Freeze scope to NB0–NB3. Do not perform production deploys, prod smokes, arbitrary proxy live
sessions, or GitHub issue closure during the night. Prefer local deterministic tests and static
telemetry fixtures over external service calls.

## NB0 — Baseline and contract

Lead: Vesnin. Support: Dynin.

- Locate existing Headroom artifacts, proxy-perf report, and related #187 acceptance criteria.
- Document the current blind spot: Claude Code measured, Codex not measured or not labeled.
- Define the telemetry contract for agent clients.
- Add/adjust docs so future agents know Headroom telemetry is per-client and not global.

DoD:

- Contract documents `client` / `agent_runtime` semantics.
- Report language distinguishes measured Headroom traffic from operational agent work.
- Checkpoint NB0 pass.

## NB1 — Codex telemetry event model

Lead: Dynin. Support: Ozhegov.

- Add a small repo-local telemetry helper or schema for agent Headroom events.
- Required fields:
  - `client`: `codex | claude-code | cursor | opencode | unknown`
  - `workflow`
  - `phase`
  - `transform`
  - `durationMs`
  - `cacheHit`
  - optional token/savings fields
- Add redaction/safety guardrails: no `.env`, no API keys, no raw secrets in telemetry.

DoD:

- Unit tests cover Codex-labeled events and redaction.
- Existing Headroom/Claude Code report fixtures remain readable.

## NB2 — Report grouping by client

Lead: Ozhegov. Support: Dynin.

- Add a deterministic report/summary path that groups Headroom telemetry by client/runtime.
- It must represent unknown legacy events without pretending they belong to Codex.
- Add or update a fixture showing:
  - Claude Code measured traffic.
  - Codex measured traffic.
  - operational work that is not measured by Headroom.

DoD:

- `client=codex` appears in generated metrics/summary.
- Legacy reports without client labels remain accepted as `unknown`.
- Tests verify per-client aggregation.

## NB3 — Ritual integration and handoff

Lead: Vesnin. Support: Musician (operator pragmatics).

- Wire the summary into the lowest-risk ritual/documentation surface:
  - preferred: docs or script output helper;
  - avoid changing critical evening/day ritual behavior unless deterministic and non-blocking.
- Add AGENTS/skill-level guidance for future Codex runs:
  - when Headroom telemetry is expected;
  - how to label Codex;
  - how to report unmeasured work honestly.
- Close the night with handoff and explicit morning merge/review notes.

DoD:

- Scoped tests pass.
- No external proxy/live LLM dependency is required for CI.
- `yarn night:close --id headroom-codex-telemetry-night-build` produces handoff.

## Acceptance criteria

- [ ] Codex can be represented as a first-class Headroom telemetry client.
- [ ] Headroom summaries group metrics by `client`.
- [ ] Legacy/unknown Headroom events are not misattributed to Codex.
- [ ] Documentation prevents future daily summaries from treating Claude Code metrics as all-agent metrics.
- [ ] Missing Headroom proxy does not block Codex workflows.
- [ ] Telemetry redacts secrets and `.env`-like values.
- [ ] Local tests cover the telemetry model and report grouping.

## Out of scope

- Running a real external Headroom proxy session tonight.
- Closing #187.
- Production deploy or prod smoke.
- Routing all Codex shell/tool execution through Headroom.
- Reworking OpenCode/Claude Code provider configs.
- Fixing unrelated PR #202 CI unless it directly blocks this night branch.

## Stop rules

- Two consecutive scoped CI failures: stop, checkpoint fail, close with blocker handoff.
- Any possible secret leakage in telemetry/cache: stop and fix redaction before continuing.
- If Headroom source code is absent from the repo, implement only repo-local telemetry contract,
  fixtures, and docs; do not invent an external package integration.
