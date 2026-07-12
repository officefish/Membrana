#!/usr/bin/env node
/**
 * _ssh-media-exec — выполнить команду на media-хосте (background-media, NL) по паролю.
 *
 * На media publickey не авторизован (в отличие от office), sshpass нет — только
 * пароль из корневого .env (BACKGROUND_MEDIA_PASSWORD/IPV4). Этот хелпер трекается
 * (как _ssh-office-config), чтобы не переписывать ssh2-обвязку каждый раз.
 *
 * Usage: node scripts/_ssh-media-exec.mjs '<remote shell command>'
 * Пример: node scripts/_ssh-media-exec.mjs 'docker ps --format "{{.Names}}"'
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'ssh2';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function envGet(key) {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
  return (env.match(new RegExp(`^${key}=(.*)$`, 'm')) ?? [])[1]?.trim();
}

export function runOnMedia(command, deps = { envGet }) {
  const host = deps.envGet('BACKGROUND_MEDIA_IPV4');
  const password = deps.envGet('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    return Promise.reject(new Error('Missing BACKGROUND_MEDIA_IPV4/PASSWORD in .env'));
  }
  return new Promise((resolvePromise, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          stream
            .on('close', (code) => {
              conn.end();
              resolvePromise(code ?? 0);
            })
            .on('data', (d) => process.stdout.write(d))
            .stderr.on('data', (d) => process.stderr.write(d));
        });
      })
      .on('error', (e) => reject(e))
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 25_000 });
  });
}

if (process.argv[1]?.endsWith('_ssh-media-exec.mjs')) {
  const command = process.argv[2];
  if (!command) {
    console.error("Usage: node scripts/_ssh-media-exec.mjs '<command>'");
    process.exit(1);
  }
  runOnMedia(command)
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error('SSH ERR', e.message);
      process.exit(1);
    });
}
