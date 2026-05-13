import {
  MembranaProvider,
  Dashboard,
  ThemeSelector,
  useCategories,
} from '@membrana/agenda';

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