# @membrana/audio-analyzer-service

Унифицированный сервис анализа аудио. Объединяет **live-режим** (микрофон / `MediaStream`) и **file-режим** (`File` / `Blob` / `AudioBuffer`) в одном API.

Эталонный пример сервиса по [SERVICES.md](../../../docs/SERVICES.md).

## Что делает

**Метрики на кадр:**

- Спектральный центроид (Гц)
- Spectral flux (изменение спектра между кадрами)
- RMS амплитуда
- Детекция по порогам — все три метрики должны быть в диапазоне

**Опционально (advancedAnalysis.enabled):**

- Спектр (Float32Array магнитуд)
- Low-energy percent (доля энергии в нижней 1/10 спектра)
- Stability score
- Spectral rolloff, spectral flatness, zero-crossing rate

**Агрегаты по файлу:**

- Statistics: min/max/mean/std по каждой метрике + detection rate
- Temporal patterns: частичная реализация, расширяется поэтапно (TODO в коде)

## Архитектурное место

- **Роли**: Программист-математик ([VIRTUAL_TEAM_PROMPT](../../../docs/VIRTUAL_TEAM_PROMPT.md)) — `src/math/`. Программист-музыкант — `src/core/` (engine, Web Audio).
- **Зависимости**: только `@membrana/core` + React (peer).
- **НЕ зависит от**: других сервисов, agenda / device-board / client.

## Слои внутри пакета

```
src/
├── math/                  ← ЧИСТЫЕ функции (нет React/DOM/Web Audio)
│   ├── fft.ts             radix-2 Cooley-Tukey FFT
│   ├── metrics.ts         centroid, flux, RMS, rolloff, flatness, ZCR
│   └── statistics.ts      mean, std, summarize
├── core/                  ← engine: Web Audio + жизненный цикл
│   ├── audio-analyzer.ts  главный класс AudioAnalyzer
│   └── audio-helpers.ts   createAudioContext, loadAudioBuffer
├── hooks/                 ← тонкие React-обёртки
│   ├── use-audio-analyzer.ts        универсальный
│   ├── use-file-analyzer.ts         batch для файлов
│   └── use-microphone-analyzer.ts   сахар над микрофоном
├── constants.ts           DEFAULT_CONFIG + PRESETS (drone/speech/music)
├── types.ts               все публичные типы
└── index.ts               ЕДИНАЯ публичная точка входа
```

## API

### Главное

| Имя | Тип | Назначение |
|-----|-----|------------|
| `AudioAnalyzer` | class | Engine с live и file режимами, события `start` / `stop` / `frame` / `error` |
| `useAudioAnalyzer(options)` | hook | Универсальный: live + analyzeFile в одном инстансе |
| `useFileAnalyzer(options)` | hook | Только batch-анализ файлов с прогрессом |
| `useMicrophoneAnalyzer(options)` | hook | Сахар: автоматически запрашивает микрофон |

### Конфигурация

| Имя | Назначение |
|-----|------------|
| `AudioAnalyzerConfig` | Полная конфигурация: fftSize, smoothing, пороги, liveMode, advancedAnalysis |
| `DEFAULT_CONFIG` | Безопасные дефолты (2048 / 0.8 / drone-пороги) |
| `PRESETS.drone` | Пороги для детекции дрона (центроид 200–800 Hz) |
| `PRESETS.speech` | Пороги для речи (центроид 300–3000 Hz) |
| `PRESETS.music` | fftSize 4096, smoothing 0.6, расширенные пороги |
| `applyPreset(partial)` | Слить partial поверх DEFAULT_CONFIG (immutable merge) |

### Чистая математика

