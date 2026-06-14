/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

/** Пути относительно этого файла (demo/). */
export default {
  content: ['./index.html', './**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [daisyui],
  daisyui: {
    themes: ['forest', 'dark'],
    darkTheme: 'dark',
    logs: false,
  },
};
