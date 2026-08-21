# b2 — Dynin Context: session rate tooth

Sprint: `scenario-rate-sprint`
Block: `b2-session-rate-tooth`

Implemented:

- `packages/plugin-handlers/src/mfcc/session-sample-rate.ts`
- `packages/plugin-handlers/src/mfcc/session-sample-rate.test.ts`

The helper is pure: it receives sample ids/titles/sample rates and returns a
closed status: `empty`, `homogeneous`, `mixed`, or `missing`. It does not mutate
sample metadata and does not decode audio.

Cases covered:

- homogeneous 48 kHz is judgeable;
- homogeneous 44.1 kHz is named as non-judgeable against 48 kHz gates;
- mixed 44.1/48 kHz names both rate groups and sample ids;
- missing sampleRate is not ignored.
