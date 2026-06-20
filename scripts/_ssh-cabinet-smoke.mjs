#!/usr/bin/env node
/**
 * DR4 (deploy-pipeline-refactor): расширенный пост-деплой smoke для cabinet.
 *
 * Узкий smoke (health + 200 на SPA) был «глухим»: зелёным он мог быть и при мёртвом
 * login / непримененной миграции / упавшем рантайм-канале. Этот скрипт проверяет
 * функциональность сервиса после `up` и падает (exit ≠ 0) при любом провале.
 *
 * Проверки (по VPS через SSH):
 *   1. health          — GET /health
 *   2. login           — POST /v1/auth/login (bootstrap admin) → token
 *   3. auth-me         — GET /v1/auth/me с токеном
 *   4. nodes           — GET /v1/membranes/me (мембрана/узлы доступны)
 *   5. migrate-status  — prisma migrate status в контейнере cabinet-api (нет pending)
 *   6. runtime-channel — WS /v1/nodes/realtime?role=cabinet&token=… открывается и
 *                        не закрывается аутентификацией (канал жив + cabinet-auth ок)
 *
 * Вызывается вручную (`yarn cabinet:smoke:prod`) и из деплоя
 * (`CABINET_SMOKE_AFTER_DEPLOY=1 yarn cabinet:deploy:image:prod`).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'ssh2';

export const smokeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const envPath = resolve(smokeRoot, '.env');
  if (!existsSync(envPath)) return () => '';
  const envText = readFileSync(envPath, 'utf8');
  return (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

const REMOTE_SMOKE = `#!/bin/bash
set -uo pipefail
API="\${CABINET_SMOKE_URL:-https://cabinet.membrana.space}"
PASS=$(grep '^CABINET_BOOTSTRAP_PASSWORD=' /etc/membrana/cabinet.env 2>/dev/null | cut -d= -f2- || true)
LOGIN=$(grep '^CABINET_BOOTSTRAP_LOGIN=' /etc/membrana/cabinet.env 2>/dev/null | cut -d= -f2- || true)
LOGIN="\${LOGIN:-admin}"
FAILED=0

mark(){ if [ "$2" = "0" ]; then echo "[smoke] $1: OK"; else echo "[smoke] $1: FAIL"; FAILED=1; fi; }

# 1. health
curl -fsS "$API/health" >/dev/null 2>&1; mark health $?

# 2. login → token
LOGIN_JSON="{\\"login\\":\\"$LOGIN\\",\\"password\\":\\"$PASS\\"}"
TOKEN=$(curl -fsS -X POST "$API/v1/auth/login" -H 'Content-Type: application/json' -d "$LOGIN_JSON" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)
[ -n "$TOKEN" ]; mark login $?

# 3. auth-me
curl -fsS "$API/v1/auth/me" -H "Authorization: Bearer $TOKEN" >/dev/null 2>&1; mark auth-me $?

# 4. nodes (мембрана/узлы)
curl -fsS "$API/v1/membranes/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('membrane'), 'no membrane'" >/dev/null 2>&1; mark nodes $?

# контейнер cabinet-api
CID=$(docker ps --filter name=cabinet-api --format '{{.ID}}' | head -n1)

# 5. prisma migrate status (нет pending миграций → exit 0)
if [ -n "$CID" ]; then
  docker exec -w /app/packages/background-cabinet "$CID" /app/node_modules/.bin/prisma migrate status >/dev/null 2>&1; mark migrate-status $?
else
  echo "[smoke] migrate-status: FAIL (no cabinet-api container)"; FAILED=1
fi

# 6. runtime-channel: WS открыт и не закрыт аутентификацией
WS_JS='const WebSocket=require("ws");const t=process.env.SMOKE_TOKEN;const ws=new WebSocket("ws://127.0.0.1:3020/v1/nodes/realtime?role=cabinet&token="+t);let done=false;const to=setTimeout(function(){if(!done){done=true;console.error("ws-timeout");process.exit(1);}},8000);ws.on("open",function(){setTimeout(function(){if(!done){done=true;clearTimeout(to);console.log("ws-open-ok");try{ws.close();}catch(e){}process.exit(0);}},1500);});ws.on("close",function(c){if(!done){done=true;clearTimeout(to);console.error("ws-close-"+c);process.exit(1);}});ws.on("error",function(e){if(!done){done=true;clearTimeout(to);console.error("ws-error-"+(e&&e.message));process.exit(1);}});'
if [ -n "$CID" ] && [ -n "$TOKEN" ]; then
  docker exec -e SMOKE_TOKEN="$TOKEN" "$CID" node -e "$WS_JS" >/dev/null 2>&1; mark runtime-channel $?
else
  echo "[smoke] runtime-channel: FAIL (no container or token)"; FAILED=1
fi

if [ "$FAILED" = "0" ]; then echo "CABINET SMOKE OK"; else echo "CABINET SMOKE FAIL"; fi
exit "$FAILED"
`;

/**
 * Прогнать расширенный smoke на VPS. Возвращает структурированную сводку.
 * Не вызывает process.exit.
 */
export async function runCabinetSmoke({ host, password, smokeUrl } = {}) {
  const startedAt = new Date();
  const script = smokeUrl
    ? REMOTE_SMOKE.replace(
        'API="${CABINET_SMOKE_URL:-https://cabinet.membrana.space}"',
        `API="${smokeUrl}"`,
      )
    : REMOTE_SMOKE;

  const { code, out } = await new Promise((resolvePromise) => {
    let buf = '';
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) throw err;
          stream.write(script);
          stream.end();
          stream.on('data', (d) => {
            buf += d.toString();
            process.stdout.write(d);
          });
          stream.stderr.on('data', (d) => {
            buf += d.toString();
            process.stderr.write(d);
          });
          stream.on('close', (c) => {
            conn.end();
            resolvePromise({ code: c ?? 1, out: buf });
          });
        });
      })
      .on('error', (e) => resolvePromise({ code: 1, out: `[ssh-error] ${e?.message ?? e}` }))
      .connect({ host, port: 22, username: 'root', password, readyTimeout: 60000 });
  });

  const checks = [...out.matchAll(/^\[smoke\] ([\w-]+): (OK|FAIL)/gm)].map((m) => ({
    name: m[1],
    ok: m[2] === 'OK',
  }));
  const finishedAt = new Date();
  const ok = code === 0 && /CABINET SMOKE OK/.test(out);

  return {
    service: 'cabinet',
    kind: 'smoke',
    checks,
    failed: checks.filter((c) => !c.ok).map((c) => c.name),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    exitCode: code,
    ok,
  };
}

async function main() {
  const get = readEnv();
  const host = get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    console.error('Set BACKGROUND_MEDIA_IPV4 and BACKGROUND_MEDIA_PASSWORD in .env');
    process.exit(1);
  }
  const smokeUrl = process.env.CABINET_SMOKE_URL || '';
  const summary = await runCabinetSmoke({ host, password, smokeUrl: smokeUrl || undefined });
  console.log(`\n=== cabinet smoke summary ===`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}
