import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import {
  defaultSampleLibraryPlayerConfig,
  SAMPLE_LIBRARY_PLAYER_PLUGIN_ID,
  type SampleLibraryPlayerPluginConfig,
} from './types';

export function createSampleLibraryPlayerPlugin(): Plugin<SampleLibraryPlayerPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_PLAYER_PLUGIN_ID,
    name: 'Плеер сэмплов',
    description: 'Крупный плеер с осциллограммой для прослушивания сэмплов библиотеки',
    version: '0.1.0',
    active: false,
    config: { ...defaultSampleLibraryPlayerConfig },
    install(_context: ModuleContext<SampleLibraryPlayerPluginConfig>): PluginTeardown {
      return () => {
        /* UI-only plugin; playback hub owned by SampleLibraryModule */
      };
    },
  };
}
