#!/usr/bin/env node
/**
 * yarn network:analysis:archive [--execute]
 *
 * Retention дома network (#1913, В5): ленты analysis/YYYY-MM-DD старше 90 дней —
 * кандидаты на перекладку в analysis/archive/YYYY-MM/. По требованию, НЕ автоматом
 * (вердикт M5). Перекладка, не удаление: ряд не теряется. Без --execute — план.
 */
import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANALYSIS = join(root, 'docs', 'audit', 'network', 'analysis');
export const HOT_DAYS = 90;

/**
 * @param {{ now?: Date, execute?: boolean, log?: (s: string) => void }} [deps]
 * @returns {number}
 */
export function runArchiveNetworkAnalysis(deps = {}) {
  const log = deps.log ?? console.log;
  const now = deps.now ?? new Date();
  const execute = deps.execute ?? false;
  if (!existsSync(ANALYSIS)) {
    log('лент нет — перекладывать нечего');
    return 0;
  }
  const cutoff = now.getTime() - HOT_DAYS * 24 * 60 * 60 * 1000;
  const days = readdirSync(ANALYSIS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/u.test(e.name))
    .map((e) => e.name)
    .filter((d) => Date.parse(`${d}T00:00:00Z`) < cutoff)
    .sort();
  if (days.length === 0) {
    log(`горячий горизонт ${HOT_DAYS} дн чист — кандидатов на перекладку нет`);
    return 0;
  }
  for (const day of days) {
    const month = day.slice(0, 7);
    const dest = join(ANALYSIS, 'archive', month, day);
    if (execute) {
      mkdirSync(dirname(dest), { recursive: true });
      renameSync(join(ANALYSIS, day), dest);
      log(`✓ переложено: ${day} → archive/${month}/`);
    } else {
      log(`· кандидат: ${day} → archive/${month}/ (добавь --execute)`);
    }
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/archive-network-analysis.mjs')) {
  process.exitCode = runArchiveNetworkAnalysis({ execute: process.argv.includes('--execute') });
}
