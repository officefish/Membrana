# @membrana/drone-detection-orchestrator-service

## Что делает

Оркестрирует **полный отчёт детекции дрона** (`drone-detection-report/v1`, DDR2) поверх
mono `Float32Array`-сэмплов: запускает три калиброванных DSP-детектора
(harmonic, cepstral, spectral-flux) и template-match, собирает секции отчёта через
`@membrana/detector-report`.

Ядро не зависит от браузера / Web Audio, поэтому один и тот же код работает:

- на **клиенте** — после декода blob через `@membrana/audio-engine-service`;
- на **сервере** (`background-media`) — после декода WAV в Node (`await import(...)` из CJS).

## Установка

Внутренний workspace-пакет: `"@membrana/drone-detection-orchestrator-service": "*"`.

## Использование

```ts
import { analyzeDroneDetectionDetailed } from '@membrana/drone-detection-orchestrator-service';

const { verdicts, report } = await analyzeDroneDetectionDetailed(samples, sampleRate, {
  sampleId,
  sampleTitle,
});
```

## API

- `analyzeDroneDetectionDetailed(samples, sampleRate, input)` → `{ verdicts, report }` — полный DDR.
- `createDroneFrameDetectors()` — фабрика трёх калиброванных DSP-детекторов.
- `CALIBRATED_SAMPLE_OPTIONS` — пресет агрегации сэмплов (VDR4).
- `mapTrendsTemplateMatchBreakdown(params)` — маппинг trends-разбора в DTO `detector-report`.

## Breaking changes

- 0.1.0 — первичная экстракция из `apps/client/.../sample-library-drone-analysis` (LP1b).
