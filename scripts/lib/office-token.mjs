/**
 * Резолв OFFICE_API_TOKEN для ласточек/дайджестов из ЛЮБОГО worktree репозитория.
 *
 * Трение 17.07: параллельная сессия шла в worktree `Membrana-openrouter`, чей .env
 * несёт только плейсхолдер `API_INTERNAL_TOKEN` (9 симв.); рабочий `OFFICE_API_TOKEN`
 * (64 симв.) — в .env основного worktree. Старый код брал `OFFICE_API_TOKEN ||
 * API_INTERNAL_TOKEN`, не находил первый и слал плейсхолдер → office 401 → ласточка
 * Антону и Денису не уходила. Резолвер ищет токен по .env всех worktree ЭТОГО репо
 * (git worktree list) — не по произвольным путям (граница безопасности).
 *
 * Приоритет: env.OFFICE_API_TOKEN → OFFICE_API_TOKEN из .env соседних worktree →
 * env.API_INTERNAL_TOKEN (последний резерв; в openrouter это плейсхолдер).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Достать значение ключа из .env-файла (без значения в логах). @returns string|null */
export function parseEnvKey(envPath, key, read = readFileSync, exists = existsSync) {
  if (!exists(envPath)) return null;
  for (const raw of String(read(envPath, 'utf8')).split(/\r?\n/)) {
    const line = raw.replace(/^\s*export\s+/, '');
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return null;
}

/**
 * Чистый выбор токена по источникам (тестируемо без git/fs).
 * @param {{env:Record<string,string|undefined>, worktreeTokens:{path:string,token:string|null}[]}} o
 * @returns {{token:string|null, source:string|null}}
 */
export function pickOfficeToken({ env, worktreeTokens }) {
  if (env.OFFICE_API_TOKEN?.trim()) return { token: env.OFFICE_API_TOKEN.trim(), source: 'env:OFFICE_API_TOKEN' };
  for (const w of worktreeTokens) {
    if (w.token?.trim()) return { token: w.token.trim(), source: `worktree:${w.path}` };
  }
  if (env.API_INTERNAL_TOKEN?.trim()) {
    return { token: env.API_INTERNAL_TOKEN.trim(), source: 'env:API_INTERNAL_TOKEN(fallback)' };
  }
  return { token: null, source: null };
}

/** Пути worktree этого репозитория. */
export function listWorktreePaths(cwd = process.cwd()) {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length).trim());
  } catch {
    return [];
  }
}

/** Резолв с реальным git+fs. */
export function resolveOfficeToken(env = process.env, cwd = process.cwd()) {
  const worktreeTokens = listWorktreePaths(cwd).map((p) => ({ path: p, token: parseEnvKey(join(p, '.env'), 'OFFICE_API_TOKEN') }));
  return pickOfficeToken({ env, worktreeTokens });
}
