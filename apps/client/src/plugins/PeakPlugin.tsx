import { Plugin, ModuleContext } from '@membrana/agenda';

export const PeakPlugin: Plugin = {
  id: 'peak-detector',
  name: 'Пиковый детектор',
  description: 'Обнаружение пиков в спектре',
  version: '1.0.0',
  active: true,
  install: async (context: ModuleContext) => {
    console.log(`Peak detector installed for module ${context.moduleId}`);
    
    context.updateConfig({
      peakThreshold: 0.8,
      showPeaks: true
    });
  }
};