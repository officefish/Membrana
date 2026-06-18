#!/usr/bin/env node
/**
 * Package Membrana Studio for Windows (NSIS): studio:build → electron-builder.
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

await run('yarn', ['studio:build'], {
  env: { ...process.env, MEMBRANA_STUDIO_PROD: '1' },
});
await run('yarn', ['workspace', '@membrana/membrana-studio', 'package']);

console.log('Membrana Studio package OK — see apps/membrana-studio/release/');
