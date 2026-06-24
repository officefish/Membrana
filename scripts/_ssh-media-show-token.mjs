#!/usr/bin/env node
/**
 * Print API_INTERNAL_TOKEN from VPS for local client .env (VITE_MEDIA_API_TOKEN).
 *
 * Usage:
 *   node scripts/_ssh-media-show-token.mjs
 *   node scripts/_ssh-media-show-token.mjs --quiet   # token only, no hints
 *
 * Requires in .env (not committed):
 *   BACKGROUND_MEDIA_IPV4
 *   BACKGROUND_MEDIA_PASSWORD
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quiet = process.argv.includes('--quiet');
const domain =
  readFileSync(resolve(root, '.env'), 'utf8')
    .match(/^MEDIA_DOMAIN=(.*)$/m)?.[1]
    ?.trim() || 'media.membrana.space';

const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');

if (!host || !password) {
  console.error('Missing BACKGROUND_MEDIA_IPV4 or BACKGROUND_MEDIA_PASSWORD in .env');
  process.exit(1);
}

const cmd = `grep '^API_INTERNAL_TOKEN=' /etc/membrana/media.env | cut -d= -f2-`;

function fetchToken() {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    let stdout = '';

    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (30s)'));
    }, 30_000);

    conn
      .on('ready', () => {
        conn.exec(cmd, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            rejectPromise(err);
            return;
          }
          stream.on('data', (d) => {
            stdout += d.toString();
          });
          stream.stderr.on('data', (d) => process.stderr.write(d));
          stream.on('close', (code) => {
            clearTimeout(timeout);
            conn.end();
            if (code !== 0) {
              rejectPromise(
                new Error(
                  code === 1
                    ? 'API_INTERNAL_TOKEN not found in /etc/membrana/media.env on VPS'
                    : `remote exit ${code}`,
                ),
              );
              return;
            }
            resolvePromise(stdout.trim());
          });
        });
      })
      .on('error', rejectPromise)
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 20_000 });
  });
}

const token = await fetchToken();

if (!token) {
  console.error('Empty API_INTERNAL_TOKEN on VPS');
  process.exit(1);
}

if (quiet) {
  console.log(token);
  process.exit(0);
}

console.log(`API_INTERNAL_TOKEN from root@${host} (/etc/membrana/media.env)\n`);
console.log('Add to local .env (do not commit):\n');
console.log(`VITE_MEDIA_SERVER_URL=https://${domain}`);
console.log(`VITE_MEDIA_API_TOKEN=${token}`);
console.log('\n⚠️  Do not paste this token in chat, Issues, or git.');
