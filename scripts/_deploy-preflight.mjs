#!/usr/bin/env node
/**
 * Deploy preflight gate (DR0 deploy-pipeline-refactor).
 *
 * Прод собирается на VPS из `origin/<branch>` (`git reset --hard FETCH_HEAD`),
 * а локальные проверки идут из рабочего дерева. Этот gate сторожит только то,
 * что может создать ложное ожидание «это уедет в прод», хотя сервер соберёт
 * origin/main: локальная грязь ВНУТРИ build context сервиса и расхождение HEAD.
 *
 * Обход (осознанно): `--allow-dirty` / `DEPLOY_ALLOW_DIRTY=1` требует названной
 * причины `--allow-dirty-reason <text>` / `DEPLOY_DIRTY_REASON=<text>`; deploy-run
 * пишет эту причину в журнал прогона.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { IMAGE_SERVICES, copiedLocalBuildSources } from './verify-image-workspace-deps.mjs';

function git(args, { cwd } = {}) {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    timeout: 20000,
  }).trim();
}

function tryGit(args, opts) {
  try {
    return { ok: true, out: git(args, opts) };
  } catch (err) {
    return { ok: false, out: '', err };
  }
}

function normalizeRelPath(path) {
  return String(path ?? '').trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/$/u, '');
}

function statusPath(line) {
  let path = String(line ?? '').slice(3).trim();
  const rename = path.lastIndexOf(' -> ');
  if (rename !== -1) path = path.slice(rename + 4).trim();
  return normalizeRelPath(path.replace(/^"|"$/gu, ''));
}

function pathMatchesContext(path, context) {
  const p = normalizeRelPath(path);
  const c = normalizeRelPath(context);
  if (!p || !c) return false;
  return c === '.' || p === c || p.startsWith(`${c}/`);
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function timestampFromMediaPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const direct = firstString(
    payload.lastSampleAt,
    payload.lastProbeAt,
    payload.createdAt,
    payload.finishedAt,
    payload.startedAt,
  );
  if (direct) return direct;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const first = items[0];
  return first && typeof first === 'object'
    ? firstString(first.createdAt, first.finishedAt, first.startedAt)
    : null;
}

function fetchJsonSync(url, { token, timeoutMs = 5000 } = {}) {
  const script = `
const url = process.argv[1];
const timeoutMs = Number(process.argv[2] || 5000);
const token = process.env.DEPLOY_MEDIA_PROBE_TOKEN || '';
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  const headers = token ? { 'X-Membrana-Token': token, Authorization: 'Bearer ' + token } : {};
  const res = await fetch(url, { headers, signal: controller.signal });
  const text = await res.text();
  if (!res.ok) {
    console.error('HTTP ' + res.status + ': ' + text.slice(0, 200));
    process.exit(1);
  }
  console.log(text);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  clearTimeout(timer);
}
`;
  try {
    const out = execFileSync(process.execPath, ['-e', script, url, String(timeoutMs)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs + 1000,
      env: { ...process.env, DEPLOY_MEDIA_PROBE_TOKEN: token ?? '' },
    });
    return { ok: true, payload: parseJsonSafe(out) };
  } catch (error) {
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    const message = stderr || (error instanceof Error ? error.message : String(error));
    return { ok: false, error: message };
  }
}

export const MEDIA_LIVE_SESSION_URL_ENV_NAMES = Object.freeze([
  'DEPLOY_MEDIA_LAST_SAMPLE_URL',
  'MEDIA_LAST_SAMPLE_URL',
  'MEDIA_API_URL',
  'BACKGROUND_MEDIA_API_URL',
  'VITE_MEDIA_API_URL',
  'VITE_MEDIA_SERVER_URL',
]);

export const MEDIA_LIVE_SESSION_TOKEN_ENV_NAMES = Object.freeze([
  'DEPLOY_MEDIA_PROBE_TOKEN',
  'MEDIA_API_TOKEN',
  'MEDIA_INTERNAL_TOKEN',
  'VITE_MEDIA_API_TOKEN',
  'API_INTERNAL_TOKEN',
]);

export const MEDIA_LIVE_SESSION_LEGACY_DOOR_ENV_NAMES = Object.freeze([
  'DEPLOY_MEDIA_DEVICE_ID',
  'DEPLOY_MEDIA_COLLECTION_ID',
  'MEDIA_PREFLIGHT_DEVICE_ID',
  'MEDIA_PREFLIGHT_COLLECTION_ID',
]);

export const MEDIA_LIVE_SESSION_MANUAL_CHECK =
  'GET /v1/deploy-preflight/last-sample with X-Membrana-Token';

function firstEnvString(env, names) {
  for (const name of names) {
    const value = firstString(env[name]);
    if (value) return { name, value };
  }
  return null;
}

export function mediaLastSampleTarget(env = process.env) {
  const explicit = firstEnvString(env, ['DEPLOY_MEDIA_LAST_SAMPLE_URL', 'MEDIA_LAST_SAMPLE_URL']);
  if (explicit) return { url: explicit.value, urlSource: explicit.name, legacyDoor: false };
  const api = firstEnvString(env, ['MEDIA_API_URL', 'BACKGROUND_MEDIA_API_URL', 'VITE_MEDIA_API_URL', 'VITE_MEDIA_SERVER_URL']);
  const deviceId = firstEnvString(env, ['DEPLOY_MEDIA_DEVICE_ID', 'MEDIA_PREFLIGHT_DEVICE_ID']);
  const collectionId = firstEnvString(env, ['DEPLOY_MEDIA_COLLECTION_ID', 'MEDIA_PREFLIGHT_COLLECTION_ID']);
  if (!api) return null;
  const base = api.value.replace(/\/$/u, '');
  if (!deviceId || !collectionId) {
    return { url: `${base}/v1/deploy-preflight/last-sample`, urlSource: api.name, legacyDoor: false };
  }
  return {
    url: `${base}/v1/devices/${encodeURIComponent(deviceId.value)}/collections/${encodeURIComponent(collectionId.value)}/samples?page=1&limit=1`,
    urlSource: api.name,
    legacyDoor: true,
    deviceIdSource: deviceId.name,
    collectionIdSource: collectionId.name,
  };
}

function envWithDotenv(cwd, env = process.env) {
  const file = cwd ? resolve(cwd, '.env') : null;
  if (!file || !existsSync(file)) return env;
  const merged = { ...env };
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line.trim());
    if (!match) continue;
    const [, key, value] = match;
    if (merged[key] === undefined) merged[key] = value.trim().replace(/^"|"$/gu, '');
  }
  return merged;
}

function envFlag(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? '').trim());
}

function liveSessionProbeRequired({ service, env = process.env, requireLiveSessionGuard } = {}) {
  if (typeof requireLiveSessionGuard === 'boolean') return requireLiveSessionGuard;
  if (envFlag(env.DEPLOY_REQUIRE_LIVE_SESSION_GUARD)) return true;
  return service === 'media' || service === 'cabinet';
}

export function defaultLiveSessionProbe({ cwd, env = process.env, service, requireLiveSessionGuard, fetchJson = fetchJsonSync } = {}) {
  const resolvedEnv = envWithDotenv(cwd, env);
  const required = liveSessionProbeRequired({ service, env: resolvedEnv, requireLiveSessionGuard });
  const target = mediaLastSampleTarget(resolvedEnv);
  if (!target) {
    const reason = liveSessionConfigHint(
      'live-session guard не знает, где спросить media',
      { includeUrlNames: true, includeTokenNames: true },
    );
    return required ? { status: 'error', reason } : { status: 'skipped', reason };
  }
  const token = firstEnvString(resolvedEnv, MEDIA_LIVE_SESSION_TOKEN_ENV_NAMES);
  if (!token) {
    const reason = liveSessionConfigHint(
      'live-session guard не может авторизоваться в media',
      { includeUrlNames: true, includeTokenNames: true },
    );
    return required ? { status: 'error', reason, source: target.url } : { status: 'skipped', reason, source: target.url };
  }
  const fetched = fetchJson(target.url, {
    token: token.value,
    timeoutMs: Number(resolvedEnv.DEPLOY_MEDIA_PREFLIGHT_TIMEOUT_MS ?? 5000),
  });
  if (!fetched.ok) {
    return { status: 'error', reason: `live-session probe failed: ${fetched.error}`, source: target.url };
  }
  const lastSampleAt = timestampFromMediaPayload(fetched.payload);
  return {
    status: 'ok',
    lastSampleAt,
    source: target.url,
    credentialSource: token.name,
    urlSource: target.urlSource,
    note: liveSessionProbeSourceNote(target, token),
  };
}

function liveSessionConfigHint(problem, { includeUrlNames = false, includeTokenNames = false } = {}) {
  const parts = [problem];
  if (includeUrlNames) parts.push(`адрес ищется в: ${MEDIA_LIVE_SESSION_URL_ENV_NAMES.join(', ')}`);
  if (includeTokenNames) parts.push(`токен ищется в: ${MEDIA_LIVE_SESSION_TOKEN_ENV_NAMES.join(', ')}`);
  parts.push(
    `запасная дверь: DEPLOY_MEDIA_DEVICE_ID + DEPLOY_MEDIA_COLLECTION_ID=__buffer__ -> старый вход списка проб; также ищутся: ${MEDIA_LIVE_SESSION_LEGACY_DOOR_ENV_NAMES.join(', ')}`,
  );
  parts.push(`ручная проверка до выкатки: ${MEDIA_LIVE_SESSION_MANUAL_CHECK}`);
  return parts.join('; ');
}

function liveSessionProbeSourceNote(target, token) {
  const urlSource = `адрес взят из ${target.urlSource}`;
  const tokenSource = `токен взят из ${token.name}`;
  const door = target.legacyDoor
    ? `; запасная дверь ${target.deviceIdSource} + ${target.collectionIdSource}`
    : '';
  return `${urlSource}; ${tokenSource}${door}`;
}

export function liveSessionProblem(probeResult, { now = new Date(), maxAgeMs = 60_000 } = {}) {
  if (!probeResult) return null;
  if (probeResult.status === 'error') {
    const source = probeResult.source ? ` (${probeResult.source})` : '';
    return `live-session guard unavailable: ${probeResult.reason}${source}`;
  }
  if (probeResult.status === 'skipped') return null;
  const ageMs =
    typeof probeResult.ageMs === 'number'
      ? probeResult.ageMs
      : Date.parse(String(probeResult.lastSampleAt ?? '')) > 0
        ? now.getTime() - Date.parse(String(probeResult.lastSampleAt))
        : null;
  if (ageMs === null || !Number.isFinite(ageMs) || ageMs < 0 || ageMs >= maxAgeMs) return null;
  const ageSec = Math.max(0, Math.round(ageMs / 1000));
  const source = probeResult.source ? ` (${probeResult.source})` : '';
  return `устройство пишет: последняя проба ${ageSec} с назад, моложе ${Math.round(maxAgeMs / 1000)} с${source}`;
}

export function dirtyLinesInBuildContext(dirtyLines, buildContextPaths = null) {
  if (buildContextPaths == null) return dirtyLines;
  return dirtyLines.filter((line) => {
    const path = statusPath(line);
    return buildContextPaths.some((context) => pathMatchesContext(path, context));
  });
}

export function deployBuildContextPaths({ service, cwd, buildContextPaths } = {}) {
  if (Array.isArray(buildContextPaths)) {
    return [...new Set(buildContextPaths.map(normalizeRelPath).filter(Boolean))];
  }
  if (!service) return null;
  const spec = IMAGE_SERVICES.find((s) => s.id === service);
  if (!spec) throw new Error(`deploy-preflight: неизвестный service «${service}» — build context не объявлен`);
  const dockerfile = resolve(cwd ?? process.cwd(), spec.dockerfile);
  if (!existsSync(dockerfile)) throw new Error(`deploy-preflight: нет ${spec.dockerfile}`);
  return [
    ...new Set([
      spec.dockerfile,
      ...copiedLocalBuildSources(readFileSync(dockerfile, 'utf8')),
    ].map(normalizeRelPath).filter(Boolean)),
  ];
}

/**
 * Определить, разрешён ли обход gate.
 * @param {string[]} [argv]
 */
