# Membrana Local Sprint OPEN: trace-freeze-dual-candidate-sprint

| Field | Value |
|-------|-------|
| Sprint | `trace-freeze-dual-candidate-sprint` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `trace-freeze-dual-candidate-sprint` (L, #2476) |
| Phase A | `trace-freeze-a-cut` |
| Cut plan | [`trace-freeze-dual-candidate-sprint.json`](../../sprint/cut/trace-freeze-dual-candidate-sprint.json) |
| Cut trail | [`trace-freeze-dual-candidate-sprint.jsonl`](../../sprint/cut/trail/trace-freeze-dual-candidate-sprint.jsonl) |
| Lead | vesnin |
| Support | dynin · ozhegov · angelina |
| Status | execution complete; delivery in progress |

## Why

Issue #2476 still describes visible freezes around stopping recording / exiting the board.
The first trace teardown probe measured only renderer-side teardown and showed 2.1-3.6 ms
at 10 000 trace lines on the owner's machine. That value excludes the freeze hypothesis
for that narrow measured segment: it is not a human-visible freeze.

The 27.09 owner comment names the unmeasured path: `ipcRenderer.sendSync` in
`apps/membrana-studio/src/preload.ts`, reached through `persistScenarioTraceToDisk()`.
It blocks the renderer until the main-process event queue handles the message; media
ingest and node polling may keep that queue busy.

The 28.09 #2505 evidence adds a strong second candidate: the Studio sample library used
to render 1057 samples at once, producing 23 265 DOM nodes and hundreds of milliseconds
to seconds of synchronous work in jsdom, versus 891 nodes for a page of 40. Therefore this
sprint must distinguish two candidates, not replace one premature conclusion with another.

## Current Uncommitted Tail

The worktree already contains unfinished work from the previous session:

- `scripts/scenario-trace-buffer-parity.test.mjs` imports the real
  `scenarioTraceBuffer.ts` under Node >= 22 and checks behavior parity.
- `scripts/scenario-trace-teardown-measure.test.mjs` was split into the portable Node 20
  source/tooth half.
- `scripts/lib/scenario-trace-teardown-measure.mjs` gained `PROBE_CARRYING_EXPRESSIONS`
  and source/export readers.
- `.github/workflows/unit-tests.yml`, `tests/test-scripts.catalog.json`, and ADR links
  were adjusted for the Node 20/Node 22 split.
- The unrelated generated `docs/network/*` snapshot from 28.09 was removed from this diff
  before execution evidence was committed.

These files are not execution yet for this sprint; they are evidence to sort in block D
after ratification.

## Registered Phases

| Phase | Card | Owner | Scope |
|-------|------|-------|-------|
| A | `trace-freeze-a-cut` | vesnin | Register, cut, write predictions, run cut check, return to owner. Stop here. |
| B | `trace-freeze-b-live-sendsync` | dynin | Live Studio measurement around `sendSync` on stop and board exit under diagnostic flag. |
| C | `trace-freeze-c-library-render` | ozhegov | Account for #2505: render-cost candidate, after-pagination status, and the nearby sequential `listSamples` path. |
| D | `trace-freeze-d-probe-truth-tooth` | vesnin | Make the probe stop judging an unchecked copy; finish or revise the current parity-tooth work. |
| E | `trace-freeze-e-adr-gate-pr` | angelina | Rewrite ADR conclusion, run sprint gate/experience, ship PR with `--no-merge`, publish review gate. |

## Predictions Before Execution

### A. Cut And Contract

Gives: a registered sprint family, a cut plan, and an explicit stop before implementation.

Checked by: `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/trace-freeze-dual-candidate-sprint.json`.

Falsified by: missing registry cards, missing `OPEN.md`, absent cut-act trail, a cut plan that cannot name both candidates, or any code/runtime change before owner ratification.

### B. Live `sendSync` Measurement

Gives: a number from the real Studio renderer around `ipcRenderer.sendSync`, not the synthetic Electron probe. The measurement must cover stop recording and board exit with a full trace buffer.

Checked by: shell-log lines from `MEMBRANA_TRACE_FLUSH_TIMING=1` or an equivalent diagnostic flag, with elapsed ms/chars/runId and a clear threshold for frame loss.

Falsified by: only rerunning `scripts/measure-scenario-trace-teardown.mjs`, only using the synthetic Electron probe, or producing no live number from Studio. If live `sendSync` stays under one frame while the freeze remains, this candidate is weakened.

Live finding before re-cut (29.09): the real Studio main process wrote a 10 000-line,
1 418 890-byte trace as `live-stop-0`, but the renderer did not return from
`ipcRenderer.sendSync` afterwards. The IPC listener completes the file write without assigning
`event.returnValue`, so the synchronous request has no reply. This confirms the freeze mechanism
but expands block B by one existing file, `apps/membrana-studio/src/logging/register-ipc.ts`.
The plan is re-cut to permit an explicit empty reply and must be ratified again before that line
is changed.

### C. Library Render Candidate

Gives: a separate verdict for the #2505 candidate: whether the large synchronous DOM build explains the observed freezes, whether pagination already removed it, and whether sequential `ServerStorageBackend.listSamples()` remains a nearby loading cost rather than render cost.

Checked by: the #2505 render-cost tooth/evidence and a live before/after or current-state observation for the exact user actions: stop recording and exit board. Code addresses include `apps/client/src/modules/SampleLibraryModule.tsx`, `packages/services/media-library/src/media-library-service.ts`, and `packages/services/media-library/src/backends/server-storage-backend.ts`.

Falsified by: treating the jsdom render number as proof for stop/exit without measuring that path; ignoring that this worktree may not yet contain #2505; starting the server-storage pagination/loading redesign without owner ratification.

Observed before re-cut (29.09): this branch still renders `filteredSamples.map(...)` in full.
Commit `794930f6` on `origin/main` / #2505 replaces it with a 40-row page and carries the
deterministic 23 265 versus 891 DOM-node tooth. Therefore full-list rendering was a strong second
candidate in the old build and is already removed independently in the current mainline. The
sequential all-pages `ServerStorageBackend.listSamples()` path remains a loading concern, not
evidence for the stop/exit freeze, and is not changed here.

### D. Probe Truth Tooth

Gives: the teardown probe either imports the real product module where possible or carries an explicit tooth that detects drift between the copied probe and `scenarioTraceBuffer.ts`.

Checked by: `node --test scripts/scenario-trace-teardown-measure.test.mjs` for the portable tooth and `node --experimental-strip-types --test scripts/scenario-trace-buffer-parity.test.mjs` where Node >= 22 is available.

Falsified by: the probe measuring a copied implementation with no drift guard, a test that cannot run in its declared CI lane, or the current uncommitted split hiding a skipped behavioral tooth.

### E. ADR, Gate, And PR

Gives: ADR-0030 says "excluded" when a hypothesis is excluded, "candidate" when it is only named, and distinguishes `sendSync`, library render, and nearby sequential loading. The sprint closes with a non-merged PR and published review gate.

Checked by: `sprint:gate`, `sprint:experience`, `yarn pr:ship --no-merge ...`, `yarn code-review:pr <N>`, and `node scripts/review-gate.mjs --pr <N> --publish` in a dependency-ready tree.

Falsified by: leaving the ADR with a single-candidate conclusion, starting the R2 evidence-sink redesign without consilium, merging the PR, leaving it draft, or skipping `review-gate --publish`.

## Execution Boundaries

- Phase A stops after returning this cut for owner ratification.
- No `yarn install` in `C:\Users\user190825\practice\Membrana\.worktrees\trace-run-2476-rethink`.
- No product-code fix before ratification.
- R2, "move full evidence out of renderer", is out of scope until consilium.
- Work may continue in this tree with Node/static checks; dependency-heavy checks may move to `Membrana-installstate` only after the current uncommitted tail is sorted and committed or deliberately transferred.

## Acceptance For Owner Ratification

- Owner agrees that the sprint should test both `sendSync` and library render as candidates.
- Owner agrees that phase B may add/run diagnostic timing around `sendSync` under a flag.
- Owner agrees that phase C may use #2505 evidence but must not start `ServerStorageBackend` redesign.
- Owner agrees that phase D may finish the probe-tooth split already present in the worktree.

## Prediction To Outcome

| Block | Forecast outcome | Observed outcome |
|-------|------------------|------------------|
| A | A stable five-block contract naming both candidates. | Hit, followed by two honest re-cuts: live execution exposed `register-ipc.ts` as the missing write zone, then the tests-master manifest pin became explicit. All three cuts were owner-ratified. |
| B | A live number around real Studio `sendSync`; under one frame weakens it, multi-frame strengthens it. | Stronger than forecast: before the fix the call never returned although main had written the file. After `event.returnValue = null`, 20 full-buffer samples were 20.5-34.2 ms (all over one frame). |
| C | Separate verdict for #2505 render cost and sequential loading. | Hit: this branch renders all rows; mainline #2505 pages 40 rows (23 265 -> 891 DOM nodes). Sequential `listSamples` remains loading debt and was not changed. |
| D | Portable source tooth plus behavioral import of the true module. | Hit: Node tests pass 7/7 and 5/5; CI/catalog split names the Node 20/22 boundary. |
| E | ADR distinguishes exclusion, candidate, and proof; gate and non-merged reviewed PR. | ADR complete; gate 5/5 `honest_pair`, experience recorded; PR and published review remain the delivery tail. |
