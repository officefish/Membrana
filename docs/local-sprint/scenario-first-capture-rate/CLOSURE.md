# Closure — scenario-first-capture-rate

## Outcome

Implemented fail-closed before the first scenario WAV capture can accept PCM:

- `createAudioContext` now has strict `requireSampleRate` mode and throws `WEB_AUDIO_SAMPLE_RATE_UNAVAILABLE` when actual rate differs from requested rate.
- `startWavRecorder` uses strict 48000 Hz preflight before `createMediaStreamSource`, worklet setup, or PCM collection.
- `ScenarioMicJournalBridge` names recorder start refusals and one-shot `recordChunk` refusals in scenario logs.
- Regression coverage names the first WAV capture after start: actual 44100 Hz throws, closes context, and never creates a media source.

## Non-Goals Kept

- No resampling.
- No 44.1 kHz analysis gate widening.
- No bit-depth/#2037 work.
- No archive recoding.
- No production deploy.

## Procedure

Owner ratification was recorded in `docs/sprint/cut/scenario-first-capture-rate.json` before code. Sprint gate passed at `2026-08-22T12:43:00+03:00` with 4/4 honest pairs and no findings.
