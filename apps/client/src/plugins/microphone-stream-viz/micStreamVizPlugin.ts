import type { ModuleContext, Plugin } from '@membrana/agenda';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  defaultMicStreamVizConfig,
  type MicStreamVizPluginConfig,
} from './types';

/**
 * Плагин модуля «Микрофон»: UI и анализ потока вынесены в {@link MicStreamVizPluginPanel}
 * (рендерится модулем при активном плагине). Здесь можно добавить побочные эффекты в install.
 */
export function createMicStreamVizPlugin(): Plugin<MicStreamVizPluginConfig> {
  return {
    id: MIC_STREAM_VIZ_PLUGIN_ID,
    name: 'Визуализация потока',
    description: 'Громкость, качество, осциллограмма и спектр по потоку микрофона',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicStreamVizConfig },
    install(_context: ModuleContext<MicStreamVizPluginConfig>) {
      /* Подписка на поток при необходимости — см. MicStreamVizPluginPanel / useMicStreamAnalysis */
    },
  };
}
