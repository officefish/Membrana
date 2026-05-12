import { Plugin, ModuleContext } from '@membrana/agenda';

export const WaterfallPlugin: Plugin = {
  id: 'waterfall',
  active: true,
  name: 'Водопад',
  description: '3D визуализация спектра',
  version: '1.0.0',
  install: async (context: ModuleContext) => {
    console.log(`Waterfall plugin installed for module ${context.moduleId}`);
    
    // Можно добавить дополнительные настройки в конфиг модуля
    context.updateConfig({
      showWaterfall: true,
      waterfallOpacity: 0.7
    });
  }
};