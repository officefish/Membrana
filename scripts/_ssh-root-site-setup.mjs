#!/usr/bin/env node
/**
 * Root site membrana.space (apex + www) на продуктовом VPS — ADR-0008 Р2/Р3.
 *
 * Ставит Caddy site-блок из deploy/Caddyfile.root.membrana.space и минимальную
 * страницу из deploy/root-site/, поднимает /var/www/membrana/downloads.
 * TLS — автоматический Let's Encrypt (A @ и A www → VPS уже есть).
 *
 * Инсталлятор Studio заливается отдельно: --upload-installer.
 *
 * Usage:
 *   node scripts/_ssh-root-site-setup.mjs --check       # разведка, ничего не меняет
 *   node scripts/_ssh-root-site-setup.mjs               # dry-run (печатает план)
 *   node scripts/_ssh-root-site-setup.mjs --execute     # поставить блок + страницу
 *   node scripts/_ssh-root-site-setup.mjs --upload-installer --execute
 *
 * Env (.env, не коммитится): BACKGROUND_MEDIA_IPV4, BACKGROUND_MEDIA_PASSWORD
 * (тот же продуктовый VPS 72.56.27.58 — там cabinet + media, см. DNS_DOMAIN_POLICY).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');

const CADDY_SRC = resolve(root, 'deploy/Caddyfile.root.membrana.space');
const PAGE_SRC = resolve(root, 'deploy/root-site/index.html');
const INSTALLER_SRC = resolve(root, 'apps/membrana-studio/release/Membrana Studio Setup 0.1.0.exe');
/** Без пробелов в URL: чистое имя файла в /downloads. */
const INSTALLER_DEST_NAME = 'Membrana-Studio-Setup-0.1.0.exe';

const WEB_ROOT = '/var/www/membrana';
const CADDY_FILE = '/etc/caddy/Caddyfile.d/root.caddy';

const execute = process.argv.includes('--execute');
const checkOnly = process.argv.includes('--check');
const withInstaller = process.argv.includes('--upload-installer');

if (!host || !password) {
  console.error('Missing BACKGROUND_MEDIA_IPV4 / BACKGROUND_MEDIA_PASSWORD in .env');
  process.exit(1);
}

function connect() {
  return new Promise((res, rej) => {
    const conn = new Client();
    conn
      .on('ready', () => res(conn))
      .on('error', rej)
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 25_000 });
  });
}

function exec(conn, command) {
  return new Promise((res, rej) => {
    conn.exec(command, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream
        .on('close', (code) => res({ code: code ?? 0, out }))
        .on('data', (d) => {
          out += d;
          process.stdout.write(d);
        })
        .stderr.on('data', (d) => {
          out += d;
          process.stderr.write(d);
        });
    });
  });
}

function putFile(conn, localPath, remotePath) {
  return new Promise((res, rej) => {
    conn.sftp((err, sftp) => {
      if (err) return rej(err);
      const size = statSync(localPath).size;
      let last = 0;
      sftp.fastPut(
        localPath,
        remotePath,
        {
          concurrency: 8,
          chunkSize: 32768,
          step: (transferred) => {
            const pct = Math.floor((transferred / size) * 100);
            if (pct >= last + 10) {
              last = pct;
              process.stdout.write(`  ${pct}% (${(transferred / 1048576).toFixed(1)} MB)\n`);
            }
          },
        },
        (e) => (e ? rej(e) : res()),
      );
    });
  });
}

const CHECK = `
echo "=== DNS ==="; getent ahosts membrana.space | awk '{print $1}' | sort -u | head -3
echo "=== caddy ==="; caddy version; systemctl is-active caddy
echo "=== Caddyfile.d ==="; ls -la /etc/caddy/Caddyfile.d/
echo "=== web root ==="; ls -la ${WEB_ROOT} 2>&1 | head -5
echo "=== egress → mintlify ==="; curl -sS -o /dev/null -w "%{http_code} (%{time_total}s)\\n" --max-time 15 https://membrana.mintlify.app/
echo "=== disk ==="; df -h / | tail -1
`;

