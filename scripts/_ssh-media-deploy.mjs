#!/usr/bin/env node
/**
 * Выкладка media на VPS по SSH. Читает BACKGROUND_MEDIA_* из `.env`.
 *
 * ВЕТКА БОЛЬШЕ НЕ ЗАШИТА. До 22.08 здесь стояло `techies68` — ветка, которой на удалённом НЕТ
 * вовсе (`git fetch origin techies68` → «couldn't find remote ref»). Путь выкатки media молча
 * указывал в никуда: скрипт либо падал на сервере, либо оставлял его на старом коде. Порядок
 * «сначала ствол, потом прод» им не исполнялся в принципе — слова `main` он не знал. Найдено
 * проверкой ветки ПЕРЕД выкаткой, а не после (спринт `chart-list-plugin`, 22.08).
 *
 * Способ взят у кабинета, а не изобретён третий: та же цепочка переопределений с умолчанием
 * `main` и те же два предохранителя — сверка локального состояния с `origin/<branch>` (DR0) и
 * отказ выкатывать не-зелёный в CI коммит (DR1). Два разных способа выкатки на одном сервере
 * разъехались бы, и разъехались бы молча.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';
import { deployPreflight } from './_deploy-preflight.mjs';
import { assertCiGreen } from './_deploy-ci-gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envText = readFileSync(resolve(root, '.env'), 'utf8');
const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const branch =
  process.env.MEDIA_GIT_BRANCH || get('MEDIA_GIT_BRANCH') || get('GIT_BRANCH') || 'main';

// DR0: локальное состояние обязано совпадать с origin/<branch> — прод собирается из origin.
const preflight = deployPreflight({ branch, cwd: root, service: 'media' });
// DR1: на прод едет только зелёный в CI коммит.
assertCiGreen({ branch, sha: preflight.originHead });

const host = get('BACKGROUND_MEDIA_IPV4');
const password = get('BACKGROUND_MEDIA_PASSWORD');
const username = 'root';

const remoteScript = `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== [1/6] packages ==="
if ! docker compose version >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y ca-certificates curl git openssl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "docker compose already available"
fi

echo "=== [2/6] swap (OOM guard for docker build) ==="
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
free -h

echo "=== [3/6] dirs ==="
mkdir -p /var/lib/membrana/media-blobs /etc/membrana

echo "=== [4/6] git ==="
cd /root
if [ ! -d membrana/.git ]; then
  git clone --branch "${branch}" https://github.com/officefish/Membrana.git membrana
else
  cd membrana
  git fetch origin "${branch}"
  # reset --hard, а не pull --ff-only: сервер обязан стать РОВНО тем, что в origin. ff-only
  # молча отказывался бы при любом расхождении и оставлял прод на старом коде.
  git reset --hard FETCH_HEAD
  git log -1 --oneline
  cd ..
fi
cd /root/membrana
chmod +x deploy/generate-media-env.sh deploy/media-stack.sh

echo "=== [5/6] media.env ==="
if [ ! -f /etc/membrana/media.env ]; then
  ./deploy/generate-media-env.sh /etc/membrana/media.env
else
  echo "media.env exists, skipping generate"
fi

echo "=== [6/7] docker build (may take several minutes) ==="
./deploy/media-stack.sh build

ln -sf /etc/membrana/media.env packages/background-media/.env.docker

echo "=== [7/7] docker up ==="
./deploy/media-stack.sh up
sleep 12

echo "=== health ==="
curl -fsS http://127.0.0.1:3010/health && echo ""

echo "=== compose ps ==="
./deploy/media-stack.sh ps

echo "=== API token (VITE_MEDIA_API_TOKEN) ==="
# ЗНАЧЕНИЕ НЕ ПЕЧАТАЕМ. Процедура deploy-media-vps (Р3 ADR-0023) прямо требует: секреты и
# env-значения в журнал не пишутся. Прежняя строка делала grep токена целиком, и 23.08 он
# уехал в переписку из вывода выкатки — токен пришлось считать скомпрометированным.
# Выкатке нужно знать, ЗАДАН ли токен, а не какой он.
if grep -qE '^API_INTERNAL_TOKEN=.+' /etc/membrana/media.env; then
  echo "API_INTERNAL_TOKEN: задан, длина $(grep '^API_INTERNAL_TOKEN=' /etc/membrana/media.env | cut -d= -f2- | tr -d '\\n' | wc -c) символов"
else
  echo "API_INTERNAL_TOKEN: НЕ ЗАДАН — кабинет и порты в media не пройдут"
fi
`;

function runDeploy() {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      rejectPromise(new Error('SSH deploy timeout (30m)'));
    }, 30 * 60 * 1000);

    conn
      .on('ready', () => {
        conn.exec(`bash -s`, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            rejectPromise(err);
            return;
          }
          stream.write(remoteScript);
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
      .connect({ host, port: 22, username, password, readyTimeout: 20000 });
  });
}

if (!host || !password) {
  console.error('Missing BACKGROUND_MEDIA_IPV4 or BACKGROUND_MEDIA_PASSWORD');
  process.exit(1);
}

console.log(`Deploying to ${username}@${host} ...\n`);
await runDeploy();
console.log('\nDeploy finished OK.');
