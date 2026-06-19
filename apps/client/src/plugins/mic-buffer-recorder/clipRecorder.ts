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

const WAV_CAPTURE_PROCESSOR = 'wav-capture-processor';

/** Inline AudioWorklet — без ScriptProcessorNode (deprecated). */
const WAV_CAPTURE_WORKLET_SOURCE = `
class WavCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel);
    }
    return true;
  }
}
registerProcessor('${WAV_CAPTURE_PROCESSOR}', WavCaptureProcessor);
`;

async function loadWavCaptureWorklet(ctx: AudioContext): Promise<void> {
  const blob = new Blob([WAV_CAPTURE_WORKLET_SOURCE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function startWavRecorder(stream: MediaStream): ActiveClipRecorder {
  const ctx = new AudioContext({ sampleRate: WAV_SAMPLE_RATE });
  const source = ctx.createMediaStreamSource(stream);
  const pcmChunks: Float32Array[] = [];
  let worklet: AudioWorkletNode | null = null;
  let ready = loadWavCaptureWorklet(ctx).then(() => {
    worklet = new AudioWorkletNode(ctx, WAV_CAPTURE_PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });
    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      pcmChunks.push(new Float32Array(event.data));
    };
    source.connect(worklet);
    worklet.connect(ctx.destination);
  });

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
    if (worklet !== null) {
      worklet.port.onmessage = null;
      worklet.disconnect();
      worklet = null;
    }
    source.disconnect();
  };

  return {
    async stop(): Promise<ClipResult> {
      await ready;
      teardownGraph();
      const samples = mergeSamples();
      const sampleRate = ctx.sampleRate;
      const durationSec = samples.length / sampleRate;
      const blob = encodeWavPcm16(samples, sampleRate);
      await ctx.close();
      return { blob, durationSec, sampleRate, channels: 1 };
    },
    cancel(): void {
      void ready.finally(() => {
        teardownGraph();
        void ctx.close();
      });
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
