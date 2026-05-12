import React, { useEffect } from 'react';
import {
  MembranaProvider,
  Dashboard,
  ThemeSelector,
  useMembranaStore,
  useCategories,
} from '@membrana/agenda';
import { FFTModule } from './modules/FFTModule';
import { SpectrumModule } from './modules/SpectrumModule';
import { OscilloscopeModule } from './modules/OscilloscopeModule';

function initializeModules() {
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
    activePlugins: []
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
    activePlugins: []
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
      colorScheme: 'classic'
    },
    enabled: true,
    activePlugins: []
  });
}

const CustomHeader = () => {
  const categories = useCategories();
  
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-base-content">
          🎵 Анализатор Звука
        </h1>
        <p className="text-sm text-base-content/60 mt-1">
          Профессиональный инструмент для аудио-анализа
        </p>
      </div>
      <div className="flex items-center gap-4">
        <ThemeSelector />
        <div className="text-xs text-base-content/40 text-right">
          <div>Membrana Core v1.0.0</div>
          <div className="text-success">Категории: {categories.join(', ')}</div>
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  useEffect(() => {
    initializeModules();
  }, []);
  
  return (
    <Dashboard 
      header={<CustomHeader />}
      footer={
        <div className="text-center text-sm text-base-content/40">
          Используйте микрофон для анализа звука в реальном времени
        </div>
      }
    />
  );
}

function App() {
  return (
    <MembranaProvider initialTheme="dark">
      <AppContent />
    </MembranaProvider>
  );
}

export default App;