export function isAllowDirty(argv = process.argv.slice(2)) {
  return argv.includes('--allow-dirty') || process.env.DEPLOY_ALLOW_DIRTY === '1';
}

export function allowDirtyReason(argv = process.argv.slice(2), env = process.env) {
  const i = argv.indexOf('--allow-dirty-reason');
  const fromArgv = i !== -1 ? argv[i + 1] : null;
  const reason = String(fromArgv ?? env.DEPLOY_DIRTY_REASON ?? '').trim();
  return reason || null;
}

/**
 * Выполнить preflight-проверку перед деплоем.
 * Печатает диагностику; при найденных проблемах и без обхода вызывает process.exit(1).
 *
 * @param {object} opts
 * @param {string} opts.branch        Ветка, которую деплоим (origin/<branch>).
 * @param {string} [opts.cwd]         Корень репозитория.
 * @param {string} [opts.service]     Сервис из IMAGE_SERVICES; включает scoped dirty по Dockerfile COPY.
 * @param {string[]} [opts.buildContextPaths] Тестовый/явный контекст сборки.
 * @param {()=>({lastSampleAt?: string, ageMs?: number, source?: string}|null)} [opts.liveSessionProbe] Проверка живого сеанса записи.
 * @param {number} [opts.liveSessionMaxAgeMs] Свежесть пробы, блокирующая деплой.
 * @param {Date} [opts.now] Часы для зубов.
 * @param {boolean} [opts.allowDirty] Разрешить обход (по умолчанию из argv/env).
 * @param {string|null} [opts.allowDirtyReason] Причина обхода.
 * @param {(code:number)=>never} [opts.exit] Выход; параметр ради зубов.
 * @returns {{ clean: boolean, problems: string[], hardProblems: string[], originHead: string | null, dirtyLines: string[], ignoredDirtyLines: string[], buildContextPaths: string[] | null, allowDirtyReason: string | null, liveSessionProbeStatus: object | null }}
 */
