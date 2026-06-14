import fs from 'node:fs';
import path from 'node:path';

const detectors = [
  {
    dir: 'harmonic',
    pkg: 'harmonic-detector-service',
    class: 'Harmonic',
    name: 'harmonic',
    family: 'dsp',
    desc: 'Гармонический портрет мультиротора.',
  },
  {
    dir: 'cepstral',
    pkg: 'cepstral-detector-service',
    class: 'Cepstral',
    name: 'cepstral',
    family: 'dsp',
    desc: 'Кепстральный пик периодики винта.',
  },
  {
    dir: 'spectral-flux',
    pkg: 'spectral-flux-detector-service',
    class: 'SpectralFlux',
    name: 'spectral-flux',
    family: 'dsp',
    desc: 'Динамика спектра и доплер.',
  },
  {
    dir: 'yamnet',
    pkg: 'yamnet-detector-service',
    class: 'Yamnet',
    name: 'yamnet',
    family: 'neural',
    desc: 'YAMNet AudioSet baseline.',
  },
  {
    dir: 'clap',
    pkg: 'clap-detector-service',
    class: 'Clap',
    name: 'clap',
    family: 'neural',
    desc: 'CLAP zero-shot.',
  },
  {
    dir: 'agentic-claude',
    pkg: 'agentic-detector-service',
    class: 'AgenticClaude',
    name: 'agentic-claude',
    family: 'agentic',
    desc: 'Agentic Claude reasoning.',
  },
];

const root = 'packages/services/detectors';

for (const d of detectors) {
  const base = path.join(root, d.dir);
  for (const sub of ['src/math', 'src/core', 'src/hooks']) {
    fs.mkdirSync(path.join(base, sub), { recursive: true });
    fs.writeFileSync(path.join(base, sub, '.gitkeep'), '');
  }

  const pkgJson = {
    name: `@membrana/${d.pkg}`,
    version: '0.1.0',
    description: d.desc,
    type: 'module',
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
    },
    files: ['dist', 'README.md'],
    scripts: {
      build: 'tsc -b && vite build',
      clean: 'rimraf dist .turbo .tsbuildinfo',
      lint: 'eslint src --ext .ts',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
    },
    dependencies: {
      '@membrana/core': '*',
      '@membrana/detector-base': '*',
    },
    devDependencies: {
      eslint: '^8.57.0',
      rimraf: '^5.0.0',
      typescript: '^5.4.0',
      vite: '^5.3.0',
      'vite-plugin-dts': '^3.9.1',
      vitest: '^1.4.0',
    },
  };
  fs.writeFileSync(path.join(base, 'package.json'), `${JSON.stringify(pkgJson, null, 2)}\n`);

  fs.writeFileSync(
    path.join(base, 'tsconfig.json'),
    `${JSON.stringify(
      {
        extends: '../../../../tsconfig.base.json',
        compilerOptions: {
          composite: true,
          rootDir: './src',
          outDir: './dist',
          tsBuildInfoFile: './.tsbuildinfo',
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', '**/*.test.ts'],
        references: [{ path: '../../../core' }, { path: '../base' }],
      },
      null,
      2,
    )}\n`,
  );

  fs.writeFileSync(
    path.join(base, 'vite.config.ts'),
    `import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [dts({ include: ['src/**/*'], exclude: ['**/*.test.ts'], rollupTypes: true })],
  resolve: {
    alias: {
      '@membrana/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)),
      '@membrana/detector-base': fileURLToPath(new URL('../base/src/index.ts', import.meta.url)),
    },
  },
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es'], fileName: 'index' },
    rollupOptions: { external: ['@membrana/core', '@membrana/detector-base'] },
    sourcemap: true,
    target: 'es2022',
  },
});
`,
  );

  fs.writeFileSync(
    path.join(base, 'src/detector.ts'),
    `import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class ${d.class}Detector implements DroneDetector {
  readonly name = '${d.name}';
  readonly family = '${d.family}' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function create${d.class}Detector(): DroneDetector {
  return new ${d.class}Detector();
}
`,
  );

  fs.writeFileSync(
    path.join(base, 'src/index.ts'),
    `export { ${d.class}Detector, create${d.class}Detector } from './detector.js';\n`,
  );

  fs.writeFileSync(
    path.join(base, 'src/contract.test.ts'),
    `import { describe, expect, it } from 'vitest';
import { harmonicDroneWindow, sineWindow, whiteNoiseWindow } from '@membrana/detector-base';
import { ${d.class}Detector } from './detector.js';

describe('${d.name} detector contract', () => {
  const detector = new ${d.class}Detector();

  it('exposes name and family', () => {
    expect(detector.name).toBe('${d.name}');
    expect(detector.family).toBe('${d.family}');
  });

  it('detect rejects with NotImplementedError on sine', async () => {
    await expect(detector.detect(sineWindow(440))).rejects.toThrow(/not implemented/i);
  });

  it('detect rejects on harmonic mock', async () => {
    await expect(detector.detect(harmonicDroneWindow())).rejects.toThrow(/not implemented/i);
  });

  it('detect rejects on white noise', async () => {
    await expect(detector.detect(whiteNoiseWindow())).rejects.toThrow(/not implemented/i);
  });
});
`,
  );

  fs.writeFileSync(
    path.join(base, 'README.md'),
    `# @membrana/${d.pkg}

${d.desc}

**Статус:** scaffold. **Семейство:** ${d.family}. Latency target p95 < 100 ms.
`,
  );
}

console.log('scaffold-detectors: ok');
