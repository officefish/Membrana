<<<<<<< HEAD
import type {
  ModuleContext,
  Plugin,
  PluginTeardown,
} from '@membrana/agenda';
import {
  LiveSampler,
  type AudioSampleFrame,
} from '@membrana/audio-engine-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

import {
  MIC_SPECTRUM_BARS,
  MIC_WAVEFORM_LEN,
  initialMicStreamMetrics,
  micStreamPluginState,
  type MicStreamMetrics,
} from './micStreamPluginState';
=======
import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
>>>>>>> c8eeaa4 (feat(agenda): registry, plugin lifecycle, client registration)
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  defaultMicStreamVizConfig,
  type MicStreamVizPluginConfig,
} from './types';

/**
 * Плагин модуля «Микрофон»: визуализация входящего потока.
 *
<<<<<<< HEAD
 * АРХИТЕКТУРА (по новому контракту lifecycle из ветки `vesnin`):
 *  - Подписка на `microphoneStreamHub` и поднятие `LiveSampler` живут здесь,
 *    в `install()`. Это вызывается store при первой активации плагина и
 *    при rehydrate, если плагин уже активен.
 *  - Подписки и Web Audio ресурсы инкапсулированы в teardown — store
 *    вызывает его при `deactivatePlugin` / `togglePlugin`-в-выкл.
 *  - UI-компонент (`MicStreamVizPluginPanel` / `useMicStreamAnalysis`)
 *    только читает singleton-state через `useSyncExternalStore` —
 *    не имеет своего AudioContext, никакого Web Audio.
 *
 * См. `docs/MODULE_AND_PLUGIN_UI.md` §0 и `docs/ARCHITECTURE.md` §1c / §1b.
 *
 * ВАЖНО: эта реализация требует, чтобы store вызывал `plugin.install()` при
 * активации (см. коммит c8eeaa4 в ветке vesnin). Без lifecycle install
 * подписка не будет поднята.
=======
 * UI и анализ потока живут в {@link MicStreamVizPluginPanel} и
 * {@link useMicStreamAnalysis}. На текущей итерации подписки на
 * `microphoneStreamHub` находятся в UI-хуке, потому что он удерживает
 * `analyserRef` для виджетов `@membrana/audio-data-viz`.
 *
 * Lifecycle store ВКЛЮЧЁН: `install` вызывается при активации плагина,
 * teardown (если будет возвращён) — при деактивации. Сейчас install
 * выполняет только инициализацию состояния плагина и оставляет teardown
 * на случай будущих подписок engine-уровня.
>>>>>>> c8eeaa4 (feat(agenda): registry, plugin lifecycle, client registration)
 */

const FFT_SIZE = 2048;
const SMOOTHING = 0.75;

function calculateQuality(volume: number): {
  qualityScore: number;
  snr: number;
  noise: number;
} {
  const qualityScore = Math.min(100, Math.max(0, Math.round(volume * 100 + 20)));
  const snr = Math.min(60, Math.max(0, Math.round(volume * 50 + 10)));
  const noise = Math.min(40, Math.max(0, Math.round((1 - volume) * 40)));
  return { qualityScore, snr, noise };
}

