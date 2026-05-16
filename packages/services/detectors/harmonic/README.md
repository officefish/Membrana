# @membrana/harmonic-detector-service

Гармонический портрет мультиротора (80–250 Hz + гармоники). **Исполнение GitHub [#45](https://github.com/officefish/Membrana/issues/45)** фазы 1.

| Документ | Назначение |
|----------|------------|
| [`docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](../../../docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md) | Промпт реализации |
| [`docs/discussions/issue-45-harmonic-bridge.md`](../../../docs/discussions/issue-45-harmonic-bridge.md) | Мост #45 → этот пакет |
| [`docs/discussions/dsp-drone-detector-v0.1.md`](../../../docs/discussions/dsp-drone-detector-v0.1.md) | ADR контракт magnitudes |

**Статус:** фаза 1 + **демо** (`demo/`). Плагин клиента — отдельно.

## Demo (Harmonic Drone Lab)

```bash
yarn workspace @membrana/harmonic-detector-service dev:demo
```

Откроется http://localhost:5178 — live-микрофон, индикатор дрон/не дрон, confidence, reasoning.

**Ручная приёмка:** тишина → низкий confidence; запись пропеллера с колонки → рост confidence; Stop освобождает микрофон.

UI-регламент (сглаживание, вёрстка): [`docs/LIVE_DETECTION_UI.md`](../../../docs/LIVE_DETECTION_UI.md).

```ts
import { createHarmonicDetector } from '@membrana/harmonic-detector-service';
import { harmonicDroneWindow } from '@membrana/detector-base';

const detector = createHarmonicDetector();
const result = await detector.detect(harmonicDroneWindow());
```

Прямой вызов по magnitudes: `classifySpectrum(magnitudes, sampleRate, fftSize)`.
