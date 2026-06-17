# @membrana/template-match-detector-service

## Что делает

Детектор дрона по **FFT-трендам**: нарезка 5 с → `MetricSample[]` → `classifyTrends()` из `@membrana/trends-detector-service`. Шаблоны `DRONE*` строятся из validated drone-сэмплов (`yarn templates:build-from-dataset`).

## Использование

```typescript
import {
  analyzeTemplateMatch,
  createDefaultTemplateMatchCatalog,
  createTemplateMatchDetector,
} from '@membrana/template-match-detector-service';

const detector = createTemplateMatchDetector({
  templates: createDefaultTemplateMatchCatalog(),
});
const verdict = await analyzeTemplateMatch(samples, 48_000, detector);
```

## API

- `collectMetricSamples` — offline FFT metrics
- `buildTemplateFromMetricSamples` / `mergeCuratedDroneTemplate` — сборка шаблонов
- `createTemplateMatchDetector` — `DroneDetector` для полного буфера сэмпла

## Curated `DRONE_TIGHT` и benchmark

Shipped-шаблон `DRONE_TIGHT` лежит в `src/data/curated-drone-templates.json`.
При изменении curated-каталога **обязательно** синхронизировать копию для харнесса:

`data/detectors-benchmark/v0.2/curated-drone-templates.json`

(скрипт `yarn benchmark:detectors` читает dataset-dir, не только пакет).
Контракт для client: [`ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) §1e «Калибровка DRONE_TIGHT»;
facade — `apps/client/src/lib/droneTightCalibration.ts`.
