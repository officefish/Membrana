#!/usr/bin/env node
/**
 * Живой деплой панели panel.mmbrn.tech (хвост OP4, эпик #438).
 *
 * Паттерн _ssh-office-prod-up (tar → sftp → bash). Делает:
 *   1) секреты PANEL_SESSION_SECRET / PANEL_INVITE_SECRET: генерирует локально
 *      (crypto), дописывает в корневой .env (нужны для `yarn panel:invite`) и в
 *      /etc/membrana/office.env на VDS — значения НЕ печатаются;
 *   2) выгружает apps/panel/dist → /opt/membrana-panel/dist (tar), чинит права
 *      под caddy (chmod -R a+rX) и сохраняет wav-бандл /compare-audio, лежащий
 *      вне git — `--audio <dir>` заливает его заново из локального корпуса;
 *   3) ставит /etc/caddy/Caddyfile.d/panel.caddy из deploy/Caddyfile.panel.template,
 *      caddy validate → reload (LE выпустится сам).
 *
 * ГЕЙТ: запускать только после `yarn panel:dns-gate --expect <VDS IP>` = [go]
 * (урок OM4-C). Office-образ с модулем panel-auth поднимается ОТДЕЛЬНО:
 * `node scripts/_ssh-office-prod-up.mjs` (подхватит новые env при recreate).
 *
 * GitHub OAuth (PANEL_GITHUB_*) скрипт НЕ трогает — OAuth App создаёт владелец.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { Client } from 'ssh2';
import { getOfficeSshConfig, readRootEnv, repoRoot } from './_ssh-office-config.mjs';

const PANEL_DOMAIN = process.env.PANEL_DOMAIN?.trim() || 'panel.mmbrn.tech';
const DIST_DIR = resolve(repoRoot, 'apps/panel/dist');
const tarPath = join(tmpdir(), `panel-dist-${Date.now()}.tgz`);
const remoteTar = '/tmp/panel-dist.tgz';

/**
 * `--audio <dir>` — залить wav-бандл борда detector-compare (#452) из локального
 * каталога (готовит `yarn detector:compare:export --audio-out <dir>`). Без флага
 * бандл, уже лежащий на проде, переживает выкладку (см. KEEP_AUDIO ниже).
 */
const audioFlagIndex = process.argv.indexOf('--audio');
const audioDir = audioFlagIndex > -1 ? process.argv[audioFlagIndex + 1] : undefined;
if (audioFlagIndex > -1 && !audioDir) {
  console.error('[fail] --audio требует каталог: --audio /tmp/compare-audio');
  process.exit(1);
}
if (audioDir && !existsSync(audioDir)) {
  console.error(`[fail] --audio: каталог не найден: ${audioDir}`);
  process.exit(1);
}
const audioTarPath = audioDir ? join(tmpdir(), `panel-compare-audio-${Date.now()}.tgz`) : undefined;
const remoteAudioTar = '/tmp/panel-compare-audio.tgz';

function envGet(envText, key) {
  return envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

/** Секрет из локального .env; при отсутствии — генерируется и дописывается (без печати). */
function ensureLocalSecret(name) {
  const envText = readRootEnv();
  const existing = envGet(envText, name);
  if (existing) return { value: existing, created: false };
  const value = randomBytes(32).toString('hex');
  appendFileSync(resolve(repoRoot, '.env'), `\n${name}=${value}\n`);
  return { value, created: true };
}

function renderPanelCaddyfile() {
  const template = readFileSync(resolve(repoRoot, 'deploy/Caddyfile.panel.template'), 'utf8');
  const rendered = template.replaceAll('{{PANEL_DOMAIN}}', PANEL_DOMAIN);
  if (rendered.includes('{{')) throw new Error('panel Caddyfile: неподставленный плейсхолдер');
  return rendered.replace(/^#.*\n/gm, '').trim();
}

function sftpPut(conn, local, remote) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.sftp((err, sftp) => {
      if (err) return rejectPromise(err);
      sftp.fastPut(local, remote, (putErr) => (putErr ? rejectPromise(putErr) : resolvePromise()));
    });
  });
}

function execBash(conn, script) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.exec('bash -s', (err, stream) => {
      if (err) return rejectPromise(err);
      stream.write(script);
      stream.end();
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
      stream.on('close', (code) =>
        code === 0 ? resolvePromise(0) : rejectPromise(new Error(`remote exit ${code}`)),
      );
    });
  });
}

if (!existsSync(join(DIST_DIR, 'index.html'))) {
  console.error('[fail] apps/panel/dist пуст — сначала yarn turbo run build --filter=@membrana/panel');
  process.exit(1);
}

const session = ensureLocalSecret('PANEL_SESSION_SECRET');
const invite = ensureLocalSecret('PANEL_INVITE_SECRET');
console.log(
  `Секреты: PANEL_SESSION_SECRET ${session.created ? 'сгенерирован' : 'из .env'}, ` +
    `PANEL_INVITE_SECRET ${invite.created ? 'сгенерирован' : 'из .env'} (значения не печатаются)`,
);

console.log('Packing panel dist...');
execSync(`tar -czf "${tarPath}" -C "${DIST_DIR}" .`, { cwd: repoRoot, stdio: 'inherit' });

if (audioDir) {
  console.log(`Packing compare-audio from ${audioDir}...`);
  execSync(`tar -czf "${audioTarPath}" -C "${audioDir}" .`, { cwd: repoRoot, stdio: 'inherit' });
}

const caddyfile = renderPanelCaddyfile();

