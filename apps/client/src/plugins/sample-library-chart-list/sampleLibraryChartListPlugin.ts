import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import {
  defaultSampleLibraryChartListConfig,
  SAMPLE_LIBRARY_CHART_LIST_PLUGIN_ID,
  type SampleLibraryChartListPluginConfig,
} from './types';

export function createSampleLibraryChartListPlugin(): Plugin<SampleLibraryChartListPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_CHART_LIST_PLUGIN_ID,
    name: 'Отбор чарт-листа',
    description: 'Отбор звуков текущего набора по объёму, критерию и промежутку дат (#2110)',
    version: '0.1.0',
    active: false,
    config: { ...defaultSampleLibraryChartListConfig },
    install(_context: ModuleContext<SampleLibraryChartListPluginConfig>): PluginTeardown {
      return () => {
        /* UI-only plugin: отбор считает витрина media, панель лишь заказывает и показывает */
      };
    },
  };
}
