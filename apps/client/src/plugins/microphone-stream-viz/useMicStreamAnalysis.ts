import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  LiveSampler,
  type AudioSampleFrame,
} from '@membrana/audio-engine-service';
import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

/**
 * useMicStreamAnalysis — анализ MediaStream из модуля «Микрофон».
 *
 * Архитектурно:
 *  1. Подписывается на hub модуля «Микрофон» и получает MediaStream.
 *  2. Поднимает на этом stream `LiveSampler` из `@membrana/audio-engine-service`.
 *     Никакого ручного `new AudioContext()` / `createAnalyser` / RAF здесь нет —
 *     engine отвечает за весь жизненный цикл Web Audio.
 *  3. На каждый `AudioSampleFrame` считает метрики (volume, waveform, spectrum)
 *     — это уже ЧИСТАЯ математика над Float32Array.
 *  4. Параллельно выставляет `analyserRef` на тот же AnalyserNode, что
 *     использует engine, чтобы виджеты `@membrana/audio-data-viz`
 *     (`LiveFftBarsCanvas`, `LiveSpectrumLineCanvas`) могли рендериться напрямую,
 *     не дублируя AnalyserNode.
 */

const WF_LEN = 200;
const SPEC_BARS = 32;
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

const initialMetrics = {
  volume: 0,
  qualityScore: 0,
  snr: 0,
  noise: 0,
  waveformData: Array.from({ length: WF_LEN }, () => 0),
  spectrumData: Array.from({ length: SPEC_BARS }, () => 0),
};

export type MicStreamMetrics = typeof initialMetrics;

export function useMicStreamAnalysis(moduleId: string): {
  live: boolean;
  metrics: MicStreamMetrics;
  analyserRef: MutableRefObject<AnalyserNode | null>;
} {
  const [live, setLive] = useState(false);
  const [metrics, setMetrics] = useState<MicStreamMetrics>(initialMetrics);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeSampler: LiveSampler | null = null;

    const teardown = async (): Promise<void> => {
      analyserRef.current = null;
      if (activeSampler) {
        const s = activeSampler;
        activeSampler = null;
        await s.stop();
      }
    };

    const unlisten = subscribeMicrophoneStream(moduleId, (stream) => {
      // На любую смену потока — останавливаем текущий sampler.
      void teardown().then(() => {
        if (cancelled) return;

        if (!stream || stream.getAudioTracks().length === 0) {
          setLive(false);
          setMetrics(initialMetrics);
          return;
        }

        const sampler = new LiveSampler({
          bufferSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
        });
        activeSampler = sampler;

        sampler.on('frame', (frame: AudioSampleFrame) => {
          if (cancelled) return;
          const samples = frame.samples;

          // RMS — чистая математика на временных данных engine'а.
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            sum += samples[i]! * samples[i]!;
          }
          const rms = Math.min(1, Math.sqrt(sum / samples.length) * 2.5);

          // Waveform — даунсэмплинг временного буфера в WF_LEN точек.
          const waveformData: number[] = new Array(WF_LEN);
          const step = samples.length / WF_LEN;
          for (let i = 0; i < WF_LEN; i++) {
            const idx = Math.min(samples.length - 1, Math.floor(i * step));
            waveformData[i] = samples[idx]!;
          }

          // Spectrum — берём из AnalyserNode engine'а (он уже посчитал FFT).
          const an = sampler.getAnalyserNode();
          let spectrumData: number[];
          if (an) {
            const freqData = new Uint8Array(an.frequencyBinCount);
            an.getByteFrequencyData(freqData);
            spectrumData = new Array(SPEC_BARS);
            const binsPerBar = Math.max(1, Math.floor(freqData.length / SPEC_BARS));
            for (let b = 0; b < SPEC_BARS; b++) {
              let max = 0;
              const start = b * binsPerBar;
              for (let j = 0; j < binsPerBar && start + j < freqData.length; j++) {
                max = Math.max(max, freqData[start + j]! / 255);
              }
              spectrumData[b] = max;
            }
          } else {
            spectrumData = initialMetrics.spectrumData;
          }

          const q = calculateQuality(rms);
          setMetrics({
            volume: rms,
            qualityScore: q.qualityScore,
            snr: q.snr,
            noise: q.noise,
            waveformData,
            spectrumData,
          });
        });

        sampler.on('start', () => {
          if (cancelled) return;
          // Виджеты audio-data-viz получают тот же AnalyserNode, что и hook.
          analyserRef.current = sampler.getAnalyserNode();
          setLive(true);
        });

        sampler.on('stop', () => {
          if (cancelled) return;
          analyserRef.current = null;
          setLive(false);
        });

        sampler.on('error', () => {
          if (cancelled) return;
          analyserRef.current = null;
          setLive(false);
          setMetrics(initialMetrics);
        });

        // Передаём готовый MediaStream из hub — engine не запрашивает микрофон повторно.
        void sampler.start(stream).catch(() => undefined);
      });
    });

    return () => {
      cancelled = true;
      unlisten();
      void teardown();
      setLive(false);
      setMetrics(initialMetrics);
    };
  }, [moduleId]);

  return { live, metrics, analyserRef };
}
