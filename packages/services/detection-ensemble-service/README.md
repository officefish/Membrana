# @membrana/detection-ensemble-service

Combined-продюсер: питает `combinedScore` из fusion-ядра `@membrana/core`
(`fuseDetectorConfidences`), прогоняя **инъецированные** детекторы (trends + yamnet)
на окне. Слияние считает ядро; сервис — оркестрация во времени + EMA-сглаживание.

**Слой:** analyzer. **Зависит только от** `@membrana/core` + foundation
`@membrana/detector-base`. **НЕ** импортирует другие analyzer/detector сервисы —
детекторы приходят через контракт `DroneDetector`.

## API

| Экспорт | Что делает |
|---------|-----------|
| `fuseDetectorResults(snapshots)` | Чистое слияние снимков `DetectorSnapshot` через ядро. Молчащий (`result: null`) → `present:false`. |
| `EnsembleProducer` | Держит EMA `combinedScore` над потоком окон; `analyze(window)` гоняет `detect()` каждого детектора (устойчиво к throw). |
| `detectorSnapshotToFusionInput` | Маппинг снимка → `FusionSourceInput` ядра. |

```ts
import { EnsembleProducer } from '@membrana/detection-ensemble-service';

// Плагин «Микрофона» инъецирует живые детекторы (не импорт сервисов):
const producer = new EnsembleProducer([trendsDetector, yamnetDetector], {
  smoothing: 0.4,          // EMA: 1 = без сглаживания
  weights: { yamnet: 2 },  // нейро — больший голос
});

const { combinedScore, smoothedScore, agreement } = await producer.analyze(window);
// alarm-loop реагирует на combinedScore/smoothedScore, НЕ на сырую громкость.
```

## Контракт слияния (ND3)

Профили ошибок DSP (trends) и нейро (yamnet) слабо коррелированы → сливаем на
**сыром confidence** взвешенным средним, **не** бинарным OR по вердиктам. Согласие
high↔high → высокий score, `agreement ≈ 1`; расхождение high↔low → середина,
низкий `agreement`. Политика порога тревоги остаётся у потребителя.

## Проверка

```bash
yarn workspace @membrana/detection-ensemble-service test
yarn turbo run lint typecheck --filter=@membrana/detection-ensemble-service
```

См. `docs/prompts/DETECTION_ENSEMBLE_SERVICE_PROMPT.md`, `docs/SERVICES.md`.
