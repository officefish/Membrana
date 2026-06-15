# @membrana/detector-base

Общий контракт семейств детекторов дрона (Single-Node Detection First).

- `DroneDetector`, `DetectionResult`, `AudioWindow`, `DetectionMetrics`
- **`analyzeSample()`** — агрегация кадров → `SampleDetectionVerdict` на целый 5-с сэмпл (UI + benchmark)
- `createMockDroneDetector()` для unit-тестов и заглушек бенчмарка
- `NotImplementedError` для scaffold-реализаций
- Фикстуры `sineWindow` / `harmonicDroneWindow` / `whiteNoiseWindow` для unit-тестов

**Статус:** stable v0.1

См. [`docs/ARCHITECTURE.md`](../../../../docs/ARCHITECTURE.md) §1e.
