#!/usr/bin/env node
/**
 * panel-invite — чеканка ally invite-кодов панели (OP2, эпик #438).
 *
 * Формат идентичен panel-auth-core (office): base64url(JSON{kind:'invite',
 * role:'ally', label, exp}) + '.' + base64url(HMAC-SHA256). Без хранилища:
 * код самодостаточен, office проверяет чистой функцией. Секрет читается из
 * .env (PANEL_INVITE_SECRET, fallback PANEL_SESSION_SECRET) и НЕ печатается.
 *
 *   yarn panel:invite --label druid-friend            # 30 дней по умолчанию
 *   yarn panel:invite --label press --days 7
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

export function mintInviteCode(secret, label, expSec) {
  const body = Buffer.from(
    JSON.stringify({ kind: 'invite', role: 'ally', label, exp: expSec }),
    'utf8',
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest().toString('base64url');
  return `${body}.${sig}`;
}

function readSecret() {
  let text = '';
  try {
    text = readFileSync(path.join(REPO_ROOT, '.env'), 'utf8');
  } catch {
    /* возьмём process.env */
  }
  const fromFile = (name) =>
    text
      .split('\n')
      .find((l) => l.startsWith(`${name}=`))
      ?.slice(name.length + 1)
      .trim();
  return (
    process.env.PANEL_INVITE_SECRET?.trim() ||
    process.env.PANEL_SESSION_SECRET?.trim() ||
    fromFile('PANEL_INVITE_SECRET') ||
    fromFile('PANEL_SESSION_SECRET') ||
    null
  );
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const label = arg('label');
  const days = Number(arg('days') ?? 30);
  if (!label || !Number.isFinite(days) || days <= 0) {
    console.error('Usage: yarn panel:invite --label <who> [--days 30]');
    process.exit(1);
  }
  const secret = readSecret();
  if (!secret) {
    console.error('[fail] нет PANEL_INVITE_SECRET / PANEL_SESSION_SECRET в .env или окружении');
    process.exit(1);
  }
  const exp = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
  console.log(mintInviteCode(secret, label, exp));
  console.error(`[ok] ally-код для «${label}», истекает через ${days} дн (${new Date(exp * 1000).toISOString()})`);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
