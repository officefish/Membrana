import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

const demoDir = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    tailwindcss({ config: join(demoDir, 'tailwind.config.js') }),
    autoprefixer(),
  ],
};
