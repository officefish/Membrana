import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

const WF_LEN = 200;
const SPEC_BARS = 32;

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
    let rafId = 0;
    let teardown: (() => void) | null = null;

    const unlisten = subscribeMicrophoneStream(moduleId, (stream) => {
      if (teardown) {
        teardown();
        teardown = null;
      }
      cancelAnimationFrame(rafId);

      if (!stream || stream.getAudioTracks().length === 0) {
        analyserRef.current = null;
        setLive(false);
        setMetrics(initialMetrics);
        return;
      }

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (cancelled) return;
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i]! - 128) / 128;
          sum += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sum / timeData.length) * 2.5);

        const waveformData: number[] = new Array(WF_LEN);
        const step = timeData.length / WF_LEN;
        for (let i = 0; i < WF_LEN; i++) {
          const idx = Math.min(timeData.length - 1, Math.floor(i * step));
          waveformData[i] = (timeData[idx]! - 128) / 128;
        }

        const spectrumData: number[] = new Array(SPEC_BARS);
        const binsPerBar = Math.max(1, Math.floor(freqData.length / SPEC_BARS));
        for (let b = 0; b < SPEC_BARS; b++) {
          let max = 0;
          const start = b * binsPerBar;
          for (let j = 0; j < binsPerBar && start + j < freqData.length; j++) {
            max = Math.max(max, freqData[start + j]! / 255);
          }
          spectrumData[b] = max;
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
        setLive(true);
        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
      void ctx.resume();

      teardown = () => {
        analyserRef.current = null;
        cancelAnimationFrame(rafId);
        rafId = 0;
        try {
          source.disconnect();
        } catch {
          /* ignore */
        }
        void ctx.close();
      };
    });

    return () => {
      cancelled = true;
      analyserRef.current = null;
      cancelAnimationFrame(rafId);
      teardown?.();
      unlisten();
      setLive(false);
      setMetrics(initialMetrics);
    };
  }, [moduleId]);

  return { live, metrics, analyserRef };
}
