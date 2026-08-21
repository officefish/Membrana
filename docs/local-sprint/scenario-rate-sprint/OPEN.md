# Membrana Local Sprint OPEN: scenario-rate-sprint

| Field | Value |
|-------|-------|
| Sprint | `scenario-rate-sprint` |
| Procedure | `membrana-local-sprint` |
| Registry card | `scenario-rate-sprint` (M, #2001) |
| Prompt | [`SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md`](../../prompts/SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md) |
| Cut plan | [`scenario-rate-sprint.json`](../../sprint/cut/scenario-rate-sprint.json) |
| Cutter context | Vesnin, [`cut-scenario-rate-sprint-vesnin.md`](../../discussions/cut-scenario-rate-sprint-vesnin.md) |
| Lead | vesnin |
| Support | dynin · kuryokhin · ozhegov · angelina |
| Status | closed · gate pass |

## Why

The board scenario produced tracks at both 48 kHz and 44.1 kHz in one session.
The current MFCC gate refuses 44.1 kHz honestly, so part of an hour-long session
can become non-judgeable while the set still looks like one comparable corpus.

## First-Block Cause

The scenario capture path uses WebAudio `AudioContext.sampleRate` and stores the
measured rate:

- `ScenarioMicJournalBridge.captureAudioSample` stores `frame.sampleRate`.
- `LiveSampler.startLoop` emits `audioContext.sampleRate`.
- `AudioIngestService.parseUpload` persists metadata `sampleRate`.

Therefore the same scenario can produce 44.1 or 48 kHz when browser/OS/device
audio mode differs between tracks. Media does not cause the drift; it preserves it.

## Chosen Boundary For Ratification

Do not resample in this urgent sprint and do not widen MFCC acceptance to 44.1.
Implement the tooth: heterogeneous sample rate inside one session/candidate set
must be named explicitly and block/report non-judgeability instead of being mixed
silently.

## Blocks

| Block | Persona | Zone | Estimate | Status |
|-------|---------|------|---------:|--------|
| b1 cause address | vesnin | cutter context + OPEN/cut | 80 | done · signed |
| b2 session rate tooth | dynin | `packages/plugin-handlers/src/mfcc/session-sample-rate.*` | 180 | done · signed |
| b3 wire judgeable path | kuryokhin | `packages/plugin-handlers/src/mfcc/executor.ts` + focused tests | 220 | done · signed |
| b4 gate trail | angelina | sprint trace, checks, closure, #2001 residual | 100 | done · gate pass |

## Acceptance

- Cause is named with code addresses.
- Heterogeneous sample rates in one session set are detected and named.
- Measured sampleRate is not rewritten by hand.
- #1950 declared-vs-measured behavior is preserved.
- No production deploy.
