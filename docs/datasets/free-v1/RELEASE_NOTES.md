# free_v1 Sound Catalog Release Notes

- **Release:** `free_v1`
- **Date:** 2026-07-01
- **Owner:** Vesnin

## Scope

The release catalog contains exactly seven classes: drone, silence, wind,
birds, speech, machine-hum, and gunshot. Unknown is a routing outcome, not an
eighth template class.

The mixed evaluation corpus contains 190 five-second recordings: 60 existing
drone recordings and 130 licensed real-only S2 recordings. No synthetic rows
participate in the release gate.

## Runtime contract

- `SoundClass` is exported by `@membrana/core`.
- Trends results expose `class`, `confidence`, `isDrone`, and `isClassified`.
- The default template-match catalog contains `DRONE_TIGHT` plus the six S2
  templates; legacy bootstrap scenes are not part of `free_v1` routing.
- Calibrated routing uses a 25-point drone-first margin and per-class minimum
  confidence values recorded in `STAGE_GATE_REPORT.md`.

## Stage gate

The committed mixed-corpus report passes the requested drone gate:

- drone false-positive rate: **6.9%** (target `< 15%`);
- drone recall: **90.0%** (target `>= 90%`);
- drone precision: **85.7%**;
- overall seven-class accuracy: **65.8%**.

This is a catalog gate, not proof of device, location, or microphone-domain
generalization. Silence recall (10.0%), machine-hum recall (24.0%), and gunshot
recall (42.1%) remain explicit quality debt. Production deployment outside the
tested free_v1 workflow requires new validated data.

## User-facing changes

- Trends plugin reports the canonical sound class next to confidence.
- Device-board trends results retain sound class and drone semantics.
- Cabinet journal can filter loaded reports by sound class.

## Reproduce

```bash
yarn templates:stage-gate
```

The command rebuilds the trends and template-match services, evaluates the
mixed corpus, calibrates routing, and rewrites the Markdown and JSON reports.
