/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  // КРИТИЧНО: Tailwind должен сканировать классы не только в клиенте,
  // но и в исходниках пакетов монорепо, чьи компоненты мы импортируем.
  // Иначе все classNames вида `bg-base-200`, `text-base-content`, `checkbox`,
  // `badge` и т.д. внутри @membrana/agenda не попадут в финальный CSS.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/agenda/src/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}',
    '../../packages/device-board/src/**/*.{ts,tsx}',
    '../../packages/libs/audioDataViz/src/**/*.{ts,tsx}',
    '../../packages/libs/journal-report-views/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],

  // Конфигурация daisyUI: какие темы включить.
  // ВАЖНО: этот список должен совпадать со списком в ThemeSelector.tsx
  // и с типом DaisyTheme в provider.tsx.
  daisyui: {
    themes: ['forest', 'sunset', 'emerald', 'business', 'dark'],
    darkTheme: 'dark',
    logs: false,
  },
};
