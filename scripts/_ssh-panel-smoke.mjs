#!/usr/bin/env node
/**
 * _ssh-panel-smoke — прод-смоук панели с owner-cookie (п.3 ретро #485).
 *
 * За сессию 2026-07-14 крипто-заготовка owner-cookie переписывалась инлайном
 * `node -e` трижды (pu1-smoke, pu2-smoke, check-code) — каждый раз заново и
 * каждый раз чуть иначе. Здесь она одна и покрыта тестом.
 *
 * Сценарий (живой контур PU1, эпик #438): owner видит admin → аноним получает
 * 404 → чеканка промокода → регистрация партнёра по нему → правка грантов
 * поднимает эпоху permVersion → revoke партнёра → revoke промокода.
 *
 * Секрет PANEL_SESSION_SECRET читается с VDS (/etc/membrana/office.env) и
 * НИКОГДА не печатается; промокод смоука — 1 день / 1 использование, в логе
 * только префикс, в конце отзывается.
 *
 * Usage:
 *   node scripts/_ssh-panel-smoke.mjs --read-only   # только чтение: доступ + 404 анониму
 *   node scripts/_ssh-panel-smoke.mjs               # полный сценарий (ПИШЕТ в прод-стор)
 *   node scripts/_ssh-panel-smoke.mjs --domain panel.mmbrn.tech
 *
 * Полный прогон оставляет в сторе отозванного партнёра и отозванный промокод —
 * следы «навсегда» (стор не удаляет строки). Для регулярной проверки живости
 * панели берите --read-only.
 */
import { createHmac } from 'node:crypto';

import { captureOnOffice } from './_ssh-office-exec.mjs';

const DOMAIN =
  (process.argv.includes('--domain') ? process.argv[process.argv.indexOf('--domain') + 1] : null) ||
  process.env.PANEL_DOMAIN?.trim() ||
  'panel.mmbrn.tech';

const BASE = `https://${DOMAIN}`;
const READ_ONLY = process.argv.includes('--read-only');
/** Держим в синхроне с panel-auth-core.ts (PANEL_SESSION_COOKIE). */
export const PANEL_SESSION_COOKIE = 'membrana_panel_session';

// ─── чеканка owner-cookie (формат panel-auth-core: b64url(payload).b64url(hmac)) ───

/**
 * Owner-session токен. Формат обязан совпадать с signPayload/verifyPayload в
 * packages/background-office/src/modules/panel-auth/panel-auth-core.ts —
 * дрейф ловит _ssh-panel-smoke.test.mjs (вектор + сверка с собранным ядром).
 */
export function mintOwnerToken(secret, sub, expSec) {
  const payload = { kind: 'session', role: 'owner', sub, exp: expSec };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = createHmac('sha256', secret).update(body).digest().toString('base64url');
  return `${body}.${mac}`;
}

export function ownerCookieHeader(secret, sub = 'smoke-owner', ttlSec = 300, nowSec = nowSeconds()) {
  return `${PANEL_SESSION_COOKIE}=${mintOwnerToken(secret, sub, nowSec + ttlSec)}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** Промокод целиком в лог не уходит — как и в самой панели (консилиум Р5). */
export function codePrefix(code) {
  return `${String(code).slice(0, 6)}…`;
}

// ─── сценарий ─────────────────────────────────────────────────────────────────────

async function readSessionSecret() {
  const { code, stdout } = await captureOnOffice(
    "grep -m1 '^PANEL_SESSION_SECRET=' /etc/membrana/office.env | cut -d= -f2-",
  );
  const secret = stdout.trim();
  if (code !== 0 || !secret) {
    throw new Error('PANEL_SESSION_SECRET не найден в /etc/membrana/office.env на VDS');
  }
  return secret;
}

async function call(path, { method = 'GET', cookie, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* не-JSON (404-заглушка caddy и т.п.) — оставляем null */
  }
  return { status: response.status, json, text };
}

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  [ok] ${label}`);
  } else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
    failures += 1;
  }
  return condition;
}

