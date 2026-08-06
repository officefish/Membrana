# @membrana/detector-base

Общий контракт семейств детекторов дрона (Single-Node Detection First).

- `DroneDetector`, `DetectionResult`, `AudioWindow`, `DetectionMetrics`
- **`analyzeSample()`** — агрегация кадров → `SampleDetectionVerdict` на целый 5-с сэмпл (UI + benchmark)
- `createMockDroneDetector()` для unit-тестов и заглушек бенчмарка
- `NotImplementedError` для scaffold-реализаций
- Фикстуры `sineWindow` / `harmonicDroneWindow` / `whiteNoiseWindow` для unit-тестов

**Статус:** stable v0.1

См. [`docs/ARCHITECTURE.md`](../../../../docs/ARCHITECTURE.md) §1e.

## Подготовка окна — единый носитель

`src/sample-window.ts` держит механику окна для ВСЕХ детекторов: `prepareFftSamples`,
`fftFrames`, `averageMagnitudes`, `geometricMeanMagnitudes`. До 02.08 она жила в дереве в
четырёх копиях (включая приватную `iterWindows` этого пакета), и починка дефекта «детектор
слышит первые `fftSize` сэмплов вместо записи» доехала до одного пакета 01.08, а до двух
других — сутками позже.

**Сводов два, и это не дублирование.** Как сводить спектры кадров — вопрос природы детектора:

| свод | кому | почему |
|---|---|---|
| `averageMagnitudes` | гармоническому, доле энергии низа | мерка линейна по спектру |
| `geometricMeanMagnitudes` | кепстральному | кепстр берёт `log`, а `log` среднего ≠ среднее логарифмов: арифметика расплывает пик квефренции |
| не сводить вовсе | детектору спектрального потока | он мерит разницу между кадрами, усреднение стёрло бы измеряемое |

Единственность носителя держит зуб `scripts/detectors-window-carrier.test.mjs`: пятая копия
заводится одной строкой и ничем себя не выдаёт.
