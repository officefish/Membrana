# a1 - Kuryokhin Context: capture 48 kHz guard

Sprint: `scenario-rate-capture-48k`
Block: `a1-capture-48k-guard`

Implemented:

- `packages/services/audio-engine/src/types.ts`
- `packages/services/audio-engine/src/core/audio-context.ts`
- `packages/services/audio-engine/src/core/live-sampler.ts`
- `packages/services/audio-engine/src/core/audio-context.test.ts`
- `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts`

The scenario capture path now asks `LiveSampler` for 48000 Hz. The direct Web
Audio change stays inside `@membrana/audio-engine-service`: `createAudioContext`
accepts `{ sampleRate }` and passes it to the `AudioContext` constructor.

`LiveSampler.start` checks the actual `audioContext.sampleRate` before connecting
the stream. If the browser/OS/device returns a different rate, it throws
`DomainError` with code `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE`; the existing catch
path closes the context and stops the sampler. The scenario bridge logs
`stream/sampler-refused` with the requested rate and reason, then rethrows, so it
does not write a 44.1 kHz sample payload silently.

Out of scope stayed untouched: no resampling, no MFCC 44.1 widening, no production
deploy.
