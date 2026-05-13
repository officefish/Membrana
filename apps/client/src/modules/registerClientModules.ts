import { lazy } from 'react';
import { useMembranaStore } from '@membrana/agenda';

const FFTModule = lazy(() =>
  import('./FFTModule').then((m) => ({ default: m.FFTModule })),
);
const SpectrumModule = lazy(() =>
  import('./SpectrumModule').then((m) => ({ default: m.SpectrumModule })),
);
const AudioFileUploadModule = lazy(() =>
  import('./AudioFileUploadModule').then((m) => ({
    default: m.AudioFileUploadModule,
  })),
);
const OscilloscopeModule = lazy(() =>
  import('./OscilloscopeModule').then((m) => ({ default: m.OscilloscopeModule })),
);

/**
 * Регистрирует модули в сторе. Вызывается один раз при загрузке приложения.
 * Компоненты — React.lazy: чанк Vite подтягивается только когда модуль
 * выбран в UI и включён (см. ModuleRenderer в @membrana/agenda).
 */
export function registerClientModules(): void {
  const store = useMembranaStore.getState();

  store.registerModule({
    id: 'fft-analyzer',
    name: 'FFT Анализатор',
    description: 'Быстрое преобразование Фурье для анализа частот',
    version: '1.0.0',
    category: 'Анализаторы',
    Component: FFTModule,
    defaultConfig: {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -100,
      maxDecibels: -30,
    },
    enabled: true,
    activePlugins: [],
  });

  store.registerModule({
    id: 'spectrum-3d',
    name: '3D Спектрограмма',
    description: 'Трехмерная визуализация спектра',
    version: '1.0.0',
    category: 'Визуализация',
    Component: SpectrumModule,
    defaultConfig: {
      colormap: 'viridis',
      showGrid: true,
      persistence: 0.5,
    },
    enabled: false,
    activePlugins: [],
  });

  store.registerModule({
    id: 'audio-file-upload',
    name: 'Загрузка аудио',
    description: 'Файл → превью волны и спектр при воспроизведении',
    version: '1.0.0',
    category: 'Источники',
    Component: AudioFileUploadModule,
    defaultConfig: {
      fftSize: 2048,
      waveformBins: 512,
      showSpectrumWhilePlaying: true,
    },
    enabled: true,
    activePlugins: [],
  });

  store.registerModule({
    id: 'oscilloscope',
    name: 'Осциллограф',
    description: 'Визуализация волновой формы сигнала',
    version: '1.0.0',
    category: 'Анализаторы',
    Component: OscilloscopeModule,
    defaultConfig: {
      timeScale: 1,
      amplitudeScale: 1,
      showGrid: true,
      triggerMode: 'auto',
      colorScheme: 'classic',
    },
    enabled: true,
    activePlugins: [],
  });

  useMembranaStore.setState({ pendingModulePrefs: null });
}
