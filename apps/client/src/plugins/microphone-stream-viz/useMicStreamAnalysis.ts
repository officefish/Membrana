import { useSyncExternalStore, type MutableRefObject } from 'react';

import {
  micStreamPluginState,
  type MicStreamMetrics,
} from './micStreamPluginState';

/**
 * useMicStreamAnalysis — тонкий мост между UI-компонентом и singleton-состоянием
 * плагина "microphone-stream-viz".
 *
 * ВСЯ логика (подписка на `microphoneStreamHub`, поднятие `LiveSampler`,
 * подсчёт метрик) живёт в `plugin.install()` (см. `micStreamVizPlugin.ts`).
 * Хук только подписывается на singleton через `useSyncExternalStore` —
 * никакого Web Audio, никакого RAF, никаких подписок на hub здесь нет.
 *
 * См. `docs/MODULE_AND_PLUGIN_UI.md` §0 (Lifecycle `plugin.install()` /
 * teardown).
 */

export type { MicStreamMetrics };

export function useMicStreamAnalysis(_moduleId: string): {
  live: boolean;
  metrics: MicStreamMetrics;
  analyserRef: MutableRefObject<AnalyserNode | null>;
} {
  const snapshot = useSyncExternalStore(
    micStreamPluginState.subscribe,
    micStreamPluginState.getSnapshot,
    micStreamPluginState.getSnapshot,
  );

  return {
    live: snapshot.live,
    metrics: snapshot.metrics,
    // analyserRef стабилен по ссылке: singleton не пересоздаёт holder,
    // меняет только `.current`. Виджеты audio-data-viz читают `.current`
    // на каждом RAF — это работает с любым ref-like объектом.
    analyserRef: snapshot.analyserRef as MutableRefObject<AnalyserNode | null>,
  };
}
