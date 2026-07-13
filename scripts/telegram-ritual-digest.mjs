#!/usr/bin/env node
/**
 * Хвост ритуалов (#428): собрать дайджест дня/вечера из артефактов ритма и
 * PUSH'нуть в office (`POST /v1/telegram/ritual-digest`) — office перешлёт в
 * приватную telegram-группу союзников (push-ingest, как drift-anchor / ADR 0004).
 *
 * Usage:
 *   node scripts/telegram-ritual-digest.mjs --kind day|evening [--dry-run] [--allow-stale]
 *
 * Graceful ВСЕГДА (exit 0): нет артефакта / нет API_INTERNAL_TOKEN / office
 * недоступен → warn и выход, ритуал не блокируется. Source of truth — артефакты
 * в git, недоставленный дайджест не теряет данных.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';
import { extractDayDigest, extractEveningDigest } from './lib/ritual-digest-extract.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const kindIdx = argv.indexOf('--kind');
const kind = kindIdx !== -1 ? argv[kindIdx + 1] : argv.find((a) => a.startsWith('--kind='))?.slice(7);

function skip(message) {
  console.warn(`[telegram-digest] ${message} — пропуск (ритуал не блокируется)`);
  process.exit(0);
}

if (kind !== 'day' && kind !== 'evening') {
  console.error('Usage: node scripts/telegram-ritual-digest.mjs --kind day|evening [--dry-run]');
  process.exit(dryRun ? 1 : 0);
}

function buildPayload() {
  if (kind === 'day') {
    const path = join(repoRoot, 'docs', 'MAIN_DAY_ISSUE.md');
    if (!existsSync(path)) return skip('нет docs/MAIN_DAY_ISSUE.md');
    return extractDayDigest(readFileSync(path, 'utf8'));
  }
  const dir = join(repoRoot, 'docs', 'seanses');
  const latest = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^team-evening-feedback-\d{4}-\d{2}-\d{2}\.md$/.test(f))
        .sort()
        .at(-1)
    : undefined;
  if (!latest) return skip('нет docs/seanses/team-evening-feedback-*.md');
  return extractEveningDigest(readFileSync(join(dir, latest), 'utf8'));
}

const payload = buildPayload();
if (!payload) skip(`не удалось извлечь дайджест (${kind}) из артефакта ритуала`);

// Свежесть: вечерний team-evening-feedback за СЕГОДНЯ появляется после хвоста
// ritual:evening — устаревший артефакт не шлём (иначе группа получит вчерашние
// итоги как сегодняшние). Повторный запуск после feedback / --allow-stale.
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
if (!dryRun && !argv.includes('--allow-stale') && payload.date !== today) {
  skip(`артефакт за ${payload.date}, сегодня ${today} (не шлём устаревшее; --allow-stale для отправки)`);
}

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

loadDotEnv();
// OFFICE_API_TOKEN = токен office VDS (/etc/membrana/office.env, при синке не
// перезаписывается и может отличаться от локального API_INTERNAL_TOKEN).
const token = process.env.OFFICE_API_TOKEN?.trim() || process.env.API_INTERNAL_TOKEN?.trim();
if (!token) skip('нет OFFICE_API_TOKEN/API_INTERNAL_TOKEN в .env/окружении');
const base = (process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech').replace(/\/+$/, '');

try {
  const res = await fetch(`${base}/v1/telegram/ritual-digest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-membrana-token': token },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) skip(`office ответил ${res.status}`);
  const body = await res.json().catch(() => ({}));
  console.log(`[telegram-digest] дайджест (${kind}) принят office: sent=${body.sent === true}`);
} catch (err) {
  skip(`office недоступен: ${err?.message ?? err}`);
}
