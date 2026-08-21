# b1 — Vesnin Context: cause address

Sprint: `scenario-rate-sprint`
Block: `b1-cause-address`

Read:

- `docs/prompts/SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md`
- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts`
- `packages/services/audio-engine/src/core/live-sampler.ts`
- `packages/background-media/src/audio/audio-ingest.service.ts`

Finding:

The scenario capture node does not set sample rate. It captures the active stream
through `LiveSampler`, which creates a normal `AudioContext` and emits
`audioContext.sampleRate`. The client payload stores that measured rate, and media
ingest persists metadata sample rate without normalization.

Decision for the cut:

For the urgent hour, guard/report heterogeneity in the judged path. Do not resample
the captured material and do not widen MFCC acceptance to 44.1 kHz in this sprint.