| Имя | Назначение |
|-----|------------|
| `FftCore` | radix-2 FFT с прекомпьютом twiddles и окном Хэмминга |
| `SpectralFluxTracker` | Stateful flux: хранит предыдущий спектр |
| `spectralCentroid`, `rms`, `lowEnergyPercent` | Pure-функции |
| `spectralRolloff`, `spectralFlatness`, `zeroCrossingRate` | Pure-функции |
| `applyFrequencyFilter` | Зануляет бины вне диапазона |
| `mean`, `std`, `minOf`, `maxOf`, `summarize` | Статистика |

## Использование

### Live-режим (микрофон)

```tsx
import { useMicrophoneAnalyzer, PRESETS } from '@membrana/audio-analyzer-service';

function DroneDetector() {
  const { isActive, lastFrame, start, stop } = useMicrophoneAnalyzer({
    config: PRESETS.drone,
    onFrame: (f) => {
      if (f.isDetected) console.log('Drone detected!', f);
    },
  });

  return (
    <div>
      <button onClick={isActive ? stop : start}>
        {isActive ? 'Stop' : 'Start microphone'}
      </button>
      {lastFrame && (
        <div>
          <div>Centroid: {lastFrame.centroid.toFixed(1)} Hz</div>
          <div>Flux: {lastFrame.flux.toFixed(3)}</div>
          <div>RMS: {lastFrame.rms.toFixed(3)}</div>
          <div>Detected: {lastFrame.isDetected ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  );
}
```

### Анализ файла

```tsx
import { useFileAnalyzer } from '@membrana/audio-analyzer-service';

function FileAnalyzer() {
  const { isAnalyzing, progress, result, analyze } = useFileAnalyzer({
    config: { advancedAnalysis: { enabled: true, calculateStatistics: true, calculateSpectrum: false, calculateTemporalPatterns: true } },
  });

  return (
    <div>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
      />
      {isAnalyzing && <progress value={progress} max={1} />}
      {result?.statistics && (
        <div>Detection rate: {(result.statistics.detectionRate * 100).toFixed(1)}%</div>
      )}
    </div>
  );
}
```

### Без React (Node / тесты / Web Worker)

```ts
import { AudioAnalyzer, PRESETS } from '@membrana/audio-analyzer-service';

const analyzer = new AudioAnalyzer(PRESETS.drone);

// В Web Worker / AudioWorklet, имея Float32Array:
const frame = analyzer.analyzeBuffer(samples, 48_000);
console.log(frame.isDetected, frame.centroid);
```

### Чистая математика

```ts
import { FftCore, spectralCentroid } from '@membrana/audio-analyzer-service';

const fft = new FftCore(2048);
const magnitudes = fft.computeMagnitudes(samples);
const frequencies = fft.computeFrequencies(48_000);
const centroid = spectralCentroid(magnitudes, frequencies);
```

## Самостоятельная разработка

```bash
yarn workspace @membrana/audio-analyzer-service dev       # playground (порт 5174)
yarn workspace @membrana/audio-analyzer-service build     # dist/ + types
yarn workspace @membrana/audio-analyzer-service test
yarn workspace @membrana/audio-analyzer-service typecheck
```

## Definition of Done

- [x] Ядро `src/math/` без React / DOM / Web Audio.
- [x] Engine `src/core/audio-analyzer.ts` использует Web Audio только здесь — изолированно.
- [x] Хуки в `src/hooks/` только обвязка без бизнес-логики.
- [x] Единая публичная точка `src/index.ts`.
- [x] Объединение live и file в один API (по решению из ревью DeepSeek).
- [ ] Полная реализация `temporalPatterns` (envelope shape, periodicity, jumps) — TODO.
- [ ] Unit-тесты на FFT (синус, импульс, тишина) — TODO.
- [ ] Опциональный AudioWorklet для off-main-thread обработки — TODO.

## История

- **0.1.0**: переименован из `fft-analyzer-service`. Объединены `AudioFFTAnalysisService` + `UnifiedAudioAnalyzer` в один класс `AudioAnalyzer` (решение из ревью DeepSeek). Добавлены пресеты, расширенные метрики, three React-хука.
