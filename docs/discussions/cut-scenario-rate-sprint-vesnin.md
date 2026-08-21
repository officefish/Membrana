# cut-scenario-rate-sprint — Vesnin cutter context

Date: 2026-08-21
Sprint: `scenario-rate-sprint`
Issue: #2001
Source prompt: `docs/prompts/SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md`

## Input Freshness Note

The owner pointed to the prompt as "in trunk with PR #2036". Local verification found
PR #2036 open and `origin/main` without this file. I fetched `origin/pr/2036` and
copied only the prompt into this sprint branch, keeping the work branch based on
`origin/main`.

## Cause Probe

Finding: the scenario does not declare or force capture sample rate. It samples the
active `MediaStream` through WebAudio and persists the measured rate.

Code addresses:

- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts:1559`
  `ScenarioMicJournalBridge.captureAudioSample` builds `AudioSamplePayload` with
  `sampleRate: frame.sampleRate`.
- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts:1729`
  `ensureStreamCaptureSampler` starts `new LiveSampler(...)` without a target rate.
- `packages/services/audio-engine/src/core/live-sampler.ts:136`
  `LiveSampler.start` calls `createAudioContext()` and connects the stream.
- `packages/services/audio-engine/src/core/live-sampler.ts:201`
  `LiveSampler.startLoop` reads `const sampleRate = this.audioContext.sampleRate`
  once and emits it in each `AudioSampleFrame`.
- `packages/background-media/src/audio/audio-ingest.service.ts:40`
  `AudioIngestService.parseUpload` reads file metadata and returns
  `sampleRate: Math.round(sampleRate)`; media does not normalize.

Conclusion: 44.1 vs 48 kHz is inherited from browser/OS/device AudioContext mode,
then preserved by media ingest. A same named scenario can therefore produce both
rates if the active input device or driver mode changes between tracks, or if the
browser chooses a different context rate for the stream.

## Decision

For this urgent sprint, do not resample in the capture path and do not relax MFCC
gates to 44.1. Instead, add a tooth that prevents silent mixing inside one session
set:

- ingest/store path keeps measured sampleRate untouched;
- session/report selection detects heterogeneous `sampleRate` across candidate
  tracks and names it explicitly;
- 44.1 remains non-judgeable for the current MFCC gate unless a later, separate
  sprint adds comparable 44.1 analysis or an explicit resampling contract.

Why this choice:

- resampling in the browser before the hour is higher blast radius and risks
  changing the captured corpus without an analysis contract;
- accepting 44.1 in MFCC is a detector/math decision, not a capture hotfix;
- naming heterogeneity blocks the real failure class now: "one session looks
  judgeable while silently mixing rates".

## Cut

1. `b1-cause-address` — Vesnin: write the cause with code addresses and ratify the
   solution boundary.
2. `b2-session-rate-tooth` — Dynin: implement a pure guard/report helper beside
   the MFCC handler that summarizes sample rates and fails/names heterogeneous
   candidate sets.
3. `b3-wire-judgeable-path` — Kuryokhin: wire the helper into
   `packages/plugin-handlers/src/mfcc/executor.ts`, the nearest non-magistral
   judged path already refusing 44.1 kHz, preserving measured sampleRate and
   #1950 semantics.
4. `b4-gate-trail` — Angelina: tests, sprint gate, experience, #2001 closure or
   explicit residual.

## Signed Voices

Vesnin: the first block has enough address-level evidence; the fix must be a named
gate, not a hidden conversion.

Dynin: pure helper first, so the tooth can be tested without production data or
browser audio.

Kuryokhin: no silent resampling before a field hour; if comparison needs 44.1 later,
it deserves a separate math contract.

Angelina: prompt freshness gap is named; ratification must happen in chat before
any code edits beyond procedural artifacts.
