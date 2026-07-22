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

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
// Занятость ветки соседним worktree уже решена в pr:ship (#476 п.2) — берём оттуда,
// а не пишем второй раз: разъехались бы, как разъехались бы pr:land и pr:ship.
import { isBaseHeldElsewhere, otherWorktreeBranches } from './pr-ship.mjs';
import { runMorningWiringGate } from './lib/morning-wiring.mjs';

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

function gitPullArgv(branchName, proxy) {
  const pull = ['pull', '--ff-only', 'origin', branchName];
  if (!proxy) return pull;
  return ['-c', `http.proxy=${proxy}`, '-c', `https.proxy=${proxy}`, ...pull];
}

function gitBehindOrigin(cwd, branchName) {
  try {
    const line = execFileSync(
      'git',
      ['rev-list', '--left-right', '--count', `origin/${branchName}...HEAD`],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: gitEnvWithoutProxyEnv() },
    ).trim();
    const [behind] = line.split(/\s+/).map((n) => Number(n));
    return Number.isFinite(behind) ? behind : null;
  } catch {
    return null;
  }
}

function runGitPull(cwd, branchName) {
  const proxy = firstProxyUrl();
  const attempts = proxy
    ? [
        { argv: gitPullArgv(branchName, proxy), label: 'через http.proxy' },
        { argv: gitPullArgv(branchName, ''), label: 'напрямую (без прокси)' },
      ]
    : [{ argv: gitPullArgv(branchName, ''), label: 'напрямую' }];

  let lastErr;
  for (const { argv, label } of attempts) {
    try {
      execFileSync('git', argv, { cwd, stdio: 'inherit', env: gitEnvWithoutProxyEnv() });
      return { ok: true, detail: label };
    } catch (e) {
      lastErr = e;
    }
  }

  const behind = gitBehindOrigin(cwd, branchName);
  if (behind === 0) {
    return {
      ok: true,
      detail: 'pull не удался (сеть/прокси), но локально не отстаём от origin',
    };
  }
  return { ok: false, detail: lastErr?.message || 'pull не удался' };
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

async function runAnthropicProbe() {
  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    return { ok: false, detail: e.message };
  }
  const model = defaultModel();
  const bodyJson = {
    model,
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Одним коротким словом на русском: «ок».',
          },
        ],
      },
    ],
  };
  try {
    const { ok, status, text } = await anthropicPost('https://api.anthropic.com/v1/messages', {
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      bodyJson,
    });
    if (!ok) {
      printAnthropicHttpError(status, text);
      return { ok: false, detail: `HTTP ${status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e?.message || String(e) };
  }
}

// 2026-07-03: повседневная интеграция — main (DR5 «main деплоируемое»);
// techies68 синхронизирована с main и уходит в архив регламентом DR5.
const DEFAULT_WORK_BRANCH = process.env.MEMBRANA_WORK_BRANCH?.trim() || 'main';

function ensureWorkBranch(cwd, branchName) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return { ok: false, skipped: true, detail: 'не git-репозиторий' };
  }

  let current = '';
  try {
    current = execFileSync('git', ['branch', '--show-current'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return { ok: false, skipped: false, detail: 'не удалось прочитать текущую ветку' };
  }

  if (current === branchName) {
    const pull = runGitPull(cwd, branchName);
    if (pull.ok) {
      return { ok: true, detail: `уже на ${branchName}, ${pull.detail}` };
    }
    return { ok: false, detail: `на ${branchName}, но pull не удался` };
  }

  // Ветку держит соседний worktree — checkout невозможен физически (одна ветка не
  // может быть в двух деревьях), и это норма при параллельных сессиях (канон
  // membrana-worktree), а не сбой. Раньше ритуал рвался здесь на ровном месте:
  // при параллельной работе main почти всегда занят соседом (#515 п.2, живой
  // случай 15.07). Проверяем ДО checkout, а не ловим текст ошибки git: он
  // локализуем и контрактом не является.
  const heldBy = otherWorktreeBranches();
  if (isBaseHeldElsewhere(branchName, heldBy)) {
    return {
      ok: false,
      skipped: true,
      detail: `${branchName} держит другой worktree (параллельная сессия) — остаёмся на ${current || '(detached)'}`,
    };
  }

  let dirty = false;
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    dirty = status.length > 0;
  } catch {
    return { ok: false, detail: 'не удалось проверить чистоту рабочего дерева' };
  }

  if (dirty) {
    return {
      ok: false,
      skipped: true,
      detail: `сейчас ${current || '(detached)'}, есть незакоммиченные изменения — checkout ${branchName} вручную`,
    };
  }

  try {
    execFileSync('git', ['checkout', branchName], { cwd, stdio: 'inherit' });
    const pull = runGitPull(cwd, branchName);
    if (!pull.ok) throw new Error('pull failed');
    return { ok: true, detail: `переключено ${current || '?'} → ${branchName} (${pull.detail})` };
  } catch {
    return { ok: false, detail: `checkout/pull ${branchName} не удался` };
  }
}

const cwd = process.cwd();
const { noAnthropic, help } = parseArgs(process.argv.slice(2));

if (help) {
  console.log(`Утренняя профилактика (корень репозитория).

  yarn morning-care
  yarn morning-care --no-anthropic   без вызова Anthropic API

Переменные: .env в корне (HTTPS_PROXY и др.), ANTHROPIC_API_KEY для проверки API.
`);
  process.exit(0);
}

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

console.log(`\n--- рабочая ветка (${DEFAULT_WORK_BRANCH}) ---`);
const branchSwitch = ensureWorkBranch(cwd, DEFAULT_WORK_BRANCH);
if (branchSwitch.skipped) {
  console.log(`[warn] ${branchSwitch.detail}`);
} else if (branchSwitch.ok) {
  console.log(`[ok]   ${branchSwitch.detail}`);
} else {
  console.log(`[fail] ${branchSwitch.detail}`);
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
  console.log('\n--- Anthropic API (короткий запрос) ---');
  const api = await runAnthropicProbe();
  if (api.ok) {
    console.log('[ok]   POST /v1/messages');
  } else {
    console.log(`[fail] ${api.detail}`);
    failed = true;
  }
  await new Promise((r) => setTimeout(r, 150));
} else {
  console.log('\n[инфо] проверка Anthropic пропущена (--no-anthropic)');
}

console.log('\n=== итог ===');
if (failed) {
  console.log('[fail] есть ошибки — см. выше.');
  process.exitCode = 1;
} else {
  console.log('[ok]   всё пройдено.');
}
} // runMorningCareBody