async function main() {
  console.log(`root-site setup on root@${host}\n`);

  if (checkOnly) {
    const conn = await connect();
    await exec(conn, CHECK);
    conn.end();
    return;
  }

  if (!existsSync(CADDY_SRC) || !existsSync(PAGE_SRC)) {
    console.error(`Missing source: ${CADDY_SRC} / ${PAGE_SRC}`);
    process.exit(1);
  }
  if (withInstaller && !existsSync(INSTALLER_SRC)) {
    console.error(`Missing installer: ${INSTALLER_SRC}\nСобери: yarn studio:package`);
    process.exit(1);
  }

  if (!execute) {
    console.log('[DRY-RUN] шаги (добавь --execute):');
    console.log(`  · mkdir -p ${WEB_ROOT}/root ${WEB_ROOT}/downloads`);
    console.log(`  · upload ${PAGE_SRC} → ${WEB_ROOT}/root/index.html`);
    console.log(`  · upload ${CADDY_SRC} → ${CADDY_FILE}`);
    if (withInstaller) {
      const mb = (statSync(INSTALLER_SRC).size / 1048576).toFixed(1);
      console.log(`  · upload installer (${mb} MB) → ${WEB_ROOT}/downloads/${INSTALLER_DEST_NAME}`);
    }
    console.log('  · caddy validate --config /etc/caddy/Caddyfile');
    console.log('  · systemctl reload caddy');
    console.log('  · live-проверка apex/downloads');
    return;
  }

  const conn = await connect();
  try {
    console.log('=== [1/5] каталоги ===');
    await exec(conn, `mkdir -p ${WEB_ROOT}/root ${WEB_ROOT}/downloads && echo ok`);

    console.log('=== [2/5] страница + Caddy-блок ===');
    await putFile(conn, PAGE_SRC, `${WEB_ROOT}/root/index.html`);
    await putFile(conn, CADDY_SRC, CADDY_FILE);
    await exec(conn, `chmod 644 ${WEB_ROOT}/root/index.html ${CADDY_FILE} && echo ok`);

    if (withInstaller) {
      console.log('=== [3/5] инсталлятор ===');
      const tmp = `${WEB_ROOT}/downloads/.${INSTALLER_DEST_NAME}.part`;
      await putFile(conn, INSTALLER_SRC, tmp);
      // Атомарная подмена: пользователь не поймает наполовину залитый файл.
      await exec(
        conn,
        `mv ${tmp} ${WEB_ROOT}/downloads/${INSTALLER_DEST_NAME} && chmod 644 ${WEB_ROOT}/downloads/${INSTALLER_DEST_NAME} && ls -lh ${WEB_ROOT}/downloads/`,
      );
    } else {
      console.log('=== [3/5] инсталлятор — пропущен (нет --upload-installer) ===');
    }

    console.log('=== [4/5] validate + reload ===');
    const v = await exec(conn, 'caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -5');
    if (v.code !== 0) {
      throw new Error('caddy validate FAILED — блок не применён, reload не делаю');
    }
    await exec(conn, 'systemctl reload caddy && sleep 4 && systemctl is-active caddy');

    console.log('=== [5/5] live-проверка ===');
    await exec(
      conn,
      `curl -sS -o /dev/null -w "https://membrana.space/ -> %{http_code}\\n" --max-time 25 https://membrana.space/ ;` +
        ` curl -sS -o /dev/null -w "https://membrana.space/downloads -> %{http_code}\\n" --max-time 25 -L https://membrana.space/downloads ;` +
        ` curl -sS -o /dev/null -w "https://www.membrana.space/ -> %{http_code}\\n" --max-time 25 https://www.membrana.space/`,
    );
  } finally {
    conn.end();
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
