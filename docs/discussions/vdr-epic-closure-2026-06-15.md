# VDR epic closure — validated drone recognition (2026-06-15)

> **Эпик:** [`VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md`](../prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md)  
> **JSON:** [`vdr6-closure.json`](../../data/detectors-benchmark/v0.2/reports/vdr6-closure.json)  
> **Ground truth:** [`DATASET_CURATION.md`](../DATASET_CURATION.md) · 120/120 curated · 80 train / 40 val

## Итог эпика (FFT-only, free-v1)

| Фаза | Статус |
|------|--------|
| VDR1–VDR2 | label + notes API/UI |
| VDR3 | export ground truth → manifest |
| VDR4 | DSP calibration on curated labels |
| VDR5 | template-match + `DRONE_CURATED` |
| VDR6 | этот отчёт |

**Цель ≥80% val accuracy:** **не достигнута** (by design acceptable для текущего тарифа).

## Val-split (40 сэмплов)

| Детектор | Val accuracy | Val F1 | Val P | Val R | ≥80% accuracy |
|----------|--------------|--------|-------|-------|---------------|
| harmonic | 40.0% | 55.6% | 44.1% | 75.0% | нет |
| cepstral | 50.0% | 66.7% | 50.0% | 100.0% | нет |
| spectral-flux | 20.0% | 30.4% | 26.9% | 35.0% | нет |
| template-match | 52.5% | 67.8% | 51.3% | 100.0% | нет |

**Лучший val accuracy:** template-match — 52.5%  
**Лучший val F1:** template-match — 67.8%

## Выводы

1. **Операторская разметка** работает (120/120, notes в manifest); метрики не выросли vs folder-labels — узкое место в **FFT-признаках**, не в GT.
2. **Template-match** (trends + curated шаблон) — лучший F1 на полном корпусе (71.4%) и конкурентен на val; всё ещё высокий FP на not-drone (речь, природа).
3. **Одиночные пороги** harmonic/cepstral/flux исчерпаны; grid search не спасает TN≈0 у cepstral.

## Рекомендации (приоритет)

1. FFT-only stack exhausted for free-v1: val accuracy ≤56%; do not block product on 80% gate.
2. Ship template-match as best FFT trends row in sample-library plugin; keep harmonic for interpretability.
3. Next tariff (out of scope this week): MFCC analyzer + spectrogram features + ~600 samples.
4. Follow-up epic: journal refactor (agenda telemetry / sample-library drone journal).
5. Optional later: weighted ensemble of harmonic + template-match; neural zero-shot (YAMNet) only after LGTM.

## Команды воспроизведения

```bash
yarn dataset:export-ground-truth
yarn templates:build-from-dataset
yarn calibrate:detectors
yarn benchmark:detectors
yarn report:vdr6
```
