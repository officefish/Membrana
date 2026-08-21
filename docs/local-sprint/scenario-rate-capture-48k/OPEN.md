# Membrana Local Sprint OPEN: scenario-rate-capture-48k

| Field | Value |
|-------|-------|
| Sprint | `scenario-rate-capture-48k` |
| Procedure | `membrana-local-sprint` |
| Registry card | `scenario-rate-sprint` (M, #2001 continuation) |
| Prompt | [`SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md`](../../prompts/SESSION_V_SCENARIO_RATE_SPRINT_2026-08-21.md) |
| Cut plan | [`scenario-rate-capture-48k.json`](../../sprint/cut/scenario-rate-capture-48k.json) |
| Cutter context | Kuryokhin, [`cut-scenario-rate-capture-48k-kuryokhin.md`](../../discussions/cut-scenario-rate-capture-48k-kuryokhin.md) |
| Lead | kuryokhin |
| Support | vesnin · angelina |
| Status | closed · gate pass |

## Why

PR #2038 named why one scenario session can contain both 48 kHz and 44.1 kHz
tracks and added a tooth so MFCC does not mix heterogeneous rates silently.
The urgent blocker remains: the board scenario can still write 44.1 kHz, which
makes part of today's hour non-judgeable.

## Cut Decision For Ratification

One implementation block fixes the scenario capture path at 48 kHz through
`@membrana/audio-engine-service`. If the browser/OS/device returns a different
actual `AudioContext.sampleRate`, the scenario refuses to write the sample and
logs the named reason.

This block does not resample audio and does not widen MFCC acceptance to 44.1.

## Blocks

| Block | Persona | Zone | Estimate | Status |
|-------|---------|------|---------:|--------|
| a1 capture 48k guard | kuryokhin | audio-engine sampler + scenario bridge target | 180 | awaiting owner ratification |

## Acceptance

- Scenario capture requests 48000 Hz explicitly.
- Actual capture rate is verified before writing sample payloads.
- If actual capture rate is not 48000 Hz, capture fails closed with a named reason.
- Existing sample metadata remains measured, not rewritten by hand.
- No resampling, no MFCC 44.1 widening, no production deploy.
