#!/usr/bin/env node
/**
 * «Ласточка» — разовое сообщение в приватную telegram-группу союзников,
 * строго по команде владельца (в ритуалы НЕ встроено, автозапусков нет).
 *
 * Usage:
 *   yarn telegram:swallow "Текст с **md**: жирный, *курсив*, [ссылка](url), `код`"
 *   yarn telegram:swallow --file docs/comms/drafts/note.md
 *   yarn telegram:swallow "..." --dry-run     # показать payload, не отправлять
 *   yarn telegram:swallow "..." --force       # обойти ledger (повтор после delivered/unknown)
 *
 * Транспорт — тот же push-ingest, что дайджесты (#428/#434):
 * POST office /v1/telegram/ally-message, office конвертирует md→Telegram-HTML.
 * В отличие от ритуальных хвостов скрипт НЕ graceful: ошибки → exit 1
 * (команда интерактивная, молчаливый пропуск вводил бы в заблуждение).
 *
 * Идемпотентность (карточка swallow-delivery-idempotency): клиентский ledger
 * `.membrana/swallow-deliveries.jsonl`. Таймаут ≠ недоставка (exit 3 = unknown).
 *
 * След для графа правды (#585): docs/comms/sent-log.jsonl после sent=true
 * (хеш + путь черновика, не тело).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv, resolveDotEnvPaths } from './_anthropic-env.mjs';
import {
  appendSentLog,
  defaultSentLogPath,
  hashSentPayload,
  redactOfficeResponse,
  toRepoRelativeFile,
} from './lib/comms-sent-log.mjs';
import { resolveOfficeToken } from './lib/office-token.mjs';
import {
  SWALLOW_EXIT_UNKNOWN,
  computeDeliveryKey,
  defaultLedgerPath,
  latestStatus,
  recordDelivery,
} from './lib/swallow-delivery-ledger.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');

export function resolveSwallowText(args, readFile = (p) => readFileSync(p, 'utf8')) {
  return resolveSwallowSource(args, readFile).text;
}

/**
 * @returns {{ text: string, file: string|null }}
 */
export function resolveSwallowSource(args, readFile = (p) => readFileSync(p, 'utf8')) {
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : args.find((a) => a.startsWith('--file='))?.slice(7);
  if (filePath) {
    const abs = resolve(repoRoot, filePath);
    return { text: readFile(abs).trim(), file: toRepoRelativeFile(repoRoot, abs) };
  }
  const positional = args.filter((a) => !a.startsWith('--'));
  return { text: positional.join(' ').trim(), file: null };
}

/**
 * Классификация ошибки транспорта: таймаут/abort → unknown, иначе failed.
 * @param {unknown} err
 * @returns {'unknown'|'failed'}
 */
export function classifySwallowTransportError(err) {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (name === 'TimeoutError' || name === 'AbortError') return 'unknown';
  if (/timeout|aborted|UND_ERR_CONNECT_TIMEOUT|HeadersTimeoutError|BodyTimeoutError/i.test(msg)) {
    return 'unknown';
  }
  return 'failed';
}

/**
 * @param {{
 *   text: string,
 *   force?: boolean,
 *   ledgerPath?: string,
 *   sentLogPath?: string|null,
 *   sourceFile?: string|null,
 *   fetchImpl?: typeof fetch,
 *   baseUrl?: string,
 *   token?: string,
 *   tokenSource?: string|null,
 *   envPaths?: string[],
 * }} opts
 */
