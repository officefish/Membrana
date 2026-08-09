#!/usr/bin/env node
/**
 * `yarn office:image:smoke [--build] [--tag <t>] [--keep]` — отвечает на один вопрос:
 * **исполняет ли собранный образ офиса свой рантайм?**
 *
 * Блок 1 спринта dockerfile-copy-manifest-drifts (#1797). Здесь порты — docker и HTTP;
 * все решения в чистом ядре `scripts/lib/office-image-smoke.mjs`, поэтому вердикт
 * проверяется зубами без образа.
 *
 * Прибор НЕ несёт списка модулей (условие резчика): он поднимает контейнер, дёргает
 * `GET /v1/dreams/digest/:day`, затем внутренним probe запускает static registry
 * JSONL → parser → index → lookup. Зависимости живут в коде офиса, прибор проверяет их
 * исполнением.
 *
 * Секреты не нужны: обязательные env заполняются заведомо нерабочими значениями —
 * проверяется резолв модулей, а не синтез, и в сеть этот путь не ходит. Поэтому прогон
 * идёт и на PR из форка.
 *
 * Exit: 0 — pass · 1 — образ неполон либо контейнер нездоров · 2 — прогон не состоялся.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SMOKE_LIMITS, formatSmokeVerdict, smokeVerdict } from './lib/office-image-smoke.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Вывод СИНХРОННЫЙ, минуя буфер. В CI stdout — пайп, и `console.log` для пайпа асинхронен:
 * прогон 08.08 дал зелёный шаг, где после «→ health» не напечаталось НИЧЕГО, включая
 * вердикт. Прибор, который молчит, ничего не доказывает, поэтому здесь writeSync: строка
 * либо на экране, либо прибор упал — третьего состояния нет.
 */
const say = (s) => {
  try {
    writeSync(1, `${s}\n`);
  } catch {
    console.log(s);
  }
};
const sayErr = (s) => {
  try {
    writeSync(2, `${s}\n`);
  } catch {
    console.error(s);
  }
};
const DEFAULT_TAG = 'membrana-office:smoke';
const CONTAINER = 'membrana-office-smoke';
const PORT = 3199;

export function parseArgs(argv) {
  const out = { build: false, tag: DEFAULT_TAG, keep: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--build') out.build = true;
    else if (a === '--tag') out.tag = argv[++i] ?? out.tag;
    else if (a === '--keep') out.keep = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return out;
}

const docker = (args, opts = {}) => spawnSync('docker', args, {
  cwd: repoRoot, encoding: 'utf8', timeout: opts.timeout ?? 600_000, maxBuffer: 32 * 1024 * 1024,
});

/** Обязательные env офиса: непустые, заведомо нерабочие. Секретов прибор не просит. */
const SMOKE_ENV = [
  'API_INTERNAL_TOKEN=smoke-not-a-real-token',
  'ANTHROPIC_API_KEY=smoke-not-a-real-key',
  'GITHUB_TOKEN=smoke-not-a-real-token',
  'GITHUB_OWNER=officefish',
  'GITHUB_REPO=Membrana',
  'DREAMS_ENABLED=false',
  'RAG_REPO_ROOT=/app',
  'PORT=3000',
];

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return { ok: res.ok, status: res.status, body: await res.text() };
  } catch (e) {
    return { ok: false, status: null, body: String(e?.message ?? e) };
  }
}

function probeStaticRegistryRuntime() {
  const source = [
    "const { createStaticRegistryReadPortFromRepository } = await import('./dist/modules/static-registry/integration/static-registry-runtime.provider.js');",
    "const { readFileSync } = await import('node:fs');",
    "const line = readFileSync('/app/docs/evidence/registry.jsonl', 'utf8').split(/\\r?\\n/u).find(Boolean);",
    "if (!line) throw new Error('static registry JSONL is empty');",
    'const recordId = JSON.parse(line).id;',
    "if (typeof recordId !== 'string') throw new Error('first static registry row has no id');",
    "const port = await createStaticRegistryReadPortFromRepository('/app');",
    'const result = await port.getRecordById(recordId);',
    "if (result.kind !== 'found' || result.value.id !== recordId) throw new Error(`static registry lookup failed for ${recordId}`);",
    "process.stdout.write(JSON.stringify({ kind: result.kind, recordId }));",
  ].join('\n');
  const result = docker(
    ['exec', CONTAINER, 'node', '--input-type=module', '-e', source],
    { timeout: 60_000 },
  );
  return {
    ok: result.status === 0,
    status: result.status,
    body: `${String(result.stdout ?? '')}\n${String(result.stderr ?? '')}`,
  };
}

/**
 * Ждём health, пока контейнер жив. Мёртвый контейнер — не «ещё не прогрелся».
 *
 * Каждая попытка ЗВУЧИТ. Прогон 08.08 обрывался ровно здесь: лог кончался на «→ health»,
 * а процесс возвращал 0 — то есть зелёное без единого доказательства. Немой цикл нельзя
 * отличить от цикла, который не начинался, поэтому здесь он говорит.
 */
