/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  // Панель не импортирует @membrana UI-пакеты (консилиум OP1) — сканируем только себя.
  // При появлении такого импорта добавить его src сюда (yarn verify:tailwind-coverage).
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['dark'],
    darkTheme: 'dark',
    logs: false,
  },
};
