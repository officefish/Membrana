/**
 * Утренняя профилактика: сеть/прокси, репозиторий, быстрые тесты скриптов, опционально Anthropic.
 *
 * Запуск (из корня репозитория):
 *   yarn morning-care
 *   yarn morning-care --no-anthropic   — без запроса к API (экономия токенов)
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';

import { loadDotEnv } from './_anthropic-env.mjs';
// Провод ритуала к панели каналов (магистраль #1094 «подвести провода»): префлайт
// проверяет НЕ Anthropic напрямую, а эффективный LLM-канал ритуала (overlay панели →
// цепочка с фолбэком anthropic→openrouter→deepseek). Switch провайдера — через панель.
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';
import { runMorningWiringGate } from './lib/morning-wiring.mjs';
import {
  DEFAULT_BASE_REF,
  DEFAULT_MAX_BEHIND,
  baseHolderGuard,
  findBaseHolders,
  parseWorktreeHolders,
  ritualTreeReady,
  selfHoldsBase,
} from './lib/ritual-tree-hygiene.mjs';

function parseArgs(argv) {
  const noAnthropic = argv.includes('--no-anthropic');
  const help = argv.includes('--help') || argv.includes('-h');
  return { noAnthropic, help };
}

function proxySummary() {
  const https = Boolean(process.env.HTTPS_PROXY?.trim());
  const http = Boolean(process.env.HTTP_PROXY?.trim());
  const dedicated = Boolean(process.env.ANTHROPIC_HTTPS_PROXY?.trim());
  return { https, http, dedicated };
}

/** Быстрая проверка, что на localhost слушает HTTP-прокси (как перед plan:day). */
function probeHttpProxy(proxyUrlStr, timeoutMs = 4000) {
  let u;
  try {
    u = new URL(proxyUrlStr);
  } catch {
    return Promise.resolve({ ok: false, detail: 'некорректный URL прокси' });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return Promise.resolve({ ok: false, detail: 'ожидается http:// или https://' });
  }
  const host = u.hostname;
  const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  if (!Number.isFinite(port) || port <= 0) {
    return Promise.resolve({ ok: false, detail: 'не указан порт в URL прокси' });
  }

  return new Promise((resolve) => {
    const socket = net.connect({ host, port, allowHalfOpen: true }, () => {
      socket.destroy();
      resolve({ ok: true });
    });
    const done = (ok, detail) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({ ok, detail });
    };
    socket.setTimeout(timeoutMs, () => done(false, `таймаут ${timeoutMs} ms`));
    socket.on('error', (err) => done(false, err.code || err.message));
  });
}

function firstProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.ANTHROPIC_HTTPS_PROXY?.trim() ||
    ''
  );
}

/** Git for Windows (schannel) often breaks TLS when HTTPS_PROXY is set; use -c http.proxy instead. */
function gitEnvWithoutProxyEnv() {
  const env = { ...process.env };
  for (const key of [
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'ALL_PROXY',
    'https_proxy',
    'http_proxy',
    'all_proxy',
  ]) {
    delete env[key];
  }
  return env;
}

function runScriptTests(cwd) {
  const testFile = resolve(cwd, 'scripts/context-collector-paths.test.mjs');
  if (!existsSync(testFile)) {
    return { ok: false, detail: 'файл теста не найден' };
  }
  try {
    execFileSync(process.execPath, ['--test', testFile], {
      cwd,
      stdio: 'inherit',
    });
    return { ok: true };
  } catch {
    return { ok: false, detail: 'см. вывод node --test выше' };
  }
}