async function waitHealthy(attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    const alive = docker(['inspect', '-f', '{{.State.Running}}', CONTAINER], { timeout: 20_000 });
    const running = String(alive.stdout).trim();
    if (running !== 'true') {
      say(`     health #${i + 1}: контейнер не жив (inspect → «${running || '—'}»)`);
      return null;
    }
    const r = await probe(`http://127.0.0.1:${PORT}/health`);
    say(`     health #${i + 1}: ${r.ok ? 'ok' : `нет (${r.status ?? r.body?.slice(0, 60) ?? '—'})`}`);
    if (r.ok) return r;
    await new Promise((done) => setTimeout(done, 2000));
  }
  return { ok: false, status: null, body: 'health не ответил за отведённое время' };
}

function removeContainer() {
  docker(['rm', '-f', CONTAINER], { timeout: 60_000 });
}

async function main(argv) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (e) {
    sayErr(`office:image:smoke — ошибка входа: ${e.message}`);
    return 2;
  }
  if (cli.help) {
    say('Usage: yarn office:image:smoke [--build] [--tag <t>] [--keep]');
    say('\nОтвечает: pass | missing-module | unhealthy | broken. Предел прибора:');
    for (const l of SMOKE_LIMITS) say(`  · ${l}`);
    return 0;
  }

  try {
    execFileSync('docker', ['version'], { stdio: 'ignore', timeout: 30_000 });
  } catch {
    sayErr('office:image:smoke — прогон НЕ состоялся: docker недоступен. «Не знаю» не значит «образ полон»');
    return 2;
  }

  if (cli.build) {
    say(`  → build ${cli.tag}`);
    const built = docker(['build', '-f', 'packages/background-office/Dockerfile', '-t', cli.tag, '.']);
    if (built.status !== 0) {
      sayErr('office:image:smoke — прогон НЕ состоялся: образ не собрался');
      sayErr(String(built.stderr ?? '').slice(-4000));
      return 2;
    }
  }

  removeContainer();
  say('  → run');
  const envArgs = SMOKE_ENV.flatMap((e) => ['-e', e]);
  const run = docker(['run', '-d', '--name', CONTAINER, '-p', `${PORT}:3000`, ...envArgs, cli.tag], { timeout: 120_000 });
  if (run.status !== 0) {
    sayErr('office:image:smoke — прогон НЕ состоялся: контейнер не запустился');
    sayErr(String(run.stderr ?? '').slice(-4000));
    return 2;
  }

  let health = null;
  let digest = null;
  let staticRegistry = null;
  try {
    say('  → health');
    health = await waitHealthy();
    say(`  → health: ${health === null ? 'контейнер не жив' : health.ok ? 'ok' : 'не ответил'}`);
    if (health?.ok) {
      // Дата фиксированная и заведомо без журнала: прибор судит ПОЛНОТУ образа, а не
      // содержимое тома. Пустой дайджест — законный pass.
      say('  → digest (грузит рантайм-модули офиса внутри образа)');
      digest = await probe(`http://127.0.0.1:${PORT}/v1/dreams/digest/2026-01-01`);
      if (digest.ok) {
        say('  → static registry (JSONL → parser → index → lookup внутри образа)');
        staticRegistry = probeStaticRegistryRuntime();
        say(`  → static registry: ${staticRegistry.ok ? 'ok' : `нет (code ${staticRegistry.status ?? '—'})`}`);
      }
    }
    const logs = docker(['logs', CONTAINER], { timeout: 60_000 });
    const verdict = smokeVerdict({
      health,
      digest,
      staticRegistry,
      logs: `${String(logs.stdout ?? '')}\n${String(logs.stderr ?? '')}`,
    });
    for (const line of formatSmokeVerdict(verdict)) say(line);
    if (verdict.outcome === 'pass') return 0;
    if (verdict.outcome === 'broken') {
      sayErr('\n--- логи контейнера (хвост) ---');
      sayErr(String(logs.stdout ?? '').slice(-4000));
      sayErr(String(logs.stderr ?? '').slice(-4000));
      return 2;
    }
    return 1;
  } finally {
    if (!cli.keep) removeContainer();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  // `process.exit(code)` здесь СЪЕДАЕТ вывод: в CI stdout — пайп, console.log для пайпа
  // асинхронен, и немедленный выход рвёт несброшенный буфер. Первый прогон в CI 08.08
  // так и прошёл: зелёный шаг без единой строки вердикта — то есть «проверено» стало
  // неотличимо от «ничего не проверил», ровно та болезнь, против которой прибор. Код
  // возврата ставим полем, а Node выходит сам, дописав поток.
  // Явный keep-alive: если event loop опустеет раньше, чем разрешится промис `main`,
  // Node выходит с кодом 0 — молча и «успешно». Для прибора это худший из отказов:
  // зелёное без проверки. Таймер держит процесс живым до настоящего вердикта.
  const keepAlive = setInterval(() => {}, 1000);
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; clearInterval(keepAlive); },
    (e) => {
      sayErr(`office:image:smoke — прогон НЕ состоялся: ${e?.message ?? e}`);
      process.exitCode = 2;
      clearInterval(keepAlive);
    },
  );
}

export { main };
