import type { MediaLibraryCaptureFormat } from '@membrana/media-library-service';

import { encodeWavPcm16 } from './encodeWav';
import { resolveMediaRecorderMime } from './recordingUtils';
import { WAV_SAMPLE_RATE } from './types';

export interface ClipResult {
  readonly blob: Blob;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly channels: 1;
}

export interface ActiveClipRecorder {
  stop(): Promise<ClipResult>;
  cancel(): void;
}

function startWavRecorder(stream: MediaStream): ActiveClipRecorder {
  const ctx = new AudioContext({ sampleRate: WAV_SAMPLE_RATE });
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const pcmChunks: Float32Array[] = [];

  processor.onaudioprocess = (event) => {
    pcmChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(ctx.destination);

  const mergeSamples = (): Float32Array => {
    const total = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  };

  const teardownGraph = (): void => {
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
  };

  return {
    async stop(): Promise<ClipResult> {
      teardownGraph();
      const samples = mergeSamples();
      const sampleRate = ctx.sampleRate;
      const durationSec = samples.length / sampleRate;
      const blob = encodeWavPcm16(samples, sampleRate);
      await ctx.close();
      return { blob, durationSec, sampleRate, channels: 1 };
    },
    cancel(): void {
      teardownGraph();
      void ctx.close();
    },
  };
}

function startMediaRecorderClip(
  stream: MediaStream,
  format: 'webm' | 'mp4',
): ActiveClipRecorder {
  const mime = resolveMediaRecorderMime(format);
  let recorder: MediaRecorder;
  try {
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch {
    throw new Error(`Формат ${format.toUpperCase()} недоступен в этом браузере`);
  }

  const chunks: Blob[] = [];
  const startedAtMs = performance.now();

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(250);

  return {
    stop(): Promise<ClipResult> {
      return new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const durationSec = (performance.now() - startedAtMs) / 1000;
          const type = recorder.mimeType || mime || 'audio/webm';
          resolve({
            blob: new Blob(chunks, { type }),
            durationSec,
            sampleRate: WAV_SAMPLE_RATE,
            channels: 1,
          });
        };
        recorder.onerror = () => reject(new Error('Ошибка MediaRecorder'));
        if (recorder.state !== 'inactive') recorder.stop();
      });
    },
    cancel(): void {
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}

export function startClipRecorder(
  stream: MediaStream,
  format: MediaLibraryCaptureFormat,
): ActiveClipRecorder {
  if (format === 'wav') return startWavRecorder(stream);
  return startMediaRecorderClip(stream, format);
}
