# INSIGHT: Комбинированный детектор: гармоника с FFT-ядра, тембр с MFCC

| Поле | Значение |
|------|----------|
| **ID** | `insight-mfcc-combined-two-cores` |
| **Статус** | draft |
| **Источник** | user (слово владельца 30.07: «делается пока проверочный, два других стоит добавить через инсайты») |
| **Создан** | 2026-07-30 |

---

## Проблема / наблюдение

Исследование `mfcc-lib-choice` (30.07) назвало разделение труда между признаками прямо:
**гармоническая структура сохраняется в спектре и теряется в MFCC**, а тембровая огибающая —
наоборот, есть в MFCC и размазана в сыром спектре. Ни один из двух признаков не покрывает другой.

При этом у нас **уже есть оба ядра**: `packages/services/fft-analyzer` живёт с потребителями
(`apps/client`, `packages/libs/journal-report-views`), а MFCC-ядро строится сейчас. И у нас уже
есть прецедент слияния вердиктов: `@membrana/detection-ensemble-service` с
`fuseDetectorResults` и плагин `mic-combined-detection`.

## Гипотеза

Если детектор берёт **гармонику с FFT-ядра, а тембр с MFCC-ядра** и сливает их одним вердиктом,
он окажется устойчивее каждого поодиночке ровно там, где они падают по-разному: гармонический
слепнет при размытой решётке (ветер, расстояние, шум), тембровый — при чужом источнике с похожей
огибающей. Их ошибки **не совпадают**, и именно поэтому слияние имеет смысл.

Для контура это первый детектор **на двух ядрах**, и он проверяет саму способность контура их
сочетать — не гипотетически, а на существующем ансамблевом сервисе.

## Scope (черновик)

- **In scope:** правило слияния двух признаков в один вердикт (веса или предикат, не «на глаз») ·
  поведение при отказе одного из ядер · проверка на своих 253 звуках лестницей.
- **Out of scope:** переписывание любого из двух ядер · выбор библиотеки MFCC · витрина и тариф ·
  новые узлы палитры (отдельный консилиум-гейт, если понадобятся).

## Связи

- Родитель по существу: шторм [`storm-mfcc-as-sprint-test-2026-07-30`](../../storm/storm-mfcc-as-sprint-test-2026-07-30/REPORT.md)
- Основание находки: [`mfcc-lib-choice-DECISION.md`](../../tasks/research/mfcc-lib-choice-DECISION.md)
- Готовый механизм слияния: `@membrana/detection-ensemble-service` (`fuseDetectorResults`),
  плагин `mic-combined-detection`
- Сосед по решению владельца: `insight-mfcc-timbre-detector`

## Вопросы для research (Q1–Q3)

1. **Landscape:** How do practitioners fuse harmonic/spectral features with cepstral (MFCC)
   features for acoustic event detection in 2024-2026 — early fusion (concatenated feature
   vectors), late fusion (combining per-detector scores), or hybrid — and which performs better
   when the two feature families fail under different conditions?
2. **Fit:** When two detectors disagree, which combination rules stay explainable to an operator
   — weighted score averaging, logical OR/AND with per-detector confidence, Dempster-Shafer
   evidence combination — and how are the weights chosen from a small labelled dataset without
   overfitting?
3. **Risk:** What are the documented failure modes of fusing correlated acoustic features?
   Specifically: when does fusion perform WORSE than the better single detector, how is that
   detected, and what should a fused detector do when one of its inputs is unavailable or
   degraded rather than silently reporting a confident verdict?

## Почему инсайт, а не блок спринта

Комбинированный детектор **зависит от исхода проверочного**: пока сравнительный прогон не
показал, что MFCC вообще даёт различение на нашем материале и что ошибки двух признаков
действительно расходятся, сливать нечего. Слияние признаков, ошибки которых совпадают, не
улучшает ничего и лишь усложняет объяснение оператору.

Кроме того, блок на **двух ядрах** имеет зону шире любого из трёх нынешних — его объём нельзя
прогнозировать по аналогам, пока второе ядро не существует.
