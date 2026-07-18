import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import {
  MIC_DETECTOR_SCOREBOARD_PLUGIN_ID,
  defaultMicDetectorScoreboardConfig,
  type MicDetectorScoreboardPluginConfig,
} from './types';

/**
 * Витрина качества детекции (эпик detector-scoreboard, Ф1).
 *
 * Плагин НИЧЕГО НЕ СЧИТАЕТ: показывает измеренное. Живого потока не слушает,
 * поэтому install/teardown пустые — это сознательно, а не заготовка. Замеры
 * приходят из прогонов бенчмарка, витрина их предъявляет.
 */
export function createMicDetectorScoreboardPlugin(): Plugin<MicDetectorScoreboardPluginConfig> {
  return {
    id: MIC_DETECTOR_SCOREBOARD_PLUGIN_ID,
    name: 'Качество детекции',
    description:
      'Таблица рабочих точек детекторов: обнаружено дронов, ложных тревог, интервал',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicDetectorScoreboardConfig },
    install(_context: ModuleContext<MicDetectorScoreboardPluginConfig>): PluginTeardown {
      return () => {};
    },
  };
}
