# free-v1 S2 Template Quality Passport

**Owner:** Dynin  
**Method:** leave-one-out class-envelope scoring  
**Samples:** 130 (130 real, 0 synthetic)

> The corpus is real-only. S3 still requires threshold calibration and its own mixed-dataset stage gate.

## Per-class metrics

| Class       | Samples | Precision | Recall |    F1 |
| ----------- | ------: | --------: | -----: | ----: |
| silence     |      20 |     20.0% |   5.0% |  8.0% |
| wind        |      22 |     91.7% | 100.0% | 95.7% |
| birds       |      22 |     31.6% |  27.3% | 29.3% |
| speech      |      22 |     39.2% |  90.9% | 54.8% |
| machine-hum |      25 |     31.6% |  24.0% | 27.3% |
| gunshot     |      19 |     58.3% |  36.8% | 45.2% |

**Overall accuracy:** 47.7%  
**Real-only accuracy:** 47.7%  
**Synthetic-only accuracy:** n/a

## Confusion matrix

| Actual \ Predicted | silence | wind | birds | speech | machine-hum | gunshot |
| ------------------ | ------: | ---: | ----: | -----: | ----------: | ------: |
| silence            |       1 |    0 |    10 |      3 |           5 |       1 |
| wind               |       0 |   22 |     0 |      0 |           0 |       0 |
| birds              |       1 |    0 |     6 |      8 |           7 |       0 |
| speech             |       0 |    2 |     0 |     20 |           0 |       0 |
| machine-hum        |       1 |    0 |     3 |     11 |           6 |       4 |
| gunshot            |       2 |    0 |     0 |      9 |           1 |       7 |

## Gate interpretation

- S2 content and template-generation mechanics are reproducible.
- All six S2 classes contain licensed real recordings; synthetic count is zero.
- Current envelope scoring is a baseline, not the S3 production gate; S3 must calibrate routing on the mixed seven-class corpus.
