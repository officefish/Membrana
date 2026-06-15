import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

import type { AudioFrameFeed, FrameHandler, MicFrameFeedOptions } from './types';

export function createMicFrameFeed(options: MicFrameFeedOptions): AudioFrameFeed {
  const {
    moduleId,
    bufferSize,
    smoothingTimeConstant = 0.5,
    onStart,
    onStop,
    onError,
  } = options;

  const handlers = new Set<FrameHandler>();
  let started = false;
  let sampler: LiveSampler | null = null;
  let unlistenStream: (() => void) | null = null;

  const emit = (frame: AudioSampleFrame): void => {
    for (const handler of handlers) {
      handler(frame);
    }
  };

  const stopSampler = async (): Promise<void> => {
    const current = sampler;
    sampler = null;
    if (current) {
      await current.stop();
    }
  };

  const handleStream = async (stream: MediaStream | null): Promise<void> => {
    await stopSampler();
    if (!started) return;

    if (!stream || stream.getAudioTracks().length === 0) {
      onStop?.();
      return;
    }

    const nextSampler = new LiveSampler({
      bufferSize,
      smoothingTimeConstant,
    });
    sampler = nextSampler;

    nextSampler.on('frame', (frame) => {
      if (started) emit(frame);
    });
    nextSampler.on('start', () => {
      onStart?.();
    });
    nextSampler.on('stop', () => {
      onStop?.();
    });
    nextSampler.on('error', (error) => {
      onStop?.();
      onError?.(error);
    });

    try {
      await nextSampler.start(stream);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    sourceKind: 'microphone',

    subscribe(handler: FrameHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    async start(): Promise<void> {
      if (started) return;
      started = true;
      unlistenStream = subscribeMicrophoneStream(moduleId, (stream) => {
        void handleStream(stream);
      });
    },

    async stop(): Promise<void> {
      started = false;
      unlistenStream?.();
      unlistenStream = null;
      await stopSampler();
      onStop?.();
    },
  };
}
