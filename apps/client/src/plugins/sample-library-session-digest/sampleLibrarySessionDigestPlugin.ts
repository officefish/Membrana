import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import {
  defaultSampleLibrarySessionDigestConfig,
  SAMPLE_LIBRARY_SESSION_DIGEST_PLUGIN_ID,
  type SampleLibrarySessionDigestPluginConfig,
} from './types';

export function createSampleLibrarySessionDigestPlugin(): Plugin<SampleLibrarySessionDigestPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_SESSION_DIGEST_PLUGIN_ID,
    name: 'Разбор сеанса',
    description: 'Двадцать опорных звуков ночи и негативный материал — с прослушиванием (#2039)',
    version: '0.1.0',
    active: false,
    config: { ...defaultSampleLibrarySessionDigestConfig },
    install(_context: ModuleContext<SampleLibrarySessionDigestPluginConfig>): PluginTeardown {
      return () => {
        /* UI-only plugin: свод считает отчёт на media, панель заказывает окно и показывает */
      };
    },
  };
}
