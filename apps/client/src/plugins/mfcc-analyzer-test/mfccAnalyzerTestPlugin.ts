/**
 * Фабрика плагина в форме реестра. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-wiring`.
 *
 * ПОЧЕМУ `install` ПОЧТИ ПУСТ, И ЭТО НЕ ЗАГЛУШКА. У соседей по реестру `install` заводит
 * звуковой тракт: подписку на кадры, анализатор, таймеры. Здесь тракт заводит ОПЕРАТОР
 * кнопкой «Старт» на панели, а включение плагина лишь показывает саму панель. Прибор
 * разведки не должен считать в фоне: серия — это акт, у неё есть начало и конец, и начинает
 * их человек.
 *
 * Поэтому жизненный цикл живёт в `installMfccAnalyzerTest`, который зовёт панель, а
 * `install` реестра снимать нечего — он и не снимает.
 */
import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';

import { MFCC_ANALYZER_TEST_PLUGIN_ID } from './mfccAnalyzerPlugin';
import { DEFAULT_MFCC_CONFIG } from './mfccPluginState';
import { MFCC_PRESET_FIRST_CUT } from './presets';
import type { MfccPluginConfig } from './types';

export function createMfccAnalyzerTestPlugin(): Plugin<MfccPluginConfig> {
  return {
    id: MFCC_ANALYZER_TEST_PLUGIN_ID,
    name: 'Тембровый тест (MFCC)',
    description:
      'Прибор разведки: серия кадров против коридоров калибровки. Ворота — первая прикидка, ' +
      'обстановки не откалиброваны',
    version: '0.1.0',
    active: false,
    // Конфиг объявлен в форме реестра, но панель его пока НЕ читает: она держит своё
    // состояние и между сессиями его не хранит. Заём назван структурщиком в разборе блока и
    // оставлен сознательно — прибор тестовый, история и восстановление настроек ему не нужны.
    config: { ...DEFAULT_MFCC_CONFIG },
    install(_context: ModuleContext<MfccPluginConfig>): PluginTeardown {
      // Ничего не заводим — значит нечего и снимать. Пустое снятие честнее выдуманного:
      // фальшивый teardown скрыл бы, что тракт держит не плагин, а панель.
      return () => {};
    },
  };
}

/** Отпечаток, под который прибор собран. Наружу — чтобы модуль подал ту же считалку. */
export const MFCC_ANALYZER_TEST_CONFIG_HASH = MFCC_PRESET_FIRST_CUT.configHash;
