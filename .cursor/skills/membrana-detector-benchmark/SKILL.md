---
name: membrana-detector-benchmark
description: >-
  Runs Membrana detector build, test, benchmark, and calibration scripts for DSP drone
  detection services. Use when user mentions benchmark:detectors, calibrate:detectors,
  test:detectors, free-v1 dataset, or stage-gate reports. Do NOT use for adding new
  ML tier-2 detectors without INTEGRATIONS_STRATEGY review.
---

# Membrana detector benchmark (partial stub)

Канон: [`docs/INTEGRATIONS_STRATEGY.md`](../../../docs/INTEGRATIONS_STRATEGY.md), [`docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](../../../docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md).

## Commands

```bash
yarn test:detectors
yarn lint:detectors
yarn benchmark:detectors
yarn calibrate:detectors
yarn benchmark:fft-trends
yarn report:vdr6
```

## Planning note

Tier 0 on free-v1 largely exhausted; prefer trends `DRONE_TIGHT`, validated data, or tier 2 per FFT_METRICS §6.

## Build filter pattern

Turbo builds detector packages before scripts — see `package.json` `benchmark:detectors` for current filter list.

## Output

Which benchmark ran, key metrics path (e.g. stage-gate report), gaps to ≥80% if validation epic.
