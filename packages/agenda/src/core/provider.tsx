import React, { createContext, useContext, useEffect, useState } from 'react';

// Типы для темы.
// ВАЖНО: список должен совпадать с темами в tailwind.config.js клиента
// и со списком в ThemeSelector.tsx.
export const AVAILABLE_THEMES = ['forest', 'sunset', 'emerald', 'business', 'dark'] as const;
export type DaisyTheme = (typeof AVAILABLE_THEMES)[number];

const isDaisyTheme = (value: unknown): value is DaisyTheme =>
  typeof value === 'string' && (AVAILABLE_THEMES as readonly string[]).includes(value);

interface MembranaConfig {
  theme: DaisyTheme;
  sidebarWidth?: string;
  defaultCategoryExpanded?: boolean;
}

interface MembranaContextValue {
  config: MembranaConfig;
  setTheme: (theme: DaisyTheme) => void;
  setConfig: (config: Partial<MembranaConfig>) => void;
}

const defaultConfig: MembranaConfig = {
  theme: 'dark',
  sidebarWidth: 'w-80',
  defaultCategoryExpanded: true
};

const MembranaContext = createContext<MembranaContextValue | null>(null);

export const useMembranaTheme = () => {
  const context = useContext(MembranaContext);
  if (!context) {
    throw new Error('useMembranaTheme must be used within MembranaProvider');
  }
  return context;
};

interface MembranaProviderProps {
  children: React.ReactNode;
  initialTheme?: DaisyTheme;
  initialConfig?: Partial<MembranaConfig>;
}

export const MembranaProvider: React.FC<MembranaProviderProps> = ({
  children,
  initialTheme = 'dark',
  initialConfig = {}
}) => {
  const [config, setConfigState] = useState<MembranaConfig>({
    ...defaultConfig,
    ...initialConfig,
    theme: initialTheme
  });

  // Применяем тему к document
  useEffect(() => {
    // Удаляем все предыдущие темы
    const htmlElement = document.documentElement;
    const oldThemes = Array.from(htmlElement.classList).filter(c => 
      c !== 'light' && c !== 'dark' && !c.startsWith('theme-')
    );
    oldThemes.forEach(theme => htmlElement.classList.remove(theme));
    
    // Добавляем новую тему
    htmlElement.setAttribute('data-theme', config.theme);
    htmlElement.classList.add(config.theme);
    
    // Сохраняем в localStorage
    localStorage.setItem('membrana-theme', config.theme);
  }, [config.theme]);

  // Загрузка сохраненной темы при старте.
  // Если в localStorage лежит устаревшая тема (которой больше нет
  // в AVAILABLE_THEMES) — игнорируем её, иначе daisyUI не отрисует стили.
  useEffect(() => {
    const savedTheme = localStorage.getItem('membrana-theme');
    if (isDaisyTheme(savedTheme) && savedTheme !== config.theme) {
      setConfigState(prev => ({ ...prev, theme: savedTheme }));
    }
  }, []);

  const setTheme = (theme: DaisyTheme) => {
    setConfigState(prev => ({ ...prev, theme }));
  };

  const setConfig = (newConfig: Partial<MembranaConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <MembranaContext.Provider value={{ config, setTheme, setConfig }}>
      {children}
    </MembranaContext.Provider>
  );
};

// Хук для доступа к конфигурации темы
export const useTheme = () => {
  const { config, setTheme } = useMembranaTheme();
  return { theme: config.theme, setTheme };
};