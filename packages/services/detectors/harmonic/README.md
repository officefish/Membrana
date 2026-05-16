# @membrana/harmonic-detector-service

Гармонический портрет мультиротора (80–250 Hz + гармоники). **Исполнение GitHub [#45](https://github.com/officefish/Membrana/issues/45)** фазы 1.

| Документ | Назначение |
|----------|------------|
| [`docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md`](../../../docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md) | Промпт реализации |
| [`docs/discussions/issue-45-harmonic-bridge.md`](../../../docs/discussions/issue-45-harmonic-bridge.md) | Мост #45 → этот пакет |
| [`docs/discussions/dsp-drone-detector-v0.1.md`](../../../docs/discussions/dsp-drone-detector-v0.1.md) | ADR контракт magnitudes |

**Статус:** фаза 1 реализована (`classifySpectrum`, `HarmonicDetector.detect`). Демо и плагин — отдельно.

```ts
import { createHarmonicDetector } from '@membrana/harmonic-detector-service';
import { harmonicDroneWindow } from '@membrana/detector-base';

const detector = createHarmonicDetector();
const result = await detector.detect(harmonicDroneWindow());
```

Прямой вызов по magnitudes: `classifySpectrum(magnitudes, sampleRate, fftSize)`.
