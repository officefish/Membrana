# Membrana Local Sprint OPEN: scenario-first-capture-rate

| Field | Value |
|-------|-------|
| Sprint | `scenario-first-capture-rate` |
| Procedure | `membrana-local-sprint` |
| Registry card | `scenario-rate-first-capture` (M, #2046) |
| Prompt | [`SESSION_V_FIRST_CAPTURE_RATE_2026-08-22.md`](../../prompts/SESSION_V_FIRST_CAPTURE_RATE_2026-08-22.md) |
| Cut plan | [`scenario-first-capture-rate.json`](../../sprint/cut/scenario-first-capture-rate.json) |
| Cutter context | Kuryokhin, [`cut-scenario-first-capture-rate-kuryokhin.md`](../../discussions/cut-scenario-first-capture-rate-kuryokhin.md) |
| Lead | kuryokhin |
| Support | vesnin · dynin · angelina |
| Status | sprint gate PASS, awaiting PR ship |

## Why

The first recording chunk after scenario start can still write 44100 Hz even after
PR #2042 promised fail-closed behavior for non-48000 capture. The defect is
deterministic on Firebat and hides in the first track after restart.

## Cause Address

The #2042 check is in `LiveSampler.start`, but the observed track is created by
`ScenarioMicJournalBridge.recordChunk` through `startClipRecorder(..., 'wav')`.
That WAV recorder reads actual `ctx.sampleRate` only after recording, in `stop()`.

## Blocks

| Block | Persona | Zone | Estimate | Status |
|-------|---------|------|---------:|--------|
| b1 card and cause | kuryokhin | registry, prompt, cutter context, cut plan | 120 | PASS |
| b2 audio-engine rate preflight | vesnin | audio-engine core helper + tests | 160 | PASS |
| b3 wav recorder first-capture guard | kuryokhin | recorder wiring + scenario naming + first-capture tooth | 240 | PASS |
| b4 gate trail | angelina | sprint gate, closure, experience | 100 | PASS |

## Acceptance

- First recording chunk after scenario start cannot produce a 44100 blob.
- Actual context rate is checked before accepting PCM chunks.
- Non-48000 actual rate fails closed with a named reason.
- Existing 16-bit / 48 kHz mono canon stays unchanged.
- No deploy without coordinator approval.
