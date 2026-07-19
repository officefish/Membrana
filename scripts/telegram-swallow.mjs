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

import { loadDotEnv, resolveDotEnvPaths } from './_anthropic-env.mjs';
import { resolveOfficeToken } from './lib/office-token.mjs';

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
  const { token, source } = resolveOfficeToken(process.env);
  if (!token) {
    console.error('Нет OFFICE_API_TOKEN ни в .env, ни в .env соседних worktree репозитория.');
    process.exit(1);
  }
  if (source && !source.startsWith('env:OFFICE')) {
    // Прозрачность: токен подхвачен не из локального OFFICE_API_TOKEN.
    console.error(`[telegram-swallow] OFFICE_API_TOKEN взят из ${source}`);
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
      if (res.status === 401) {
        // #567 п.2: отказ называет корень, а не симптом — «Invalid token» 16.07
        // на деле означал «подхвачен не тот .env и не та переменная».
        console.error(`  .env загружены (последний побеждает): ${resolveDotEnvPaths().join(' → ') || 'ни одного'}`);
        console.error(`  источник токена: ${source ?? 'не найден'}`);
        console.error('  явный обход: MEMBRANA_ENV_PATH=<путь к .env с OFFICE_API_TOKEN>');
      }
      process.exit(1);
    }
    const body = await res.json().catch(() => ({}));
    // NB6: доказательство доставки. office сегодня возвращает только {ok,sent} —
    // 17.07 это дало ложную тревогу «ласточка Денису не пришла» (пришла в 19:47),
    // потому что sent=true не несёт следа. Печатаем message_id/chat, ЕСЛИ office их
    // вернёт (forward-compat), иначе явно называем ограничение — чтобы «sent=true»
    // не читался как гарантия. Серверная часть (вернуть message_id) — NB6-follow-up.
    const proof = body.messageId ?? body.message_id ?? body.result?.message_id ?? null;
    if (body.sent === true && proof != null) {
      console.log(`[telegram-swallow] доставлено: message_id=${proof}${body.chat ? ` chat=${body.chat}` : ''}`);
    } else if (body.sent === true) {
      console.log('[telegram-swallow] office: sent=true (без message_id — подтверждается только флагом, не следом; NB6-follow-up)');
    } else {
      console.error('[telegram-swallow] office: sent=false — Telegram не сконфигурирован/недоступен на VDS');
    }
    if (body.sent !== true) process.exit(1);
  } catch (err) {
    console.error(`office недоступен: ${err?.message ?? err}`);
    process.exit(1);
  }
}