const remoteScript = `#!/bin/bash
set -euo pipefail

echo "=== [1/4] секреты панели в /etc/membrana/office.env ==="
mkdir -p /etc/membrana
touch /etc/membrana/office.env
ensure_env() {
  local name="$1" value="$2"
  if ! grep -q "^\${name}=" /etc/membrana/office.env; then
    printf '%s=%s\\n' "\${name}" "\${value}" >> /etc/membrana/office.env
    echo "  + \${name} (добавлен)"
  else
    echo "  = \${name} (уже есть, не трогаю)"
  fi
}
ensure_env PANEL_SESSION_SECRET '${session.value}'
ensure_env PANEL_INVITE_SECRET '${invite.value}'
ensure_env PANEL_PUBLIC_URL 'https://${PANEL_DOMAIN}'

echo "=== [2/4] статика панели ==="
mkdir -p /opt/membrana-panel/dist

# compare-audio живёт ВНЕ git (PANEL_DEPLOY.md #452) и потому не едет в tar dist.
# Без этого блока "rm -rf dist/*" сносил бандл на КАЖДОМ деплое, и борд молча терял
# проигрывание до ручного re-scp (на 2026-07-14 на проде лежало 120 wav).
KEEP_AUDIO=/tmp/panel-compare-audio-keep
rm -rf "\$KEEP_AUDIO"
if [ -d /opt/membrana-panel/dist/compare-audio ]; then
  mv /opt/membrana-panel/dist/compare-audio "\$KEEP_AUDIO"
  echo "  compare-audio отложен на время выкладки (\$(ls "\$KEEP_AUDIO" | wc -l) файлов)"
fi

rm -rf /opt/membrana-panel/dist/*
tar -xzf ${remoteTar} -C /opt/membrana-panel/dist

# Ветка по ЯВНОМУ флагу, не по наличию файла: упавший на полпути прошлый деплой мог
# оставить stale-tar, и проверка "-f" тихо выложила бы старое аудио.
AUDIO_UPLOADED=${audioDir ? '1' : '0'}
if [ "\$AUDIO_UPLOADED" = "1" ] && [ -f ${remoteAudioTar} ]; then
  mkdir -p /opt/membrana-panel/dist/compare-audio
  tar -xzf ${remoteAudioTar} -C /opt/membrana-panel/dist/compare-audio
  rm -f ${remoteAudioTar}
  rm -rf "\$KEEP_AUDIO"
  echo "  compare-audio залит из локального корпуса (\$(ls /opt/membrana-panel/dist/compare-audio | wc -l) файлов)"
elif [ -d "\$KEEP_AUDIO" ]; then
  mv "\$KEEP_AUDIO" /opt/membrana-panel/dist/compare-audio
  echo "  compare-audio возвращён на место (\$(ls /opt/membrana-panel/dist/compare-audio | wc -l) файлов)"
else
  echo "  compare-audio нет ни на проде, ни локально — борд отдаст 404 на wav (--audio <dir> чтобы залить)"
fi

# Права: caddy ходит НЕ под root (живой урок 2026-07-14, деплой #457) — tar/scp с
# Windows приносит каталоги 700, caddy не читает и try_files молча отдаёт index.html
# вместо статики (ломались и /assets). Норма PANEL_DEPLOY.md, свёрнута в скрипт.
chmod a+rX /opt/membrana-panel
chmod -R a+rX /opt/membrana-panel/dist
echo "  права: \$(stat -c %a /opt/membrana-panel/dist) на dist, рекурсивно a+rX"

ls /opt/membrana-panel/dist | head -5

echo "=== [3/4] caddy site-block ==="
mkdir -p /etc/caddy/Caddyfile.d
cat > /etc/caddy/Caddyfile.d/panel.caddy <<'CADDY_EOF'
${caddyfile}
CADDY_EOF
# Импорт каталога уже стоит у office-setup (абсолютной формой) — проверяем ЛЮБУЮ форму,
# иначе двойной import задвоит все site-блоки (живой урок 2026-07-14: ambiguous site).
grep -q 'Caddyfile\.d' /etc/caddy/Caddyfile || echo 'import /etc/caddy/Caddyfile.d/*' >> /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo "=== [4/4] ожидание LE + smoke ==="
sleep 20
curl -fsS --max-time 30 -o /dev/null -w 'https://${PANEL_DOMAIN} -> HTTP %{http_code}\\n' https://${PANEL_DOMAIN}/ || echo "HTTPS ещё прогревается (LE может занять до минуты)"
rm -f ${remoteTar}
`;

function runDeploy() {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH timeout (15m)'));
    }, 15 * 60 * 1000);
    conn
      .on('ready', async () => {
        try {
          console.log('Uploading dist tarball...');
          await sftpPut(conn, tarPath, remoteTar);
          if (audioTarPath) {
            console.log('Uploading compare-audio tarball...');
            await sftpPut(conn, audioTarPath, remoteAudioTar);
          }
          await execBash(conn, remoteScript);
          clearTimeout(timeout);
          conn.end();
          resolvePromise(0);
        } catch (e) {
          clearTimeout(timeout);
          conn.end();
          rejectPromise(e);
        }
      })
      .on('error', rejectPromise)
      .connect(getOfficeSshConfig());
  });
}

const { host, username } = getOfficeSshConfig();
console.log(`Panel deploy → ${username}@${host} (${PANEL_DOMAIN})\n`);
try {
  await runDeploy();
  console.log('\nPanel deploy OK. Дальше: node scripts/_ssh-office-prod-up.mjs (office с panel-auth).');
} finally {
  for (const path of [tarPath, audioTarPath]) {
    if (!path) continue;
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}
