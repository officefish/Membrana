# Cut context: scenario-first-capture-rate

Date: 2026-08-22
Subject: Kuryokhin
Issue: #2046

## Cause Address

The #2042 guard is present in `LiveSampler.start` and runs before
`createMediaStreamSource`, `createAnalyser`, and `startLoop`.

The live recording track does not use that path. `ScenarioMicJournalBridge.recordChunk`
calls `startClipRecorder(stream, 'wav')`, which dispatches to `startWavRecorder` in
`apps/client/src/plugins/mic-buffer-recorder/clipRecorder.ts`.

`startWavRecorder` creates its own `AudioContext({ sampleRate: WAV_SAMPLE_RATE })`,
connects a worklet, collects PCM chunks, and only reads `ctx.sampleRate` in `stop()`
when it encodes the blob. Therefore the 44.1 kHz first-track defect can bypass
`LiveSampler.ensureRequestedSampleRate` entirely.

## Cut Decision

Fix the recording chunk path, not only the sample capture path.

The minimal behavior contract is:

- before any PCM chunk can be accepted, the actual context rate is checked;
- if actual rate is not 48000, the recorder fails closed and no blob is returned;
- the scenario names the refusal;
- the first capture after scenario start has an explicit test.

## Price

This is larger than a one-line move because `clipRecorder.ts` currently owns direct
Web Audio in the client plugin. The cut keeps urgent scope narrow but still isolates
the reusable rate assertion in `@membrana/audio-engine-service`.

Out of scope: resampling, MFCC 44.1 widening, bit-depth changes, production deploy.
