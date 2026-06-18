import path from 'node:path';

/** Vite dev server for apps/client when MEMBRANA_STUDIO_DEV=1. */
export const STUDIO_DEV_URL = 'http://localhost:5173';

export function studioRootDir(): string {
  return path.join(__dirname, '..');
}

export function clientDistIndexPath(): string {
  return path.join(studioRootDir(), 'client-dist', 'index.html');
}

export function preloadScriptPath(): string {
  return path.join(__dirname, 'preload.js');
}