export async function sendSwallow(opts) {
  const {
    text,
    force: forceSend = false,
    ledgerPath = defaultLedgerPath(repoRoot),
    // По умолчанию null: unit-тесты не пишут в docs/comms/. CLI main передаёт defaultSentLogPath.
    sentLogPath = null,
    sourceFile = null,
    fetchImpl = fetch,
    baseUrl = 'https://office.mmbrn.tech',
    token,
    tokenSource = null,
    envPaths = [],
  } = opts;

  const key = computeDeliveryKey(text);
  const prev = latestStatus(ledgerPath, key);
  if (!forceSend && prev?.status === 'delivered') {
    return {
      outcome: 'skipped-delivered',
      key,
      exitCode: 0,
      message: `[telegram-swallow] уже доставлено (ledger ${prev.at}${prev.messageId ? `, message_id=${prev.messageId}` : ''}) — повтор пропущен; --force для принудительной отправки`,
    };
  }

  const base = baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetchImpl(`${base}/v1/telegram/ally-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-membrana-token': token },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      recordDelivery(ledgerPath, { key, status: 'failed', error: `HTTP ${res.status}` });
      return {
        outcome: 'http-error',
        key,
        exitCode: 1,
        status: res.status,
        bodyText,
        tokenSource,
        envPaths,
      };
    }
    const body = await res.json().catch(() => ({}));
    const proof = body.messageId ?? body.message_id ?? body.result?.message_id ?? null;
    if (body.sent === true) {
      recordDelivery(ledgerPath, { key, status: 'delivered', messageId: proof });
      if (sentLogPath) {
        appendSentLog(sentLogPath, {
          kind: 'swallow',
          file: sourceFile,
          sha256: hashSentPayload(text),
          sent: true,
          office_response: redactOfficeResponse(body),
        });
      }
      return {
        outcome: 'delivered',
        key,
        exitCode: 0,
        proof,
        sent: true,
      };
    }
    recordDelivery(ledgerPath, { key, status: 'failed', error: 'sent=false' });
    return { outcome: 'not-sent', key, exitCode: 1, sent: false };
  } catch (err) {
    const kind = classifySwallowTransportError(err);
    const errMsg = err instanceof Error ? err.message : String(err);
    recordDelivery(ledgerPath, { key, status: kind, error: errMsg });
    if (kind === 'unknown') {
      return {
        outcome: 'unknown',
        key,
        exitCode: SWALLOW_EXIT_UNKNOWN,
        error: errMsg,
        message:
          `[telegram-swallow] статус неизвестен (таймаут/обрыв после возможной доставки): ${errMsg}\n` +
          '  Не повторяй вслепую — проверь Telegram. Повтор только с --force.',
      };
    }
    return {
      outcome: 'transport-failed',
      key,
      exitCode: 1,
      error: errMsg,
      message: `[telegram-swallow] office недоступен (доставка не подтверждена): ${errMsg}`,
    };
  }
}

const isMain = process.argv[1]?.endsWith('telegram-swallow.mjs');
if (isMain) {
  const { text, file: sourceFile } = resolveSwallowSource(argv);
  if (!text) {
    console.error('Usage: yarn telegram:swallow "текст" | --file <path.md> [--dry-run] [--force]');
    process.exitCode = 1;
  } else if (text.length > 4096) {
    console.error(`Текст ${text.length} символов — лимит payload 4096. Сократи или разбей на две ласточки.`);
    process.exitCode = 1;
  } else if (dryRun) {
    console.log(JSON.stringify({ text }, null, 2));
  } else {
    loadDotEnv();
    const { token, source } = resolveOfficeToken(process.env);
    if (!token) {
      console.error('Нет OFFICE_API_TOKEN ни в .env, ни в .env соседних worktree репозитория.');
      process.exitCode = 1;
    } else {
      if (source && !source.startsWith('env:OFFICE')) {
        console.error(`[telegram-swallow] OFFICE_API_TOKEN взят из ${source}`);
      }
      const base = process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech';
      const result = await sendSwallow({
        text,
        force,
        sourceFile,
        sentLogPath: defaultSentLogPath(repoRoot),
        token,
        tokenSource: source,
        envPaths: resolveDotEnvPaths(),
        baseUrl: base,
      });

      if (result.outcome === 'skipped-delivered') {
        console.log(result.message);
      } else if (result.outcome === 'delivered') {
        if (result.proof != null) {
          console.log(`[telegram-swallow] доставлено: message_id=${result.proof}`);
        } else {
          console.log(
            '[telegram-swallow] office: sent=true (без message_id — подтверждается только флагом, не следом; NB6-follow-up)',
          );
        }
      } else if (result.outcome === 'http-error') {
        console.error(`office ответил ${result.status}: ${result.bodyText}`);
        if (result.status === 401) {
          console.error(`  .env загружены (последний побеждает): ${result.envPaths.join(' → ') || 'ни одного'}`);
          console.error(`  источник токена: ${result.tokenSource ?? 'не найден'}`);
          console.error('  явный обход: MEMBRANA_ENV_PATH=<путь к .env с OFFICE_API_TOKEN>');
        }
      } else if (result.outcome === 'not-sent') {
        console.error('[telegram-swallow] office: sent=false — Telegram не сконфигурирован/недоступен на VDS');
      } else if (result.message) {
        console.error(result.message);
      }

      process.exitCode = result.exitCode;
    }
  }
}
