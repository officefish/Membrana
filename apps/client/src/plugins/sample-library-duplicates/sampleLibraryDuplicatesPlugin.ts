import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import {
  defaultSampleLibraryDuplicatesConfig,
  SAMPLE_LIBRARY_DUPLICATES_PLUGIN_ID,
  type SampleLibraryDuplicatesPluginConfig,
} from './types';

export function createSampleLibraryDuplicatesPlugin(): Plugin<SampleLibraryDuplicatesPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_DUPLICATES_PLUGIN_ID,
    name: 'Дубли набора',
    description: 'Пары похожих проб текущего набора: послушать подряд, удалить только по клику (#2109)',
    version: '0.1.0',
    active: false,
    config: { ...defaultSampleLibraryDuplicatesConfig },
    install(_context: ModuleContext<SampleLibraryDuplicatesPluginConfig>): PluginTeardown {
      return () => {
        /* UI-only plugin: пары считает витрина media, панель показывает и ждёт слова человека */
      };
    },
  };
}
