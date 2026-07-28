#!/usr/bin/env node
/**
 * yarn telegram:file <path> [--caption "…"] — вложение для ласточки (#1398).
 *
 * Тот же путь и тот же ГЕЙТ, что у `telegram:swallow`: отправка только по команде
 * владельца, с зафиксированным черновиком и его «ок» (canSendAlly). Носитель
 * существовал у дайджеста (documentMd/documentName → sendDocument) — этим PR те же
 * поля получил путь ласточки; здесь только локальная обвязка.
 *
 *   yarn telegram:file docs/comms/drafts/note.md --caption "как обещал"
 *   yarn telegram:file <path> --dry-run     # payload без отправки (гейт не зовётся)
 *
 * Границы: файл читается как текст (md-подмножество конвертера office); бинарь и
 * файл > 100 000 символов не отправляются — офис принимает текстовое вложение.
 * ЧУВСТВИТЕЛЬНЫЙ материал не отправляется автоматически — решает владелец, как и
 * с любым содержимым ласточки.
 *
 * Exit: 0 — доставлено / dry-run; 1 — отказ (файл/размер/office); 3 — гейт закрыт.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv, resolveDotEnvPaths } from './_anthropic-env.mjs';
import { canSendAlly, todayIso } from './lib/morning-gates.mjs';
import { resolveOfficeToken } from './lib/office-token.mjs';
import { loadGatesState } from './telegram-swallow.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

const MAX_DOC_CHARS = 100_000;

async function main() {
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Usage: yarn telegram:file <path> [--caption "…"] [--dry-run]');
    return 1;
  }
  const abs = resolve(repoRoot, file);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    console.error(`telegram:file — файл не найден: ${file}`);
    return 1;
  }
  const documentMd = readFileSync(abs, 'utf8');
  if (!documentMd.trim()) {
    console.error(`telegram:file — файл пуст: ${file} (пустое вложение не отправляется)`);
    return 1;
  }
  if (documentMd.length > MAX_DOC_CHARS) {
    console.error(`telegram:file — ${documentMd.length} символов > лимита ${MAX_DOC_CHARS}: office принимает текстовое вложение; разбей файл`);
    return 1;
  }
  const documentName = basename(abs);
  const caption = flag('caption') ?? `Вложение: ${documentName}`;
  const payload = { text: caption, documentMd, documentName };

  if (dryRun) {
    console.log(JSON.stringify({ ...payload, documentMd: `<${documentMd.length} символов>` }, null, 2));
    return 0;
  }

  // ГЕЙТ ласточки (#1233) — тот же, что у текста: день ∧ ack ∧ digest черновика.
  const gate = canSendAlly(loadGatesState(repoRoot), todayIso(), caption);
  if (!gate.ok) {
    console.error('telegram:file — гейт закрыт, отправка запрещена:');
    for (const b of gate.blockedBy) console.error(`  · ${b}`);
    console.error('  путь: yarn morning:gate swallow --draft <file> → показать владельцу → --ack → снова');
    return 3;
  }

  loadDotEnv();
  const { token, source } = resolveOfficeToken(process.env);
  if (!token) {
    console.error(`telegram:file — нет OFFICE_API_TOKEN (.env: ${resolveDotEnvPaths().join(' → ') || 'ни одного'})`);
    return 1;
  }
  if (source && !source.startsWith('env:OFFICE')) console.error(`[telegram:file] токен из ${source}`);
  const base = (process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech').replace(/\/+$/u, '');
  try {
    const res = await fetch(`${base}/v1/telegram/ally-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-membrana-token': token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`telegram:file — office ответил ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return 1;
    }
    const body = await res.json().catch(() => ({}));
    if (body.sent === true) {
      console.log(`telegram:file — отправлено: ${documentName} (${documentMd.length} символов) с подписью «${caption}»`);
      console.log('  sent=true подтверждает доставку, НЕ качество — вложение прочитано глазами до отправки?');
      return 0;
    }
    console.error('telegram:file — office: sent=false (Telegram не сконфигурирован/недоступен)');
    return 1;
  } catch (e) {
    console.error(`telegram:file — office недоступен (доставка не подтверждена): ${String(e?.message ?? e).split('\n')[0]}`);
    return 1;
  }
}

if (process.argv[1]?.endsWith('telegram-file.mjs')) process.exit(await main());
