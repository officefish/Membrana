# Промпт: harmonic-detector — реализация (исполнение GitHub #45, фаза 1)

> **Task-промпт для агента.** Закрывает **фазу 1** [`DSP_DRONE_DETECTOR_PROMPT.md`](./DSP_DRONE_DETECTOR_PROMPT.md) / Issue **#45** через пакет `@membrana/harmonic-detector-service`.  
> Реестр: `dsp-drone-detector` · мост: [`issue-45-harmonic-bridge.md`](../discussions/issue-45-harmonic-bridge.md).  
> Размер: **M** (один PR) или часть **L** (1/3 от dsp-drone-detector).  
> Ветка: `dynin` или `techies68` (согласовать с Teamlead).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana. **Математик** пишет `src/math/`, **Структурщик** — `core/`, `hooks/`, интеграция. Соблюдай [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1e, [`SERVICES.md`](../SERVICES.md), [`dsp-drone-detector-v0.1.md`](../discussions/dsp-drone-detector-v0.1.md).

### Цель

Реализовать **`HarmonicDetector`** (не placeholder): бинарная детекция аэро-источника по гармоническому стеку **80–250 Hz** + кратные до ~5 kHz.

```text
AudioWindow → (hooks: FFT) → magnitudes → math: classifySpectrum → DetectionResult
```

### Пакет

`packages/services/detectors/harmonic/` — `@membrana/harmonic-detector-service`.

**Зависимости:** `@membrana/detector-base`, `@membrana/core`, `@membrana/fft-analyzer-service` (только в `hooks/`, не в `math/`).

### Math (`src/math/`)

- `classifySpectrum(magnitudes, sampleRate, fftSize, config?)` → результат с полями ADR + `latencyMs` в обёртке detector.
- `findSpectralPeaks`, `scoreHarmonicStack`, `mergeFundamentals` — pure TS.
- Параметры v0.1: `fftSize=2048`, `sampleRate=48000`, hop 50% — см. ADR.

### Core (`src/core/`)

- `HarmonicDetector` implements `DroneDetector` (`name: 'harmonic'`, `family: 'dsp'`).
- `detect(window)` → FFT magnitudes (или делегат в math с временным окном) → `DetectionResult` с `reasoning` на русском, `features` для отладки.

### Hooks (`src/hooks/`)

- `useHarmonicDetector` — live-цепочка с `useFftAnalyzer` / кадрами; документировать в README.

### Тесты

| Кейс | Ожидание |
|------|----------|
| Синтетика f, 2f, 3f | `isDrone: true`, confidence > порога |
| Белый шум / тишина | `isDrone: false` |
| latency | < 100 ms (p95) на типовом буфере |

`yarn workspace @membrana/harmonic-detector-service test` — зелёный.

### DoD (фаза 1 / #45)

- [ ] Placeholder `NotImplementedError` удалён.
- [ ] README сервиса: API, пример, ссылка на #45 и ADR.
- [ ] Client aliases уже есть; плагин — **следующий промпт** (фаза 3).
- [ ] PR: `Closes #45` (фаза 1; в описании — ссылка на harmonic, не dsp-drone-detector package).
- [ ] CI: `yarn turbo run lint typecheck test build --filter=@membrana/harmonic-detector-service --continue`.

### Out of scope этого промпта

- Demo (`harmonic/demo/`) — фаза 2 #45.
- Плагин `harmonic-detector-viz` — фаза 3 #45.
- cepstral, yamnet, benchmark runner.

---

## Заметки для постановщика

После merge фазы 1: обновить Issue #45 комментарием; фазы 2–3 — отдельные сессии или продолжение того же Issue.
