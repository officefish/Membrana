import type { AudioFrameFeed, FrameHandler } from './types';

const graphFeedRegistry = new Map<string, AudioFrameFeed>();

/** Регистрация feed для device-board D1 (stub registry). */
export function registerGraphFrameFeed(handleId: string, feed: AudioFrameFeed): void {
  graphFeedRegistry.set(handleId, feed);
}

export function unregisterGraphFrameFeed(handleId: string): void {
  graphFeedRegistry.delete(handleId);
}

export function createGraphFrameFeed(handleId: string): AudioFrameFeed {
  const registered = graphFeedRegistry.get(handleId);
  if (registered) return registered;

  return {
    sourceKind: 'graph',

    subscribe(_handler: FrameHandler): () => void {
      return () => undefined;
    },

    async start(): Promise<void> {
      throw new Error(
        `Graph frame feed не подключён (handle: "${handleId}"). Ожидается device-board D1.`,
      );
    },

    async stop(): Promise<void> {
      // no-op
    },
  };
}
