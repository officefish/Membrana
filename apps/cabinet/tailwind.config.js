/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Cabinet renders the device-board via @membrana/device-board (DeviceBoardShell),
    // whose node/port Tailwind utilities must be scanned here or the node layout
    // collapses into overlapping text. device-board depends on @membrana/core.
    '../../packages/device-board/src/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}',
    '../../packages/libs/journal-report-views/src/**/*.{ts,tsx}',
  ],
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
