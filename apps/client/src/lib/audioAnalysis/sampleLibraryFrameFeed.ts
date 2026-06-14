import {
  getSamplePlaybackSnapshot,
  loadSampleBufferById,
  subscribeSamplePlayback,
} from '@membrana/sample-playback-service';

import { createBufferFrameFeed } from './bufferFrameFeed';
import type { AudioFrameFeed, FrameHandler, SampleLibraryFrameFeedOptions } from './types';

export function createSampleLibraryFrameFeed(
  options: SampleLibraryFrameFeedOptions,
): AudioFrameFeed {
  const {
    bufferSize,
    hopSize,
    emitIntervalMs,
    timestampStepMs,
    maxAnalysisDurationSec,
    onStart,
    onStop,
    onError,
  } = options;

  const handlers = new Set<FrameHandler>();
  let inner: AudioFrameFeed | null = null;
  let innerUnsub: (() => void) | null = null;
  let hubUnsub: (() => void) | null = null;
  let started = false;
  let scanGeneration = 0;

  const forward = (frame: Parameters<FrameHandler>[0]): void => {
    for (const handler of handlers) {
      handler(frame);
    }
  };

  const teardownInner = async (): Promise<void> => {
    innerUnsub?.();
    innerUnsub = null;
    if (inner) {
      await inner.stop();
      inner = null;
    }
  };

  const runScanForSelectedSample = async (): Promise<void> => {
    const generation = ++scanGeneration;
    await teardownInner();
    if (!started || generation !== scanGeneration) return;

    const sampleId = getSamplePlaybackSnapshot().selectedSampleId;
    if (!sampleId) {
      onError?.(new Error('Сэмпл не выбран в библиотеке'));
      onStop?.();
      return;
    }

    try {
      const buffer = await loadSampleBufferById(sampleId);
      if (!started || generation !== scanGeneration) return;

      inner = createBufferFrameFeed({
        buffer,
        bufferSize,
        hopSize,
        emitIntervalMs,
        timestampStepMs,
        maxAnalysisDurationSec,
        onStart,
        onStop,
        onError,
      });
      innerUnsub = inner.subscribe(forward);
      await inner.start();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      onStop?.();
    }
  };

  return {
    sourceKind: 'sample-library',

    subscribe(handler: FrameHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    async start(): Promise<void> {
      if (started) return;
      started = true;
      hubUnsub = subscribeSamplePlayback(() => {
        if (!started) return;
        void runScanForSelectedSample();
      });
      await runScanForSelectedSample();
    },

    async stop(): Promise<void> {
      started = false;
      scanGeneration += 1;
      hubUnsub?.();
      hubUnsub = null;
      await teardownInner();
      onStop?.();
    },
  };
}
