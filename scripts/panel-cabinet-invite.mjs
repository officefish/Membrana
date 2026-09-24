#!/usr/bin/env node
/**
 * panel-cabinet-invite — чеканка кода приглашения в кабинет (эпик #2369, ADR-0029).
 *
 * Зачем отдельный инструмент: форма «Новый промокод» в панели умеет только
 * «полный доступ (*)» или галочки по разделам панели — поля под произвольный
 * грант в ней нет (осознанное исключение M1 «UI админки под грант не строить»).
 * А дверь кабинета проверяет БУКВУ: panel-users-core.ts:291
 *   if (!promo.grants.includes(CABINET_REGISTER_GRANT)) return refuse('grant_mismatch')
 * Код со «звёздочкой» она отвергает — «все разделы» не включают эту метку.
 * Пока поля в форме нет, приглашения чеканятся здесь.
 *
 * Код печатается в stdout ЦЕЛИКОМ — он и есть предмет работы; всё остальное
 * (префикс, срок, счётчик) идёт в stderr. Секрет сессии читается с VDS и
 * НИКОГДА не печатается. Пишет в ПРОД-стор панели: каждый прогон оставляет
 * строку в журнале («новый промокод») навсегда.
 *
 * Usage:
 *   yarn panel:cabinet-invite --label "второй кабинет" [--days 7] [--uses 1]
 *   yarn panel:cabinet-invite --label x --dry-run     # показать запрос, никуда не ходить
 *   yarn panel:cabinet-invite --label x > invite.txt  # код в файл, отчёт на экран
 */
import { captureOnOffice } from './_ssh-office-exec.mjs';
import { codePrefix, ownerCookieHeader } from './_ssh-panel-smoke.mjs';

/**
 * Держим в синхроне с CABINET_REGISTER_GRANT
 * (packages/background-office/src/modules/panel-users/panel-users-core.ts:235).
 * Дрейф ловит panel-cabinet-invite.test.mjs — читает исходник и сверяет букву.
 */
export const CABINET_REGISTER_GRANT = 'cabinet-register';
export const MINT_PATH = '/v1/panel/admin/promo-codes';

export function parseArgs(argv) {
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const label = value('label');
  const days = Number(value('days') ?? 7);
  const maxUses = Number(value('uses') ?? 1);
  if (!label || label.startsWith('--')) throw new Error('--label обязателен: для кого/случая');
  if (!Number.isInteger(days) || days <= 0) throw new Error('--days: целое число дней больше нуля');
  if (!Number.isInteger(maxUses) || maxUses <= 0)
    throw new Error('--uses: целое число больше нуля');
  return {
    label,
    days,
    maxUses,
    domain: value('domain') || process.env.PANEL_DOMAIN?.trim() || 'panel.mmbrn.tech',
    as: value('as') || 'owner-invite',
    dryRun: argv.includes('--dry-run'),
  };
}

/** Чистая часть: тело запроса чеканки. Грант — литерал, не «*». */
export function buildMintRequest({ label, days, maxUses }) {
  return {
    path: MINT_PATH,
    method: 'POST',
    body: { label, grants: [CABINET_REGISTER_GRANT], days, maxUses },
  };
}

async function readSessionSecret() {
  const fromEnv = process.env.PANEL_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const { code, stdout } = await captureOnOffice(
    "grep -m1 '^PANEL_SESSION_SECRET=' /etc/membrana/office.env | cut -d= -f2-",
  );
  const secret = stdout.trim();
  if (code !== 0 || !secret)
    throw new Error('PANEL_SESSION_SECRET не найден в /etc/membrana/office.env на VDS');
  return secret;
}

async function main() {
  let cli;
  try {
    cli = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(
      `${e.message}\n\nUsage: yarn panel:cabinet-invite --label <для кого> [--days 7] [--uses 1]`,
    );
    process.exitCode = 1;
    return;
  }

  const request = buildMintRequest(cli);
  if (cli.dryRun) {
    console.error(`[dry-run] POST https://${cli.domain}${request.path}`);
    console.error(JSON.stringify(request.body, null, 2));
    return;
  }

  const cookie = ownerCookieHeader(await readSessionSecret(), cli.as);
  const response = await fetch(`https://${cli.domain}${request.path}`, {
    method: request.method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* не-JSON (заглушка caddy и т.п.) — покажем как есть */
  }
  if (response.status !== 201 && response.status !== 200) {
    console.error(`[fail] панель ответила HTTP ${response.status}: ${text.slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }
  if (!json?.code) {
    console.error(`[fail] в ответе нет кода: ${text.slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }

  console.log(json.code);
  console.error(
    `[ok] код ${codePrefix(json.code)} для «${cli.label}» — грант ${CABINET_REGISTER_GRANT}, ` +
      `${cli.days} дн, ${cli.maxUses} использование(й). В панели останется только префикс.`,
  );
}

if (process.argv[1]?.endsWith('panel-cabinet-invite.mjs')) {
  main().catch((e) => {
    console.error(`[fail] ${e.message}`);
    process.exitCode = 1;
  });
}
