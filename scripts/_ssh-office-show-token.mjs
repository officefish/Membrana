#!/usr/bin/env node
/**
 * Print API_INTERNAL_TOKEN from VPS for local tooling (do not commit).
 *
 * Usage:
 *   node scripts/_ssh-office-show-token.mjs
 *   node scripts/_ssh-office-show-token.mjs --quiet
 *
 * Requires BACKGROUND_OFFICE_* or BACKGROUND_MEDIA_* in .env.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { getOfficeSshConfig } from './_ssh-office-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quiet = process.argv.includes('--quiet');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
const domain = get('OFFICE_DOMAIN') || 'office.membrana.space';

const cmd = `grep '^API_INTERNAL_TOKEN=' /etc/membrana/office.env | cut -d= -f2-`;

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
              rejectPromise(new Error(`remote exit ${code}`));
              return;
            }
            resolvePromise(stdout.trim());
          });
        });
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });
}

const { host } = getOfficeSshConfig();
const token = await fetchToken();

if (!token) {
  console.error('Empty API_INTERNAL_TOKEN on VPS');
  process.exit(1);
}

if (quiet) {
  console.log(token);
  process.exit(0);
}

console.log(`API_INTERNAL_TOKEN from root@${host} (/etc/membrana/office.env)\n`);
console.log('Example curl (do not commit token):\n');
console.log(`curl -s https://${domain}/v1/linear/issue/MEM-60 \\`);
console.log(`  -H "X-Membrana-Token: ${token}"`);
console.log('\n⚠️  Do not paste this token in chat, Issues, or git.');
