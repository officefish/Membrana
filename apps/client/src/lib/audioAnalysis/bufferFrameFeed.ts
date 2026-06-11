import type { AudioFrameFeed, BufferFrameFeedOptions, FrameHandler } from './types';
import { extractBufferFrames } from './extractBufferFrames';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createBufferFrameFeed(options: BufferFrameFeedOptions): AudioFrameFeed {
  const {
    buffer,
    bufferSize,
    hopSize,
    emitIntervalMs = 0,
    timestampStepMs,
    maxAnalysisDurationSec,
    onStart,
    onStop,
    onError,
  } = options;

  const handlers = new Set<FrameHandler>();
  let aborted = false;
  let running = false;
  let scanTask: Promise<void> | null = null;

  const emit = (frame: Parameters<FrameHandler>[0]): void => {
    for (const handler of handlers) {
      handler(frame);
    }
  };

  const runScan = async (): Promise<void> => {
    if (running) return;
    running = true;
    aborted = false;
    onStart?.();

    try {
      const frames: Parameters<FrameHandler>[0][] = [];
      extractBufferFrames(
        { buffer, bufferSize, hopSize, timestampStepMs, maxAnalysisDurationSec },
        (frame) => frames.push(frame),
        () => aborted,
      );

      if (frames.length === 0) {
        onError?.(new Error('AudioBuffer слишком короткий для анализа'));
        return;
      }

      for (const frame of frames) {
        if (aborted) break;
        emit(frame);
        if (emitIntervalMs > 0) {
          await delay(emitIntervalMs);
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      running = false;
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
      aborted = false;
      scanTask = runScan();
      await scanTask;
    },

    async stop(): Promise<void> {
      aborted = true;
      if (scanTask) {
        await scanTask.catch(() => undefined);
      }
      scanTask = null;
    },
  };
}