async function main() {
  console.log(`Panel smoke → ${BASE}\n`);
  const secret = await readSessionSecret();
  const owner = ownerCookieHeader(secret);
  console.log('owner-cookie отчеканен из PANEL_SESSION_SECRET (значение не печатается)\n');

  console.log('=== 1. доступ ===');
  const asOwner = await call('/v1/panel/admin/users', { cookie: owner });
  check('owner видит admin/users', asOwner.status === 200, `HTTP ${asOwner.status}`);
  const anon = await call('/v1/panel/admin/users');
  check('аноним получает 404 на admin (не 401/403)', anon.status === 404, `HTTP ${anon.status}`);

  if (READ_ONLY) {
    console.log('\n--read-only: пишущие шаги (промокод → партнёр → эпоха → revoke) пропущены.');
    return;
  }

  console.log('=== 2. чеканка промокода ===');
  const label = `smoke-${new Date().toISOString().slice(0, 16)}`;
  const minted = await call('/v1/panel/admin/promo-codes', {
    method: 'POST',
    cookie: owner,
    body: { label, grants: ['*'], days: 1, maxUses: 1 },
  });
  if (!check('промокод отчеканен', minted.status === 201 || minted.status === 200, `HTTP ${minted.status}`)) {
    return;
  }
  const promoId = minted.json?.id;
  const promoCode = minted.json?.code;
  console.log(`  промокод ${codePrefix(promoCode)} (1 день, 1 использование, отзовём в конце)`);

  console.log('=== 3. регистрация партнёра ===');
  const registered = await call('/v1/panel/register', {
    method: 'POST',
    body: { code: promoCode, name: label },
  });
  check('партнёр зарегистрирован', registered.json?.ok === true, `HTTP ${registered.status}`);
  check('роль ally', registered.json?.role === 'ally', String(registered.json?.role));

  const users = await call('/v1/panel/admin/users', { cookie: owner });
  const user = users.json?.users?.find((u) => u.name === label);
  if (!check('партнёр виден в admin/users', Boolean(user))) return;

  console.log('=== 4. эпоха прав (permVersion) ===');
  const before = user.permVersion;
  const patched = await call(`/v1/panel/admin/users/${user.id}/grants`, {
    method: 'PATCH',
    cookie: owner,
    body: { grants: ['detector-compare'] },
  });
  check('гранты изменены', patched.json?.ok === true, `HTTP ${patched.status}`);
  check(
    `permVersion поднялся (${before} → ${patched.json?.permVersion})`,
    typeof patched.json?.permVersion === 'number' && patched.json.permVersion > before,
  );

  console.log('=== 5. revoke ===');
  const revoked = await call(`/v1/panel/admin/users/${user.id}/revoke`, { method: 'POST', cookie: owner });
  check('партнёр отозван', revoked.json?.ok === true, `HTTP ${revoked.status}`);
  const after = await call('/v1/panel/admin/users', { cookie: owner });
  check(
    'revoked=true в списке',
    after.json?.users?.find((u) => u.id === user.id)?.revoked === true,
  );

  if (promoId) {
    const revokedCode = await call(`/v1/panel/admin/promo-codes/${promoId}/revoke`, {
      method: 'POST',
      cookie: owner,
    });
    check('промокод смоука отозван (за собой убрано)', revokedCode.json?.ok === true);
  }
}

// Гард запуска (как в _ssh-media-exec/_ssh-office-exec): без него `import` из теста
// увёл бы смоук на живой прод.
if (process.argv[1]?.endsWith('_ssh-panel-smoke.mjs')) {
  // exitCode вместо process.exit(): обрыв процесса с недописанным pipe-stdout роняет
  // libuv на Windows ассертом UV_HANDLE_CLOSING (код 127) — зелёный смоук под `| tail`
  // выглядел упавшим. Соединение закрыто в endConnection, держать процесс нечему.
  main()
    .then(() => {
      console.log(failures === 0 ? '\nPanel smoke OK' : `\nPanel smoke: ${failures} провал(ов)`);
      process.exitCode = failures === 0 ? 0 : 1;
    })
    .catch((e) => {
      console.error('\nSMOKE ERR', e.message);
      process.exitCode = 1;
    });
}
