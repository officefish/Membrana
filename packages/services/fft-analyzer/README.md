# @membrana/fft-analyzer-service

FFT-анализатор аудио: спектральный центроид, flux, RMS, детекция по порогам. **Live** (микрофон / `MediaStream`) + **file** (`File` / `Blob` / `AudioBuffer`) в одном API.

Использует [@membrana/audio-engine-service](../audio-engine) для подачи аудио-данных. Сам этот сервис — чисто математический, без Web Audio.

См. соглашения: [SERVICES.md](../../../docs/SERVICES.md).

## Что делает

**Метрики на кадр:**

- Спектральный центроид (Гц)
- Spectral flux (изменение спектра между кадрами)
- RMS амплитуда
- Детекция по порогам — все три метрики должны быть в диапазоне

**Опциональные метрики (advancedAnalysis.enabled):**

- Спектр (Float32Array магнитуд)
- Low-energy percent
- Stability score
- Spectral rolloff, spectral flatness, zero-crossing rate

**Агрегаты по файлу:**

- Statistics: min/max/mean/std по каждой метрике + detection rate
- Temporal patterns: частичная реализация, расширяется (TODO в коде)

## Архитектурное место

- **Роль**: Программист-математик ([VIRTUAL_TEAM_PROMPT](../../../docs/VIRTUAL_TEAM_PROMPT.md)).
- **Зависимости**: `@membrana/core` + `@membrana/audio-engine-service` + React (peer).
- **НЕ зависит от**: agenda / device-board / client / других analyzer-сервисов.

## Структура

```
src/
├── math/                  ← ЧИСТЫЕ функции
│   ├── fft.ts             radix-2 Cooley-Tukey FFT
│   ├── metrics.ts         centroid, flux, RMS, rolloff, flatness, ZCR
│   └── statistics.ts      mean, std, summarize
├── core/
│   └── fft-analyzer.ts    главный класс — принимает кадр от engine, возвращает результат
├── hooks/
│   ├── use-fft-analyzer.ts             универсальный
│   ├── use-fft-file-analyzer.ts        batch для файлов
│   └── use-fft-microphone-analyzer.ts  сахар над микрофоном
├── constants.ts           DEFAULT_CONFIG + PRESETS (drone/speech/music)
├── types.ts
└── index.ts               ЕДИНАЯ публичная точка входа
```

## API

| Имя | Тип | Назначение |
|-----|-----|------------|
| `FftAnalyzer` | class | Чистая математика: `analyzeFrame(frame)` / `analyze(samples, sr)` / `analyzeAudioBuffer(buf)` |
| `useFftAnalyzer(options)` | hook | Live (через engine) + analyzeAudioBuffer в одном инстансе |
| `useFftFileAnalyzer(options)` | hook | Только batch-анализ файлов с прогрессом |
| `useFftMicrophoneAnalyzer(options)` | hook | Сахар: автоматически запрашивает микрофон |
| `PRESETS.drone` / `speech` / `music` | const | Готовые наборы порогов |

## Использование (Live, микрофон)

```tsx
import {
  useFftMicrophoneAnalyzer,
  PRESETS,
} from '@membrana/fft-analyzer-service';

function DroneDetector() {
  const { isRunning, lastFrame, start, stop } = useFftMicrophoneAnalyzer({
    config: PRESETS.drone,
    onFrame: (f) => {
      if (f.isDetected) console.log('Drone detected!', f);
    },
  });

  return (
    <div>
      <button onClick={isRunning ? stop : start}>
        {isRunning ? 'Stop' : 'Start microphone'}
      </button>
      {lastFrame && (
        <div>
          Centroid: {lastFrame.centroid.toFixed(1)} Hz |{' '}
          Detected: {lastFrame.isDetected ? '✅' : '❌'}
        </div>
      )}
    </div>
  );
}
```

## Использование (анализ файла)

```tsx
import { useFftFileAnalyzer } from '@membrana/fft-analyzer-service';

function FileAnalyzer() {
  const { isAnalyzing, progress, result, analyze } = useFftFileAnalyzer();

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

## Без React

```ts
import { FftAnalyzer, PRESETS } from '@membrana/fft-analyzer-service';
import { loadAudioBuffer } from '@membrana/audio-engine-service';

const analyzer = new FftAnalyzer(PRESETS.drone);

// Live (например, из AudioWorklet, где у тебя уже есть Float32Array):
const result = analyzer.analyze(samples, 48_000);

// File:
const buffer = await loadAudioBuffer(file);
const fileResult = await analyzer.analyzeAudioBuffer(buffer, (p) => console.log(p));
```

## Definition of Done

- [x] Ядро `src/math/` без React / DOM / Web Audio.
- [x] `FftAnalyzer` принимает `AudioSampleFrame` от engine, сам не управляет Web Audio.
- [x] Хуки только обвязка.
- [x] Engine отделён в `@membrana/audio-engine-service`.
- [ ] Полная реализация `temporalPatterns` — TODO.
- [ ] Unit-тесты на FFT (синус, импульс, тишина) — TODO.

## История

- **0.1.0**: разделение сервиса. Web Audio infrastructure переехала в `@membrana/audio-engine-service`. Класс `AudioAnalyzer` переименован в `FftAnalyzer`. Хуки переименованы с префиксом `useFft*`. Старые имена оставлены как deprecated re-export'ы.
