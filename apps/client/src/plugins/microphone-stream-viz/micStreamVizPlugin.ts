import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import {
  MIC_STREAM_VIZ_PLUGIN_ID,
  defaultMicStreamVizConfig,
  type MicStreamVizPluginConfig,
} from './types';

/**
 * Плагин модуля «Микрофон»: визуализация входящего потока.
 *
 * UI и анализ потока живут в {@link MicStreamVizPluginPanel} и
 * {@link useMicStreamAnalysis}. На текущей итерации подписки на
 * `microphoneStreamHub` находятся в UI-хуке, потому что он удерживает
 * `analyserRef` для виджетов `@membrana/audio-data-viz`.
 *
 * Lifecycle store ВКЛЮЧЁН: `install` вызывается при активации плагина,
 * teardown (если будет возвращён) — при деактивации. Сейчас install
 * выполняет только инициализацию состояния плагина и оставляет teardown
 * на случай будущих подписок engine-уровня.
 */
export function createMicStreamVizPlugin(): Plugin<MicStreamVizPluginConfig> {
  return {
    id: MIC_STREAM_VIZ_PLUGIN_ID,
    name: 'Визуализация потока',
    description:
      'Громкость, качество, осциллограмма, спектр, FFT-столбики и кривая спектра',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicStreamVizConfig },
    install(_context: ModuleContext<MicStreamVizPluginConfig>): PluginTeardown {
      // Инициализация на стороне плагина (нет долгоживущих подписок здесь).
      // Подписка на microphoneStreamHub живёт в useMicStreamAnalysis (UI-хук),
      // так как ему нужен AnalyserNode для виджетов audio-data-viz.
      return () => {
        // Teardown: место для очистки ресурсов engine-уровня, когда плагин
        // будет переведён на install-pattern полностью.
      };
    },
  };
}
