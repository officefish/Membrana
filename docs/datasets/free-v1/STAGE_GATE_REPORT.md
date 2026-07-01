# free_v1 S3 Stage-Gate Report

**Owner:** Dynin
**Catalog:** free_v1
**Mixed corpus:** 190 recordings

**Verdict:** PASS
**Drone FPR:** 6.9% (target < 15%)
**Drone recall:** 90.0% (target >= 90%)
**Overall accuracy:** 65.8%

## Calibrated minimum confidence

| Class | Threshold |
|---|---:|
| drone | 57 |
| silence | 96 |
| wind | 86 |
| birds | 85 |
| speech | 87 |
| machine-hum | 79 |
| gunshot | 79 |

**Drone-first minimum gap:** 25 points

## Per-class metrics

| Class | Samples | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| drone | 60 | 85.7% | 90.0% | 87.8% |
| silence | 20 | 33.3% | 10.0% | 15.4% |
| wind | 22 | 77.8% | 95.5% | 85.7% |
| birds | 22 | 44.1% | 68.2% | 53.6% |
| speech | 22 | 86.4% | 86.4% | 86.4% |
| machine-hum | 25 | 75.0% | 24.0% | 36.4% |
| gunshot | 19 | 88.9% | 42.1% | 57.1% |

## Confusion matrix

| Actual \ Predicted | drone | silence | wind | birds | speech | machine-hum | gunshot | unknown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| drone | 54 | 0 | 0 | 1 | 0 | 2 | 0 | 3 |
| silence | 1 | 2 | 0 | 16 | 0 | 0 | 0 | 1 |
| wind | 0 | 0 | 21 | 0 | 0 | 0 | 0 | 1 |
| birds | 5 | 1 | 0 | 15 | 0 | 0 | 0 | 1 |
| speech | 0 | 0 | 1 | 0 | 19 | 0 | 0 | 2 |
| machine-hum | 3 | 2 | 0 | 2 | 2 | 6 | 1 | 9 |
| gunshot | 0 | 1 | 5 | 0 | 1 | 0 | 8 | 4 |

## Decision

- The numerical S3 drone gate passes on the mixed corpus.
- This report evaluates the committed release templates. It is not evidence of geographic or device-domain generalization.

