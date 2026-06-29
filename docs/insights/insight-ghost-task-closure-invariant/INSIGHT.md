# Ghost task closure invariant

## Observation

`task:archive` closes one registry entry, while an umbrella GitHub Issue can be closed after
one epic or sibling task completes. Active siblings then look like completed work even when
their prompts are unfinished. Shared `githubIssue` is therefore not closure evidence.

## Candidate invariant

Before closing an Issue, enumerate all active registry entries that reference it. The close
operation must either prove each child complete, explicitly cancel/supersede it, or refuse
the Issue transition. A periodic `registry:audit --ghosts` can report drift but must never
bulk-archive candidates.

## Evidence

The 2026-06-29 ghost closure sprint inspected 38 candidates across five already-closed
issues. Only 19 were safely archivable; the other 19 required a decision or further work.

## Scope decision

Observation only. Hook/audit implementation is intentionally deferred to a separate task.
