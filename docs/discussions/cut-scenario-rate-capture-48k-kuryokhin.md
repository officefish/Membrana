# Cut: scenario-rate-capture-48k

Date: 2026-08-21
Subject: Kuryokhin
Sprint: `scenario-rate-capture-48k`
Task card: `scenario-rate-sprint` / #2001 continuation
Reason: owner correction after PR #2038

## Owner Correction

PR #2038 named the cause and added the MFCC tooth for heterogeneous sample rates,
but the urgent blocker remains: the board scenario can still write 44.1 kHz in the
same hour. The session-level decision "do not fix capture rate in this sprint" was
not ratified by the owner.

Minimum accepted shape from the owner:

- The scenario fixes capture frequency explicitly, or
- The scenario refuses to write if capture cannot run at 48 kHz, with a named reason.

## Code Address

The capture rate is born in the Web Audio sampler:

- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts`
  creates `new LiveSampler(...)` without a target rate in
  `ensureStreamCaptureSampler`.
- `packages/services/audio-engine/src/core/live-sampler.ts` creates
  `createAudioContext()` without options and emits `audioContext.sampleRate` in
  `startLoop`.
- `packages/services/audio-engine/src/core/audio-context.ts` owns Web Audio
  construction, so the Web Audio guard keeps the direct `AudioContext` change
  inside `@membrana/audio-engine-service`.

## Proposed Cut

`a1-capture-48k-guard`, one implementation block.

Implementation price:

- Add optional target sample rate to `LiveCaptureConfig`.
- Let `createAudioContext` accept `{ sampleRate }` and pass it to
  `new AudioContext({ sampleRate })` when present.
- Let `LiveSampler.start` verify that the actual `audioContext.sampleRate`
  equals the requested rate. On mismatch it closes resources and throws a named
  `DomainError`.
- Make the scenario bridge request 48000 Hz for capture and log a named refusal
  if the sampler cannot start at that rate.
- Add focused unit coverage for the audio-engine construction path and run a
  narrow type/test gate.

Expected behavior:

- If the browser honors 48 kHz, today-scenario samples are homogeneous at 48 kHz.
- If the browser/OS/device only yields 44.1 kHz, the scenario refuses the capture
  instead of silently writing a non-judgeable track.

Rejected in this block:

- Resampling.
- Accepting 44.1 kHz in MFCC.
- Changing stored sample metadata by hand.
- Production deploy.
