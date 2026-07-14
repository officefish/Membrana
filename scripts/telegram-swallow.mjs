#!/usr/bin/env node
/**
 * «Ласточка» — разовое сообщение в приватную telegram-группу союзников,
 * строго по команде владельца (в ритуалы НЕ встроено, автозапусков нет).
 *
 * Usage:
 *   yarn telegram:swallow "Текст с **md**: жирный, *курсив*, [ссылка](url), `код`"
 *   yarn telegram:swallow --file docs/comms/drafts/note.md
 *   yarn telegram:swallow "..." --dry-run     # показать payload, не отправлять
 *
 * Транспорт — тот же push-ingest, что дайджесты (#428/#434):
 * POST office /v1/telegram/ally-message, office конвертирует md→Telegram-HTML.
 * В отличие от ритуальных хвостов скрипт НЕ graceful: ошибки → exit 1
 * (команда интерактивная, молчаливый пропуск вводил бы в заблуждение).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');

export function resolveSwallowText(args, readFile = (p) => readFileSync(p, 'utf8')) {
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : args.find((a) => a.startsWith('--file='))?.slice(7);
  if (filePath) return readFile(resolve(repoRoot, filePath)).trim();
  const positional = args.filter((a) => !a.startsWith('--'));
  return positional.join(' ').trim();
}

const isMain = process.argv[1]?.endsWith('telegram-swallow.mjs');
if (isMain) {
  const text = resolveSwallowText(argv);
  if (!text) {
    console.error('Usage: yarn telegram:swallow "текст" | --file <path.md> [--dry-run]');
    process.exit(1);
  }
  if (text.length > 4096) {
    console.error(`Текст ${text.length} символов — лимит payload 4096. Сократи или разбей на две ласточки.`);
    process.exit(1);
  }

  const payload = { text };
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  loadDotEnv();
  const token = process.env.OFFICE_API_TOKEN?.trim() || process.env.API_INTERNAL_TOKEN?.trim();
  if (!token) {
    console.error('Нет OFFICE_API_TOKEN/API_INTERNAL_TOKEN в .env/окружении.');
    process.exit(1);
  }
  const base = (process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech').replace(/\/+$/, '');

  try {
    const res = await fetch(`${base}/v1/telegram/ally-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-membrana-token': token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`office ответил ${res.status}: ${await res.text().catch(() => '')}`);
      process.exit(1);
    }
    const body = await res.json().catch(() => ({}));
    console.log(`[telegram-swallow] принято office: sent=${body.sent === true}`);
    if (body.sent !== true) process.exit(1);
  } catch (err) {
    console.error(`office недоступен: ${err?.message ?? err}`);
    process.exit(1);
  }
}
