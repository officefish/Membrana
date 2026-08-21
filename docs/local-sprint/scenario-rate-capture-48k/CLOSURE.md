# Membrana Local Sprint CLOSURE: scenario-rate-capture-48k

Status: gate pass, ready for PR.

## Delivered

- `LiveCaptureConfig` now accepts optional `sampleRate`.
- `createAudioContext` passes requested `sampleRate` into `new AudioContext(...)`.
- `LiveSampler.start` verifies actual `audioContext.sampleRate` before wiring the
  stream and fails closed with `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE` on mismatch.
- `ScenarioMicJournalBridge.ensureStreamCaptureSampler` requests 48000 Hz and logs
  `stream/sampler-refused` with the requested rate and reason before rethrowing.
- Focused test coverage asserts both constructor options and fail-closed mismatch.

## Decision

The urgent scenario path now either captures samples at 48 kHz or refuses to write
the sample. The block deliberately does not resample and does not make 44.1 kHz
judgeable in MFCC.

## Verification

- `sprint:cut`: PASS after owner ratification.
- `execution-gate`: PASS 1/1 honest pair.
- `sprint:experience`: `hit`, cut accuracy 1/1, overflow 0/1.
- Focused vitest: 3 tests passed.
- `audio-engine` typecheck: passed.
- Focused eslint: passed.
- `git diff --check`: passed before gate docs.

Named environment gap: broad client typecheck is locally blocked by
`node_modules/@membrana/audio-engine-service` pointing to the sibling
`Membrana-tooling` worktree. The current branch source contains the new config
field; CI/fresh workspace is the broad judge.

## #2001

This continuation removes the urgent capture blocker: a board scenario should not
silently write 44.1 kHz samples in the hour session. If a device/browser cannot
provide 48 kHz, the scenario fails closed and names the reason instead of creating
a non-judgeable sample.
