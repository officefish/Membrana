import { getMonoChannel } from '@membrana/audio-engine-service';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';

export interface ExtractBufferFramesOptions {
  readonly buffer: AudioBuffer;
  readonly bufferSize: number;
  readonly hopSize?: number;
  readonly timestampStepMs?: number;
  readonly originTimestampMs?: number;
}

/**
 * Нарезает AudioBuffer на последовательность AudioSampleFrame (offline-scan).
 * Возвращает число эмитированных кадров.
 */
export function extractBufferFrames(
  options: ExtractBufferFramesOptions,
  onFrame: (frame: AudioSampleFrame) => void,
  isAborted: () => boolean = () => false,
): number {
  const {
    buffer,
    bufferSize,
    hopSize = bufferSize,
    timestampStepMs,
    originTimestampMs = Date.now(),
  } = options;

  const mono = getMonoChannel(buffer);
  const sampleRate = buffer.sampleRate;
  const hopDurationMs = (hopSize / sampleRate) * 1000;
  const stepMs = timestampStepMs ?? hopDurationMs;

  let frameIndex = 0;
  for (let offset = 0; offset + bufferSize <= mono.length; offset += hopSize) {
    if (isAborted()) break;
    const slice = mono.subarray(offset, offset + bufferSize);
    onFrame({
      samples: new Float32Array(slice),
      sampleRate,
      timestamp: originTimestampMs + frameIndex * stepMs,
    });
    frameIndex += 1;
  }

  return frameIndex;
}