function gitSnapshot(cwd) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return { inside: false };
  }
  let branchLine = '';
  let statusShort = '';
  try {
    branchLine = execFileSync('git', ['branch', '--show-current'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch {
    branchLine = '(не удалось прочитать ветку)';
  }
  try {
    statusShort = execFileSync('git', ['status', '--short', '--branch'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch {
    statusShort = '(не удалось прочитать статус)';
  }
  return { inside: true, branchLine, statusShort };
}

async function runRitualLlmProbe() {
  try {
    const r = await invokeProcedureLlm({
      procedureId: 'ritual-preflight',
      prompt: 'Одним коротким словом на русском: «ок».',
      maxTokens: 64,
    });
    if (!r.ok) {
      const why = r.error || (r.status ? `HTTP ${r.status}` : 'нет ответа');
      return { ok: false, detail: `LLM-канал ритуала исчерпан по всей цепочке: ${why}` };
    }
    return { ok: true, channel: `${r.provider}/${r.model}` };
  } catch (e) {
    return { ok: false, detail: e?.message || String(e) };
  }
}

/**
 * #1232 Ф1: ритуалу не нужен чекаут main — нужно freshEnough ∧ clean.
 * Порог отставания: MEMBRANA_RITUAL_MAX_BEHIND (по умолчанию 0).
 * Ф2: любой держатель main (чужой или это дерево) — находка с путём, не warn-skip.
 */
const RITUAL_MAX_BEHIND = (() => {
  const raw = process.env.MEMBRANA_RITUAL_MAX_BEHIND?.trim();
  if (raw === undefined || raw === '') return DEFAULT_MAX_BEHIND;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_BEHIND;
})();

function gitRun(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: gitEnvWithoutProxyEnv(),
  });
}

/** Свежесть + чистота + гард держателя main. Checkout main НЕ делается. */
export function ensureRitualTree(cwd, opts = {}) {
  const maxBehind = opts.maxBehind ?? RITUAL_MAX_BEHIND;
  const baseRef = opts.baseRef ?? DEFAULT_BASE_REF;
  try {
    gitRun(cwd, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { ok: false, detail: 'не git-репозиторий', findings: [], blockedBy: [] };
  }

  let current = '';
  try {
    current = gitRun(cwd, ['branch', '--show-current']).trim();
  } catch {
    return { ok: false, detail: 'не удалось прочитать текущую ветку', findings: [], blockedBy: [] };
  }

  let fetchNote = '';
  try {
    const proxy = firstProxyUrl();
    const fetchArgv = proxy
      ? ['-c', `http.proxy=${proxy}`, '-c', `https.proxy=${proxy}`, 'fetch', 'origin', 'main', '--prune']
      : ['fetch', 'origin', 'main', '--prune'];
    gitRun(cwd, fetchArgv);
    fetchNote = 'fetch origin/main ок';
  } catch {
    fetchNote = 'fetch origin/main не прошёл — считаем по локальным refs';
  }

  let behind = 0;
  try {
    behind = Number(gitRun(cwd, ['rev-list', '--count', `HEAD..${baseRef}`]).trim()) || 0;
  } catch {
    return {
      ok: false,
      detail: `не удалось измерить отставание от ${baseRef} (${fetchNote})`,
      findings: [],
      blockedBy: [`свежесть: нет refs ${baseRef}`],
    };
  }

  let porcelain = '';
  try {
    porcelain = gitRun(cwd, ['status', '--porcelain']);
  } catch {
    return { ok: false, detail: 'не удалось проверить чистоту рабочего дерева', findings: [], blockedBy: [] };
  }
  const dirtyPaths = porcelain
    .split(/\r?\n/u)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^.. /, '').trim());

  const ready = ritualTreeReady({
    behind,
    dirtyCount: dirtyPaths.length,
    dirtyPaths,
    maxBehind,
  });

  let holdersPorcelain = '';
  try {
    holdersPorcelain = gitRun(cwd, ['worktree', 'list', '--porcelain']);
  } catch {
    holdersPorcelain = '';
  }
  let root = cwd;
  try {
    root = gitRun(cwd, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    /* cwd как fallback */
  }
  const foreign = findBaseHolders(parseWorktreeHolders(holdersPorcelain), root, 'main');
  const holder = baseHolderGuard(foreign, { selfOnBase: selfHoldsBase(current) });

  const blockedBy = [...ready.blockedBy, ...holder.findings];
  const ok = ready.ok && holder.ok;
  const branchLabel = current || '(detached)';
  const detail = ok
    ? `дерево готово к ритуалу: ${branchLabel}, behind=${behind}/${maxBehind}, чисто (${fetchNote})`
    : `дерево НЕ готово (${branchLabel}): ${blockedBy.join(' · ')}`;

  return { ok, detail, blockedBy, findings: holder.findings, behind, current, fetchNote };
}

const isMain = process.argv[1]?.endsWith('morning-care.mjs');
if (isMain) {
  const cwd = process.cwd();
  const { noAnthropic, help } = parseArgs(process.argv.slice(2));

  if (help) {
    console.log(`Утренняя профилактика (корень репозитория).

  yarn morning-care
  yarn morning-care --no-anthropic   без вызова Anthropic API

Переменные: .env в корне (HTTPS_PROXY и др.), ANTHROPIC_API_KEY для проверки API.
Порог свежести ритуала: MEMBRANA_RITUAL_MAX_BEHIND (по умолчанию 0). Чекаут main не нужен (#1232).
`);
    process.exitCode = 0;
  } else {
    console.log('=== Утренняя профилактика Membrana ===\n');

    loadDotEnv(cwd);

    // F3 / #929: preflight morning-wiring — missing = STOP до остальной профилактики.
    const wiringCode = runMorningWiringGate(cwd);
    if (wiringCode === 2) {
      console.log('\n=== итог ===');
      console.log('[fail] morning-wiring STOP — остальная профилактика не запущена.');
      process.exitCode = 2;
    } else {
      await runMorningCareBody({ cwd, noAnthropic });
    }
  }
}

async function runMorningCareBody({ cwd, noAnthropic }) {
let failed = false;

console.log(`[инфо] Node ${process.version}`);
console.log(`[инфо] cwd: ${cwd}`);

const envPath = resolve(cwd, '.env');
if (existsSync(envPath)) {
  console.log('[ok]   файл .env найден');
} else {
  console.log('[warn] файла .env нет (для API и прокси см. .env.example)');
}

const px = proxySummary();
console.log(
  `[инфо] прокси в окружении: HTTPS_PROXY=${px.https ? 'да' : 'нет'}, HTTP_PROXY=${px.http ? 'да' : 'нет'}, ANTHROPIC_HTTPS_PROXY=${px.dedicated ? 'да' : 'нет'}`,
);

const proxyUrl = firstProxyUrl();
if (proxyUrl) {
  const tcp = await probeHttpProxy(proxyUrl);
  if (tcp.ok) {
    console.log('[ok]   TCP до локального прокси (первый из HTTPS/HTTP/ANTHROPIC_*)');
  } else {
    console.log(`[fail] TCP до прокси: ${tcp.detail ?? 'нет соединения'}`);
    failed = true;
  }
} else {
  console.log('[инфо] прокси не задан — запросы к Anthropic пойдут напрямую');
}

console.log(`\n--- дерево ритуала (fresh∧clean, порог behind≤${RITUAL_MAX_BEHIND}; чекаут main не требуется) ---`);
const tree = ensureRitualTree(cwd);
if (tree.ok) {
  console.log(`[ok]   ${tree.detail}`);
} else {
  for (const line of tree.blockedBy ?? []) console.log(`[fail] ${line}`);
  if (!(tree.blockedBy ?? []).length) console.log(`[fail] ${tree.detail}`);
  failed = true;
}

const git = gitSnapshot(cwd);
if (git.inside) {
  console.log(`[ok]   git ветка: ${git.branchLine || '(detached?)'}`);
  if (git.statusShort) {
    console.log(git.statusShort.split('\n').map((l) => `       ${l}`).join('\n'));
    const lines = git.statusShort.split('\n').filter(Boolean);
    const dirty = lines.some((l) => !l.startsWith('##'));
    if (dirty) {
      console.log('[warn] есть незакоммиченные изменения (это не ошибка проверки)');
    }
  }
} else {
  console.log('[warn] не git-репозиторий — блок git пропущен');
}

console.log('\n--- node --test (scripts) ---');
const tests = runScriptTests(cwd);
if (tests.ok) {
  console.log('[ok]   scripts/context-collector-paths.test.mjs');
} else {
  console.log(`[fail] ${tests.detail}`);
  failed = true;
}

if (!noAnthropic) {
  console.log('\n--- LLM-канал ритуала (короткий запрос) ---');
  const api = await runRitualLlmProbe();
  if (api.ok) {
    console.log(`[ok]   канал жив: ${api.channel}`);
  } else {
    console.log(`[fail] ${api.detail}`);
    failed = true;
  }
  await new Promise((r) => setTimeout(r, 150));
} else {
  console.log('\n[инфо] проверка LLM-канала пропущена (--no-anthropic)');
}

console.log('\n=== итог ===');
if (failed) {
  console.log('[fail] есть ошибки — см. выше.');
  process.exitCode = 1;
} else {
  console.log('[ok]   всё пройдено.');
}
} // runMorningCareBody
