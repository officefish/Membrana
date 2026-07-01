/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../../packages/device-board/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['forest', 'dark', 'emerald'],
    darkTheme: 'dark',
    logs: false,
  },
};