export function deployPreflight({
  branch,
  cwd,
  service,
  buildContextPaths,
  env = process.env,
  liveSessionProbe = defaultLiveSessionProbe,
  requireLiveSessionGuard,
  liveSessionMaxAgeMs = 60_000,
  now = new Date(),
  allowDirty = isAllowDirty(),
  allowDirtyReason: reason = allowDirtyReason(),
  exit = process.exit,
}) {
  const problems = [];
  const hardProblems = [];
  let liveSessionProbeStatus = null;
  let originHead = null;

  const inside = tryGit('rev-parse --is-inside-work-tree', { cwd });
  if (!inside.ok || inside.out !== 'true') {
    console.warn('[preflight] не git-репозиторий — пропускаю проверку чистоты дерева');
    return { clean: true, problems, hardProblems, originHead, dirtyLines: [], ignoredDirtyLines: [], buildContextPaths: null, allowDirtyReason: null, liveSessionProbeStatus };
  }

  const contextPaths = deployBuildContextPaths({ service, cwd, buildContextPaths });

  // 1. Грязь только в build context сервиса. Вне контекста локальный файл физически не
  // попадёт в серверную сборку из origin/main, поэтому это не предмет DR0.
  const status = tryGit('status --porcelain', { cwd });
  const allDirtyLines = status.ok ? status.out.split('\n').filter(Boolean) : [];
  const dirtyLines = dirtyLinesInBuildContext(allDirtyLines, contextPaths);
  const ignoredDirtyLines = allDirtyLines.filter((line) => !dirtyLines.includes(line));
  if (dirtyLines.length > 0) {
    const scope = service ? `контекст сборки ${service}` : 'рабочее дерево';
    problems.push(`${scope} содержит ${dirtyLines.length} незакоммиченных/неотслеживаемых изменений`);
  }

  // 2. Локальный HEAD vs origin/<branch> (то, что реально соберётся на VPS).
  const headRes = tryGit('rev-parse HEAD', { cwd });
  const localHead = headRes.ok ? headRes.out : null;
  const fetched = tryGit(`fetch origin ${branch} --quiet`, { cwd });
  if (fetched.ok) {
    const originRes = tryGit('rev-parse FETCH_HEAD', { cwd });
    originHead = originRes.ok ? originRes.out : null;
  } else {
    console.warn(
      `[preflight] не удалось fetch origin ${branch} (нет сети?) — сравнение с origin пропущено`,
    );
  }
  if (localHead && originHead && localHead !== originHead) {
    const ahead = tryGit(`rev-list --count ${originHead}..${localHead}`, { cwd });
    const behind = tryGit(`rev-list --count ${localHead}..${originHead}`, { cwd });
    const aheadN = ahead.ok ? ahead.out : '?';
    const behindN = behind.ok ? behind.out : '?';
    problems.push(
      `локальный HEAD расходится с origin/${branch}: впереди на ${aheadN}, позади на ${behindN} коммит(ов) — задеплоится версия из origin`,
    );
  }

  let liveProbeResult = null;
  if (liveSessionProbe) {
    try {
      liveProbeResult = liveSessionProbe({ branch, cwd, service, env, requireLiveSessionGuard });
    } catch (error) {
      liveProbeResult = {
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
  liveSessionProbeStatus = liveProbeResult && typeof liveProbeResult === 'object' ? liveProbeResult : null;
  const liveProblem = liveSessionProblem(liveProbeResult, { now, maxAgeMs: liveSessionMaxAgeMs });
  if (liveProblem) hardProblems.push(liveProblem);
  if (liveSessionProbeStatus?.status === 'skipped') {
    const source = liveSessionProbeStatus.source ? ` (${liveSessionProbeStatus.source})` : '';
    console.warn(`[preflight] SKIPPED live-session guard: ${liveSessionProbeStatus.reason}${source}`);
  } else if (liveSessionProbeStatus?.note) {
    console.log(`[preflight] live-session guard: ${liveSessionProbeStatus.note}`);
  }

  if (problems.length === 0 && hardProblems.length === 0) {
    const ignored = ignoredDirtyLines.length > 0 ? `; вне контекста не блокирует: ${ignoredDirtyLines.length}` : '';
    console.log(`[preflight] OK: build context чист и HEAD совпадает с origin/${branch}${ignored}`);
    return { clean: true, problems, hardProblems, originHead, dirtyLines, ignoredDirtyLines, buildContextPaths: contextPaths, allowDirtyReason: null, liveSessionProbeStatus };
  }

  console.error('\n[preflight] ВНИМАНИЕ — локальное состояние ≠ то, что задеплоится из origin:');
  for (const p of problems) console.error(`  • ${p}`);
  for (const p of hardProblems) console.error(`  • ${p}`);
  if (dirtyLines.length > 0) {
    console.error('\n  Незакоммиченные/неотслеживаемые файлы ВНУТРИ build context:');
    for (const line of dirtyLines.slice(0, 40)) console.error(`    ${line}`);
    if (dirtyLines.length > 40) console.error(`    … и ещё ${dirtyLines.length - 40}`);
  }
  if (ignoredDirtyLines.length > 0) {
    console.error(`\n  Вне build context найдено ${ignoredDirtyLines.length} изменений — DR0 их не блокирует.`);
  }
  console.error(
    '\n  Прод собирается из origin/' +
      branch +
      ' — локальные изменения в build context НЕ попадут в сборку.\n  Закоммить и запушь их, либо осознанно обойди gate: --allow-dirty-reason "почему" (или DEPLOY_DIRTY_REASON).\n',
  );

  if (hardProblems.length > 0) {
    console.error('[preflight] live-session guard не разрешил деплой.\n');
    exit(1);
  }

  if (allowDirty) {
    if (!reason) {
      console.error('[preflight] обход включён, но причина не названа — отказ. Укажи --allow-dirty-reason или DEPLOY_DIRTY_REASON.\n');
      exit(1);
    }
    console.error(`[preflight] обход включён: ${reason} — продолжаю.\n`);
    return { clean: false, problems, hardProblems, originHead, dirtyLines, ignoredDirtyLines, buildContextPaths: contextPaths, allowDirtyReason: reason, liveSessionProbeStatus };
  }

  exit(1);
}
