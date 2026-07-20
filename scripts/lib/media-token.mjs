/**
 * Резолв MEDIA_API_URL / media token (#723) — тот же класс, что office-token (#567).
 *
 * Ловушка: корневой `.env` без MEDIA_API_* + путаница с VPS `API_INTERNAL_TOKEN`
 * (office) → smoke 401 / «взяли не тот env». Media-токен ищем отдельно от office.
 *
 * Приоритет токена: MEDIA_API_TOKEN → MEDIA_INTERNAL_TOKEN → API_INTERNAL_TOKEN
 * только если рядом есть MEDIA_API_URL (иначе office-плейсхолдер не маскируем под media).
 */
import { join } from 'node:path';

import { listWorktreePaths, parseEnvKey } from './office-token.mjs';

const DEFAULT_MEDIA_API_URL = 'https://media.membrana.space';

/**
 * @param {{env: Record<string, string|undefined>, worktreeEnv: {path: string, url: string|null, token: string|null, mediaInternal?: string|null, apiInternal?: string|null}[]}} o
 * @returns {{url: string|null, token: string|null, urlSource: string|null, tokenSource: string|null}}
 */
export function pickMediaEnv({ env, worktreeEnv }) {
  let url = null;
  let urlSource = null;
  /** @type {string|null} path worktree, откуда взят URL (для узкого API_INTERNAL fallback) */
  let urlWorktreePath = null;
  if (env.MEDIA_API_URL?.trim()) {
    url = env.MEDIA_API_URL.trim().replace(/\/$/, '');
    urlSource = 'env:MEDIA_API_URL';
  } else {
    for (const w of worktreeEnv) {
      if (w.url?.trim()) {
        url = w.url.trim().replace(/\/$/, '');
        urlSource = `worktree:${w.path}`;
        urlWorktreePath = w.path;
        break;
      }
    }
  }

  const dedicated = (token, mediaInternal, label) => {
    if (token?.trim()) return { token: token.trim(), tokenSource: `${label}:MEDIA_API_TOKEN` };
    if (mediaInternal?.trim()) {
      return { token: mediaInternal.trim(), tokenSource: `${label}:MEDIA_INTERNAL_TOKEN` };
    }
    return null;
  };

  // 1) Явные media-токены (env, затем любой worktree) — до office API_INTERNAL.
  const fromEnvDedicated = dedicated(env.MEDIA_API_TOKEN, env.MEDIA_INTERNAL_TOKEN, 'env');
  if (fromEnvDedicated) {
    return { url, token: fromEnvDedicated.token, urlSource, tokenSource: fromEnvDedicated.tokenSource };
  }
  for (const w of worktreeEnv) {
    const hit = dedicated(w.token, w.mediaInternal, `worktree:${w.path}`);
    if (hit) return { url, token: hit.token, urlSource, tokenSource: hit.tokenSource };
  }

  // 2) API_INTERNAL_TOKEN только рядом с media URL (не плейсхолдер из чужого worktree).
  if (url && env.API_INTERNAL_TOKEN?.trim() && urlSource?.startsWith('env:')) {
    return {
      url,
      token: env.API_INTERNAL_TOKEN.trim(),
      urlSource,
      tokenSource: 'env:API_INTERNAL_TOKEN(media-fallback)',
    };
  }
  if (url && urlWorktreePath) {
    const home = worktreeEnv.find((w) => w.path === urlWorktreePath);
    if (home?.apiInternal?.trim()) {
      return {
        url,
        token: home.apiInternal.trim(),
        urlSource,
        tokenSource: `worktree:${urlWorktreePath}:API_INTERNAL_TOKEN(media-fallback)`,
      };
    }
  }

  return { url, token: null, urlSource, tokenSource: null };
}

/** Резолв с реальным git+fs. */
export function resolveMediaEnv(env = process.env, cwd = process.cwd()) {
  const worktreeEnv = listWorktreePaths(cwd).map((p) => {
    const envPath = join(p, '.env');
    return {
      path: p,
      url: parseEnvKey(envPath, 'MEDIA_API_URL'),
      token: parseEnvKey(envPath, 'MEDIA_API_TOKEN'),
      mediaInternal: parseEnvKey(envPath, 'MEDIA_INTERNAL_TOKEN'),
      apiInternal: parseEnvKey(envPath, 'API_INTERNAL_TOKEN'),
    };
  });
  return pickMediaEnv({ env, worktreeEnv });
}

/**
 * Диагностика без печати секрета.
 * @returns {{ok: boolean, lines: string[], url: string|null, tokenSource: string|null}}
 */
export function formatMediaEnvCheck(resolved, { defaultUrl = DEFAULT_MEDIA_API_URL } = {}) {
  const lines = [];
  const url = resolved.url || defaultUrl;
  const urlNote = resolved.urlSource
    ? `MEDIA_API_URL=${url} (source=${resolved.urlSource})`
    : `MEDIA_API_URL не задан → default ${defaultUrl}`;
  lines.push(urlNote);
  if (resolved.tokenSource) {
    lines.push(`token: present (source=${resolved.tokenSource})`);
  } else {
    lines.push('token: MISSING (ожидается MEDIA_API_TOKEN или MEDIA_INTERNAL_TOKEN)');
  }
  const ok = Boolean(resolved.token);
  lines.push(ok ? 'media:env:check OK' : 'media:env:check FAIL');
  return { ok, lines, url, tokenSource: resolved.tokenSource };
}

export { DEFAULT_MEDIA_API_URL };
