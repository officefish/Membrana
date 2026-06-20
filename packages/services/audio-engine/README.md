# @membrana/audio-engine-service

Фундаментный сервис для работы с аудио. **Не делает анализа** — только поставляет данные потребителям (FFT-, нейросетевые-, LLM-анализаторы).

См. соглашения: [SERVICES.md](../../../docs/SERVICES.md).

## Что делает

- Создание / закрытие `AudioContext` (с учётом WebKit-префиксов).
- Декодирование `File` / `Blob` → `AudioBuffer`.
- Получение микрофона через `getUserMedia`.
- **`LiveSampler`** — превращает `MediaStream` в поток `AudioSampleFrame` через `AnalyserNode` + RAF. Это база для **любого** live-анализатора.
- React-хуки: `useLiveSampler`, `useMicrophone`, `useAudioFile`.

## Чего НЕ делает

- Никакой математики (FFT, спектр, метрики).
- Никаких порогов / детекции.
- Никаких нейросетей / LLM.

Любой анализ — отдельный сервис, зависящий от engine. Примеры:

- `@membrana/fft-analyzer-service` — спектральный анализ через FFT.
- `@membrana/neural-analyzer-service` (планируется) — нейросетевой анализ.
- `@membrana/llm-analyzer-service` (планируется) — анализ через LLM.

## Архитектурное место

- **Слой**: foundation в `packages/services/`.
- **Зависимости**: только `@membrana/core` + React (peer).
- **Зависят от engine**: все аудио-аналитические сервисы.

## API

| Имя | Тип | Назначение |
|-----|-----|------------|
| `LiveSampler` | class | Поток `AudioSampleFrame` из `MediaStream`. События `start`/`stop`/`frame`/`error`. |
| `useLiveSampler(options)` | hook | Подписка на поток с произвольного `MediaStream`. |
| `useMicrophone(options)` | hook | Сахар: автоматически запрашивает микрофон при `start()`. |
| `useAudioFile()` | hook | Декодирование `File`/`Blob` → `AudioBuffer`. |
| `loadAudioBuffer(file)` | fn | Чистая обёртка над `decodeAudioData`. |
| `getMonoChannel(buffer)` | fn | Смешивает каналы в моно. |
| `acquireMicrophone(constraints)` | fn | Запрос `MediaStream` с понятной ошибкой. |
| `releaseMediaStream(stream)` | fn | Остановка всех треков потока. |
| `getAudioInputDevices()` | fn | Список input-устройств для `<select>` микрофона. |
| `AudioSampleFrame` | type | `{ samples: Float32Array, sampleRate, timestamp }` |

### Прямой доступ к AnalyserNode / AudioContext

Некоторые визуализации (например, виджеты из `@membrana/audio-data-viz`) рендерятся **напрямую от Web Audio** через `AnalyserNode`. Чтобы не плодить второй `AudioContext + AnalyserNode` поверх того же потока, engine выставляет свои:

- `LiveSampler.getAnalyserNode(): AnalyserNode | null`
- `LiveSampler.getAudioContext(): AudioContext | null`
- В хуке `useLiveSampler()` они приходят как реактивные поля `analyserNode` / `audioContext`.

Это рекомендованный путь, когда модуль/плагин уже **владеет** `MediaStream` (например, модуль «Микрофон») и хочет рендерить визуализации без дублирования Web Audio.

## Тестирование

- `yarn workspace @membrana/audio-engine-service test` — unit-тесты pure TS (`playback-offset` и др.).
- Скрипт **`vitest run`** без `--passWithNoTests`: пустой прогон = ошибка CI (CRDC D3).
- Web Audio / микрофон — ручная проверка в браузере; headless CI без устройства не блокер.

## Использование анализатором (FFT, нейросеть, LLM)

```tsx
import {
  useMicrophone,
  type AudioSampleFrame,
} from '@membrana/audio-engine-service';

function MyAnalyzer() {
  const handleFrame = useCallback((frame: AudioSampleFrame) => {
    // frame.samples — Float32Array длины bufferSize
    // frame.sampleRate — sample rate (обычно 48000)
    // дальше — ваш анализатор любого типа
  }, []);

  const { state, start, stop } = useMicrophone({
    config: { bufferSize: 2048, smoothingTimeConstant: 0.8 },
    onFrame: handleFrame,
  });

  return (
    <button onClick={state === 'running' ? stop : start}>
      {state === 'running' ? 'Stop' : 'Start mic'}
    </button>
  );
}
```

## Использование с файлом

```tsx
import { useAudioFile, getMonoChannel } from '@membrana/audio-engine-service';

function FileLoader() {
  const { buffer, isLoading, load } = useAudioFile();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const audioBuffer = await load(f);
    const mono = getMonoChannel(audioBuffer);
    // mono — Float32Array, передавайте в любой анализатор
  };

  return <input type="file" accept="audio/*" onChange={onFileChange} />;
}
```

## Конфигурация LiveSampler

| Поле | По умолчанию | Назначение |
|------|--------------|------------|
| `bufferSize` | 2048 | Размер окна выборки (степень двойки). |
| `smoothingTimeConstant` | 0.8 | Сглаживание AnalyserNode (для частотного режима). |

## Definition of Done

- [x] Не зависит от других сервисов monorepo.
- [x] Не делает математики / анализа.
- [x] События LiveSampler работают через типизированный `on/off`.
- [x] Корректное освобождение ресурсов при `stop()` / unmount.
- [ ] AudioWorklet-backend (вместо AnalyserNode) для off-main-thread — TODO.
- [ ] Resampling утилита — TODO.
- [ ] Framing с overlap-add — TODO.
