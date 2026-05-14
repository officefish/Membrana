import { MembranaRegistry } from '@membrana/agenda';
import { createMicStreamVizPlugin } from '../plugins/microphone-stream-viz';

/**
 * Регистрация всех клиентских модулей и плагинов.
 *
 * КАНОНИЧЕСКИЙ путь — только через `MembranaRegistry`. Прямые вызовы
 * `useMembranaStore.getState().registerModule(...)` запрещены — см.
 * `docs/MODULE_AND_PLUGIN_UI.md` (раздел «Регистрация модулей и lazy-loading»).
 *
 * Все модули регистрируются как **lazy** — чанк Vite приходит только когда
 * `ModuleRenderer` (`@membrana/agenda`) монтирует выбранный модуль.
 *
 * Вызывается ОДИН раз в `apps/client/src/main.tsx` при загрузке приложения.
 */
export function registerClientModules(): void {
  MembranaRegistry.registerLazyModule({
    id: 'fft-analyzer',
    name: 'FFT Анализатор',
    description: 'Быстрое преобразование Фурье для анализа частот',
    version: '1.0.0',
    category: 'Анализ',
    enabled: true,
    activePlugins: [],
    defaultConfig: {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -100,
      maxDecibels: -30,
    },
    loader: () =>
      import('./FFTModule').then((m) => ({ default: m.FFTModule })),
  });

  MembranaRegistry.registerLazyModule({
    id: 'spectrum-3d',
    name: '3D Спектрограмма',
    description: 'Трехмерная визуализация спектра',
    version: '1.0.0',
    category: 'Визуализация',
    enabled: false,
    activePlugins: [],
    defaultConfig: {
      colormap: 'viridis',
      showGrid: true,
      persistence: 0.5,
    },
    loader: () =>
      import('./SpectrumModule').then((m) => ({ default: m.SpectrumModule })),
  });

  MembranaRegistry.registerLazyModule({
    id: 'audio-file-upload',
    name: 'Загрузка аудио',
    description: 'Файл → превью волны и спектр при воспроизведении',
    version: '1.0.0',
    category: 'Источники',
    enabled: true,
    activePlugins: [],
    defaultConfig: {
      fftSize: 2048,
      waveformBins: 512,
      showSpectrumWhilePlaying: true,
    },
    loader: () =>
      import('./AudioFileUploadModule').then((m) => ({
        default: m.AudioFileUploadModule,
      })),
  });

  MembranaRegistry.registerLazyModule({
    id: 'oscilloscope',
    name: 'Осциллограф',
    description: 'Визуализация волновой формы сигнала',
    version: '1.0.0',
    category: 'Анализ',
    enabled: true,
    activePlugins: [],
    defaultConfig: {
      timeScale: 1,
      amplitudeScale: 1,
      showGrid: true,
      triggerMode: 'auto',
      colorScheme: 'classic',
    },
    loader: () =>
      import('./OscilloscopeModule').then((m) => ({
        default: m.OscilloscopeModule,
      })),
  });

  MembranaRegistry.registerLazyModule({
    id: 'telemetry-journal',
    name: 'Журнал телеметрии',
    description: 'Просмотр записей телеметрии (анализ, события, системные)',
    version: '1.0.0',
    category: 'Наблюдаемость',
    enabled: true,
    activePlugins: [],
    defaultConfig: {},
    loader: () =>
      import('./telemetry-journal/TelemetryJournalModule').then((m) => ({
        default: m.TelemetryJournalModule,
      })),
  });

  MembranaRegistry.registerLazyModule({
    id: 'microphone',
    name: 'Микрофон',
    description: 'Выбор источника звука и запуск потока для анализа и плагинов',
    version: '1.0.0',
    category: 'Устройства',
    enabled: true,
    activePlugins: [],
    defaultConfig: { selectedDeviceId: '' },
    loader: () =>
      import('./microphone/MicrophoneModule').then((m) => ({
        default: m.MicrophoneModule,
      })),
  });

  MembranaRegistry.registerPlugin('microphone', createMicStreamVizPlugin());

  // Завершаем фазу регистрации — все модули зарегистрированы, persisted-prefs
  // уже применены в registerModule, дальше держать pendingModulePrefs смысла нет.
  MembranaRegistry.finalizeRegistration();
}
