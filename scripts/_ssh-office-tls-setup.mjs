#!/usr/bin/env node
/**
 * Install Caddy reverse proxy for office.membrana.space → 127.0.0.1:3000.
 * TLS: Let's Encrypt (default) once DNS A-record points to VPS.
 * Coexists with media.caddy on the same Caddy instance.
 *
 * Usage:
 *   node scripts/_ssh-office-tls-setup.mjs
 *   node scripts/_ssh-office-tls-setup.mjs --check-dns
 *
 * Env (.env, not committed):
 *   BACKGROUND_OFFICE_IPV4 or BACKGROUND_MEDIA_IPV4
 *   BACKGROUND_OFFICE_PASSWORD or BACKGROUND_MEDIA_PASSWORD
 *   OFFICE_DOMAIN=office.membrana.space   (optional)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { getOfficeSshConfig } from './_ssh-office-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const domain = get('OFFICE_DOMAIN') || 'office.membrana.space';
const mode = process.argv.includes('--check-dns') ? 'check-dns' : 'setup';

const caddyfile = readFileSync(
  resolve(root, 'deploy/Caddyfile.office.membrana.space'),
  'utf8',
).replace(/^#.*\n/gm, '').trim();

const remoteScripts = {
  'check-dns': `#!/bin/bash
set -euo pipefail
echo "=== VPS public IP ==="
curl -fsS https://api.ipify.org && echo ""
echo "=== DNS A for ${domain} ==="
dig +short A ${domain} || getent ahosts ${domain} | awk '{print $1}' | sort -u
echo "=== local health ==="
curl -fsS http://127.0.0.1:3000/health && echo ""
echo "=== caddy status ==="
systemctl is-active caddy 2>/dev/null || echo "caddy: not installed"
echo "=== office.caddy ==="
test -f /etc/caddy/Caddyfile.d/office.caddy && cat /etc/caddy/Caddyfile.d/office.caddy || echo "office.caddy: not installed"
echo "=== HTTPS health (may fail until DNS) ==="
curl -fsS --max-time 10 https://${domain}/health && echo "" || echo "HTTPS not ready"
`,

  setup: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== [1/4] caddy ==="
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y caddy
else
  echo "caddy already installed: $(caddy version)"
fi

echo "=== [2/4] firewall ==="
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw --force enable || true
fi

echo "=== [3/4] office Caddyfile ==="
mkdir -p /etc/caddy/Caddyfile.d
cat > /etc/caddy/Caddyfile.d/office.caddy <<'CADDYEOF'
${caddyfile.replaceAll('\t', '  ')}
CADDYEOF

if ! grep -q 'import /etc/caddy/Caddyfile.d' /etc/caddy/Caddyfile 2>/dev/null; then
  echo '' >> /etc/caddy/Caddyfile
  echo 'import /etc/caddy/Caddyfile.d/*' >> /etc/caddy/Caddyfile
fi

echo "=== [4/4] validate & reload ==="
caddy validate --config /etc/caddy/Caddyfile
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy
sleep 3
systemctl --no-pager status caddy | head -20

echo "=== checks ==="
echo "DNS A:"
dig +short A ${domain} || true
echo "office bind (must be 127.0.0.1:3000):"
docker compose -f /root/membrana/packages/background-office/docker-compose.yml \\
  -f /root/membrana/deploy/background-office.prod.compose.yml \\
  --env-file /etc/membrana/office.env config 2>/dev/null | grep -A1 'published:' || true
echo "HTTPS health (may fail until DNS propagates):"
curl -fsS --max-time 10 https://${domain}/health && echo "" || echo "HTTPS not ready yet — wait for DNS, then: systemctl reload caddy"
`,
};

function runRemote(script) {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (10m)'));
    }, 10 * 60 * 1000);

    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            rejectPromise(err);
            return;
          }
          stream.write(script);
          stream.end();
          stream.on('data', (d) => process.stdout.write(d));
          stream.stderr.on('data', (d) => process.stderr.write(d));
          stream.on('close', (code) => {
            clearTimeout(timeout);
            conn.end();
            if (code === 0) resolvePromise(code);
            else rejectPromise(new Error(`remote exit ${code}`));
          });
        });
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });
}

const { host, username } = getOfficeSshConfig();
console.log(`Office TLS (${mode}) on ${username}@${host} for ${domain}\n`);
await runRemote(remoteScripts[mode]);
console.log('\nDone.');
