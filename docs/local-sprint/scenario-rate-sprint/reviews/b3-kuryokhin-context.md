# b3 — Kuryokhin Context: wire judged path

Sprint: `scenario-rate-sprint`
Block: `b3-wire-judgeable-path`

Implemented:

- `packages/plugin-handlers/src/mfcc/executor.ts`
- `packages/plugin-handlers/src/mfcc/executor.test.ts`
- `packages/plugin-handlers/src/index.ts`

The MFCC executor now includes `sampleRateConsistency` in `MfccRunResult` before
returning sample verdicts. Existing per-sample refusal for decoded 44.1 kHz stays
in place. The new run-level field names mixed rates across the candidate set, so
48 kHz judged samples and 44.1 refused samples are not presented as one silent
homogeneous corpus.

No capture path, journal plugin, production deploy, or #1950 declared/measured
behavior was changed.
