import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMPARE_DATA_FILE = join(REPO_ROOT, 'docs', 'reports', 'detector-compare', 'latest.json');
const COMPARE_CORPUS_DIR = join(REPO_ROOT, 'data', 'detectors-benchmark', 'v0.2');
const PANEL_DIST = fileURLToPath(new URL('./dist', import.meta.url));

/**
 * Артефакты борда detector-compare (#452, контракт = JSON, консилиум
 * detector-compare-board-2026-07-14):
 * - dev/preview: `/compare-data/latest.json` — из docs/reports (git),
 *   `/compare-audio/<id>.wav` — wav локального бенчмарк-корпуса (вне git);
 * - build: latest.json копируется в dist/compare-data — прод-деплой остаётся
 *   «rsync dist», аудио-бандл едет отдельной строкой PANEL_DEPLOY.md.
 */
function compareArtifactsPlugin(): Plugin {
  /** id → путь wav корпуса из артефакта; без карты произвольные пути не отдаём. */
  function audioFileFor(id: string): string | null {
    if (!/^[\w.-]+$/.test(id) || !existsSync(COMPARE_DATA_FILE)) return null;
    const report = JSON.parse(readFileSync(COMPARE_DATA_FILE, 'utf8')) as {
      samples?: { id: string; file: string }[];
    };
    const sample = report.samples?.find((s) => s.id === id);
    if (!sample) return null;
    const wavPath = join(COMPARE_CORPUS_DIR, sample.file);
    return existsSync(wavPath) ? wavPath : null;
  }

  function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use('/compare-data/latest.json', (_req, res) => {
      if (!existsSync(COMPARE_DATA_FILE)) {
        res.statusCode = 404;
        res.end('detector-compare artifact not found — run yarn detector:compare:export');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(readFileSync(COMPARE_DATA_FILE));
    });
    server.middlewares.use('/compare-audio', (req, res) => {
      const match = /^\/([\w.-]+)\.wav$/.exec(req.url ?? '');
      const wavPath = match ? audioFileFor(match[1]!) : null;
      if (!wavPath) {
        res.statusCode = 404;
        res.end('sample not found in compare corpus');
        return;
      }
      res.setHeader('Content-Type', 'audio/wav');
      res.end(readFileSync(wavPath));
    });
  }

  return {
    name: 'membrana-compare-artifacts',
    configureServer: attach,
    configurePreviewServer: attach,
    writeBundle() {
      if (!existsSync(COMPARE_DATA_FILE)) return;
      const outDir = join(PANEL_DIST, 'compare-data');
      mkdirSync(outDir, { recursive: true });
      copyFileSync(COMPARE_DATA_FILE, join(outDir, 'latest.json'));
    },
  };
}

// Панель НЕ импортирует internals кабинета и пакетов (консилиум office-panel-contour,
// OP1): никаких @membrana/* алиасов — данные приходят только через HTTP /v1/* office.
export default defineConfig({
  plugins: [react(), compareArtifactsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    proxy: {
      // Дев-зеркало прод-топологии: Caddy на panel.mmbrn.tech проксирует /v1/* → office.
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