function computeMetrics(
  samples: Float32Array,
  analyser: AnalyserNode | null,
): MicStreamMetrics {
  // RMS — чистая математика над временными сэмплами engine'а.
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i]! * samples[i]!;
  }
  const rms = Math.min(1, Math.sqrt(sum / samples.length) * 2.5);

  // Waveform — даунсэмплинг в WF_LEN точек.
  const waveformData: number[] = new Array(MIC_WAVEFORM_LEN);
  const step = samples.length / MIC_WAVEFORM_LEN;
  for (let i = 0; i < MIC_WAVEFORM_LEN; i++) {
    const idx = Math.min(samples.length - 1, Math.floor(i * step));
    waveformData[i] = samples[idx]!;
  }

  // Spectrum — берём из engine'ового AnalyserNode (он уже посчитал FFT).
  let spectrumData: number[];
  if (analyser) {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    spectrumData = new Array(MIC_SPECTRUM_BARS);
    const binsPerBar = Math.max(
      1,
      Math.floor(freqData.length / MIC_SPECTRUM_BARS),
    );
    for (let b = 0; b < MIC_SPECTRUM_BARS; b++) {
      let max = 0;
      const start = b * binsPerBar;
      for (let j = 0; j < binsPerBar && start + j < freqData.length; j++) {
        max = Math.max(max, freqData[start + j]! / 255);
      }
      spectrumData[b] = max;
    }
  } else {
    spectrumData = initialMicStreamMetrics.spectrumData;
  }

  const q = calculateQuality(rms);
  return {
    volume: rms,
    qualityScore: q.qualityScore,
    snr: q.snr,
    noise: q.noise,
    waveformData,
    spectrumData,
  };
}

export function createMicStreamVizPlugin(): Plugin<MicStreamVizPluginConfig> {
  return {
    id: MIC_STREAM_VIZ_PLUGIN_ID,
    name: 'Визуализация потока',
    description:
      'Громкость, качество, осциллограмма, спектр, FFT-столбики и кривая спектра',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicStreamVizConfig },
<<<<<<< HEAD
    install(context: ModuleContext<MicStreamVizPluginConfig>): PluginTeardown {
      let currentSampler: LiveSampler | null = null;
      let disposed = false;

      const stopSampler = (): Promise<void> => {
        const s = currentSampler;
        currentSampler = null;
        micStreamPluginState.setAnalyserNode(null);
        micStreamPluginState.setLive(false);
        micStreamPluginState.setMetrics(initialMicStreamMetrics);
        return s ? s.stop() : Promise.resolve();
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !currentSampler) return;
        const analyser = currentSampler.getAnalyserNode();
        micStreamPluginState.setMetrics(computeMetrics(frame.samples, analyser));
      };

      // Подписка на shared-hub микрофонного модуля. Replay даёт стартовое
      // значение сразу при подписке — см. `microphoneStreamHub.ts`.
      const unlisten = subscribeMicrophoneStream(
        context.moduleId,
        (stream) => {
          // Любая смена потока — останавливаем старый sampler.
          void stopSampler().then(() => {
            if (disposed) return;

            if (!stream || stream.getAudioTracks().length === 0) return;

            const sampler = new LiveSampler({
              bufferSize: FFT_SIZE,
              smoothingTimeConstant: SMOOTHING,
            });
            currentSampler = sampler;

            sampler.on('frame', handleFrame);
            sampler.on('start', () => {
              if (disposed) return;
              micStreamPluginState.setAnalyserNode(sampler.getAnalyserNode());
              micStreamPluginState.setLive(true);
            });
            sampler.on('stop', () => {
              micStreamPluginState.setAnalyserNode(null);
              micStreamPluginState.setLive(false);
            });
            sampler.on('error', () => {
              micStreamPluginState.setAnalyserNode(null);
              micStreamPluginState.setLive(false);
              micStreamPluginState.setMetrics(initialMicStreamMetrics);
            });

            // Передаём готовый MediaStream из hub — engine не запрашивает
            // микрофон повторно.
            void sampler.start(stream).catch(() => undefined);
          });
        },
      );

      // Teardown: вызывается store при deactivatePlugin.
      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          micStreamPluginState.reset();
        });
=======
    install(_context: ModuleContext<MicStreamVizPluginConfig>): PluginTeardown {
      // Инициализация на стороне плагина (нет долгоживущих подписок здесь).
      // Подписка на microphoneStreamHub живёт в useMicStreamAnalysis (UI-хук),
      // так как ему нужен AnalyserNode для виджетов audio-data-viz.
      return () => {
        // Teardown: место для очистки ресурсов engine-уровня, когда плагин
        // будет переведён на install-pattern полностью.
>>>>>>> c8eeaa4 (feat(agenda): registry, plugin lifecycle, client registration)
      };
    },
  };
}
