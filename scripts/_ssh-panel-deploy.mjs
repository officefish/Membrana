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
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { Client } from 'ssh2';
import { getOfficeSshConfig, readRootEnv, repoRoot } from './_ssh-office-config.mjs';

const PANEL_DOMAIN = process.env.PANEL_DOMAIN?.trim() || 'panel.mmbrn.tech';
const DIST_DIR = resolve(repoRoot, 'apps/panel/dist');
const cacheDir = join(repoRoot, 'scripts', 'cache');
mkdirSync(cacheDir, { recursive: true });
const tarPath = join(cacheDir, `panel-dist-${Date.now()}.tgz`);
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
const audioTarPath = audioDir ? join(cacheDir, `panel-compare-audio-${Date.now()}.tgz`) : undefined;
const remoteAudioTar = '/tmp/panel-compare-audio.tgz';

/**
 * `--graphify <dir>` — залить статику блок-артефакта graphify (маршрут-мост
 * /panel/section/graphify/*, GRP1/ADR-0010) в /opt/membrana-graphify. Каталог
 * готовит перегон Graphify по семействам (per-family GRAPH_TREE.html + index).
 */
const graphifyFlagIndex = process.argv.indexOf('--graphify');
const graphifyDir = graphifyFlagIndex > -1 ? process.argv[graphifyFlagIndex + 1] : undefined;
if (graphifyFlagIndex > -1 && (!graphifyDir || !existsSync(graphifyDir))) {
  console.error('[fail] --graphify требует существующий каталог: --graphify /path/to/graphify-site');
  process.exit(1);
}
const graphifyTarPath = graphifyDir ? join(cacheDir, `panel-graphify-${Date.now()}.tgz`) : undefined;
const remoteGraphifyTar = '/tmp/panel-graphify.tgz';

/**
 * `--research-tree <dir>` — залить статику блок-артефакта research-tree (мост
 * /panel/section/research-tree/*, GRP3) в /opt/membrana-research-tree. Каталог —
 * turbo-сборка apps/demos/Research-Tree/dist (vite base './').
 */
const rtreeFlagIndex = process.argv.indexOf('--research-tree');
const rtreeDir = rtreeFlagIndex > -1 ? process.argv[rtreeFlagIndex + 1] : undefined;
if (rtreeFlagIndex > -1 && (!rtreeDir || !existsSync(rtreeDir))) {
  console.error('[fail] --research-tree требует существующий каталог: --research-tree apps/demos/Research-Tree/dist');
  process.exit(1);
}
const rtreeTarPath = rtreeDir ? join(cacheDir, `panel-rtree-${Date.now()}.tgz`) : undefined;
const remoteRtreeTar = '/tmp/panel-rtree.tgz';

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

// Архив в scripts/cache (не tmpdir): Windows bsdtar не знает --force-local.
console.log('Packing panel dist...');
execFileSync('tar', ['-czf', tarPath, '-C', DIST_DIR, '.'], { cwd: repoRoot, stdio: 'inherit' });

if (audioDir) {
  console.log(`Packing compare-audio from ${audioDir}...`);
  execFileSync('tar', ['-czf', audioTarPath, '-C', audioDir, '.'], { cwd: repoRoot, stdio: 'inherit' });
}

if (graphifyDir) {
  console.log(`Packing graphify static from ${graphifyDir}...`);
  execFileSync('tar', ['-czf', graphifyTarPath, '-C', graphifyDir, '.'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

if (rtreeDir) {
  console.log(`Packing research-tree static from ${rtreeDir}...`);
  execFileSync('tar', ['-czf', rtreeTarPath, '-C', rtreeDir, '.'], { cwd: repoRoot, stdio: 'inherit' });
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

echo "=== [2b/4] статика graphify (маршрут-мост /panel/section/graphify) ==="
GRAPHIFY_UPLOADED=${graphifyDir ? '1' : '0'}
if [ "\$GRAPHIFY_UPLOADED" = "1" ] && [ -f ${remoteGraphifyTar} ]; then
  mkdir -p /opt/membrana-graphify
  rm -rf /opt/membrana-graphify/*
  tar -xzf ${remoteGraphifyTar} -C /opt/membrana-graphify
  chmod a+rX /opt/membrana-graphify
  chmod -R a+rX /opt/membrana-graphify
  rm -f ${remoteGraphifyTar}
  echo "  graphify залит (\$(ls /opt/membrana-graphify | wc -l) файлов)"
elif [ -d /opt/membrana-graphify ]; then
  echo "  graphify не передан — оставляю уже лежащий (\$(ls /opt/membrana-graphify 2>/dev/null | wc -l) файлов)"
else
  echo "  graphify нет ни на проде, ни локально — мост отдаст 404 (--graphify <dir>)"
fi

echo "=== [2c/4] статика research-tree (маршрут-мост /panel/section/research-tree) ==="
RTREE_UPLOADED=${rtreeDir ? '1' : '0'}
if [ "\$RTREE_UPLOADED" = "1" ] && [ -f ${remoteRtreeTar} ]; then
  mkdir -p /opt/membrana-research-tree
  rm -rf /opt/membrana-research-tree/*
  tar -xzf ${remoteRtreeTar} -C /opt/membrana-research-tree
  chmod a+rX /opt/membrana-research-tree
  chmod -R a+rX /opt/membrana-research-tree
  rm -f ${remoteRtreeTar}
  echo "  research-tree залит (\$(ls /opt/membrana-research-tree | wc -l) файлов)"
elif [ -d /opt/membrana-research-tree ]; then
  echo "  research-tree не передан — оставляю уже лежащий (\$(ls /opt/membrana-research-tree 2>/dev/null | wc -l) файлов)"
else
  echo "  research-tree нет ни на проде, ни локально — мост отдаст 404 (--research-tree <dir>)"
fi

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
HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 https://${PANEL_DOMAIN}/ || echo 000)
echo "https://${PANEL_DOMAIN} -> HTTP \$HTTP_CODE"
rm -f ${remoteTar}
# T4 (#548): единая машиночитаемая сводка ПОСЛЕДНЕЙ строкой — переживает обрезку лога
# (tail), не нужен ручной remote-grep для верификации выкладки.
echo "[deploy-summary] panel=ok graphify=\$([ -d /opt/membrana-graphify ] && ls /opt/membrana-graphify | wc -l || echo 0) research-tree=\$([ -d /opt/membrana-research-tree ] && ls /opt/membrana-research-tree | wc -l || echo 0) caddy=reloaded https=\$HTTP_CODE"
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
          if (graphifyTarPath) {
            console.log('Uploading graphify static tarball...');
            await sftpPut(conn, graphifyTarPath, remoteGraphifyTar);
          }
          if (rtreeTarPath) {
            console.log('Uploading research-tree static tarball...');
            await sftpPut(conn, rtreeTarPath, remoteRtreeTar);
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
  for (const path of [tarPath, audioTarPath, graphifyTarPath, rtreeTarPath]) {
    if (!path) continue;
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
}
