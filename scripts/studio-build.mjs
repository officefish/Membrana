#!/usr/bin/env node
/**
 * Build Membrana Studio: apps/client (base ./) → client-dist + compile Electron main.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const studioDir = resolve(root, 'apps/membrana-studio');
const clientDist = resolve(studioDir, 'client-dist');

const CABINET_PROD_URL = 'https://cabinet.membrana.space';
const studioProd = process.env.MEMBRANA_STUDIO_PROD === '1';

function clientBuildEnv() {
  const env = { ...process.env, MEMBRANA_STUDIO: '1' };
  if (studioProd) {
    env.VITE_CABINET_API_URL = CABINET_PROD_URL;
  }
  return env;
}
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

rmSync(clientDist, { recursive: true, force: true });

await run('yarn', ['workspace', '@membrana/client', 'build'], {
  env: clientBuildEnv(),
});
mkdirSync(clientDist, { recursive: true });
cpSync(resolve(root, 'apps/client/dist'), clientDist, { recursive: true });

await run('yarn', ['workspace', '@membrana/membrana-studio', 'build']);

console.log('Membrana Studio build OK:', clientDist);
