# CLOSURE CANDIDATE: fv1-S2 — real-only content and template QA

**Sprint:** `fv1-s2-content`  
**Epic:** `free-v1-sound-catalog` / GitHub #205  
**Result:** implementation evidence ready; exact-SHA Teamlead review pending

## Accountability

| Deliverable                               | Accountable persona | Evidence                                             |
| ----------------------------------------- | ------------------- | ---------------------------------------------------- |
| 130 licensed real recordings and metadata | Kuryokhin           | `docs/datasets/free-v1/*/metadata.json`              |
| Reproducible materializer and inventory   | Ozhegov             | `materialize-free-v1-real.py`, `yarn vdr:list`       |
| Six generated templates                   | Ozhegov             | `packages/services/trends-detector/templates/*.json` |
| LOO metrics and confusion matrix          | Dynin               | `QUALITY_REPORT.md`, `quality-report.json`           |
| Scope and handoff decision                | Vesnin              | pending exact-SHA review artifact                    |

## DoD

- [x] 130 S2 recordings: 130 real, 0 synthetic.
- [x] Six templates generated: SILENCE, WIND, BIRDS, SPEECH, MACHINE_HUM, GUNSHOT.
- [x] Consolidated quality passport with per-class precision/recall/F1.
- [x] `yarn vdr:list`: seven classes; all six S2 classes `field-ready`.
- [x] Primary source, license and original archive path retained per sample.
- [x] `DRONE.json` unchanged.

## Quality baseline

LOO envelope-scoring accuracy is **47.7%**. Wind is strongest
(P 91.7%, R 100%); speech recall is 90.9%. Silence, birds, machine-hum and
gunshot overlap substantially. These figures are not a failed S2 gate: they are
the real-data baseline that S3 must improve through multi-class routing and
threshold calibration.

## Arithmetic clarification

Canonical v0.2 contains 60 drone and 60 legacy not-drone rows. The S2 quotas add
130 class-labeled recordings, producing a seven-class catalog of 190 rows. The
epic prompt's `120 drone + 130 = 250` premise was incorrect; no duplicates were
introduced to manufacture the larger number.

## Handoff

After Teamlead LGTM, `fv1-s3-integration` may consume the real-only corpus.
Production deployment and the final drone FPR/recall stage gate remain S3
responsibilities.
