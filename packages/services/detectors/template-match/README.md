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
