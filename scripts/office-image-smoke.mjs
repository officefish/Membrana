#!/usr/bin/env node
/**
 * `yarn office:image:smoke [--build] [--tag <t>] [--keep]` — отвечает на один вопрос:
 * **исполняет ли собранный образ офиса свой рантайм?**
 *
 * Блок 1 спринта dockerfile-copy-manifest-drifts (#1797). Здесь порты — docker и HTTP;
 * все решения в чистом ядре `scripts/lib/office-image-smoke.mjs`, поэтому вердикт
 * проверяется зубами без образа.
 *
 * Прибор НЕ несёт списка модулей (условие резчика): он поднимает контейнер и дёргает
 * `GET /v1/dreams/digest/:day` — путь, который сам грузит рантайм-модули офиса. Список
 * живёт в коде офиса, прибор проверяет его исполнением.
 *
 * Секреты не нужны: обязательные env заполняются заведомо нерабочими значениями —
 * проверяется резолв модулей, а не синтез, и в сеть этот путь не ходит. Поэтому прогон
 * идёт и на PR из форка.
 *
 * Exit: 0 — pass · 1 — образ неполон либо контейнер нездоров · 2 — прогон не состоялся.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SMOKE_LIMITS, formatSmokeVerdict, smokeVerdict } from './lib/office-image-smoke.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

/** Ждём health, пока контейнер жив. Мёртвый контейнер — не «ещё не прогрелся». */
async function waitHealthy(attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    const alive = docker(['inspect', '-f', '{{.State.Running}}', CONTAINER], { timeout: 20_000 });
    if (String(alive.stdout).trim() !== 'true') return null;
    const r = await probe(`http://127.0.0.1:${PORT}/health`);
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
    console.error(`office:image:smoke — ошибка входа: ${e.message}`);
    return 2;
  }
  if (cli.help) {
    console.log('Usage: yarn office:image:smoke [--build] [--tag <t>] [--keep]');
    console.log('\nОтвечает: pass | missing-module | unhealthy | broken. Предел прибора:');
    for (const l of SMOKE_LIMITS) console.log(`  · ${l}`);
    return 0;
  }

  try {
    execFileSync('docker', ['version'], { stdio: 'ignore', timeout: 30_000 });
  } catch {
    console.error('office:image:smoke — прогон НЕ состоялся: docker недоступен. «Не знаю» не значит «образ полон»');
    return 2;
  }

  if (cli.build) {
    console.log(`  → build ${cli.tag}`);
    const built = docker(['build', '-f', 'packages/background-office/Dockerfile', '-t', cli.tag, '.']);
    if (built.status !== 0) {
      console.error('office:image:smoke — прогон НЕ состоялся: образ не собрался');
      console.error(String(built.stderr ?? '').slice(-4000));
      return 2;
    }
  }

  removeContainer();
  console.log('  → run');
  const envArgs = SMOKE_ENV.flatMap((e) => ['-e', e]);
  const run = docker(['run', '-d', '--name', CONTAINER, '-p', `${PORT}:3000`, ...envArgs, cli.tag], { timeout: 120_000 });
  if (run.status !== 0) {
    console.error('office:image:smoke — прогон НЕ состоялся: контейнер не запустился');
    console.error(String(run.stderr ?? '').slice(-4000));
    return 2;
  }

  let health = null;
  let digest = null;
  try {
    console.log('  → health');
    health = await waitHealthy();
    if (health?.ok) {
      // Дата фиксированная и заведомо без журнала: прибор судит ПОЛНОТУ образа, а не
      // содержимое тома. Пустой дайджест — законный pass.
      console.log('  → digest (грузит рантайм-модули офиса внутри образа)');
      digest = await probe(`http://127.0.0.1:${PORT}/v1/dreams/digest/2026-01-01`);
    }
    const logs = docker(['logs', CONTAINER], { timeout: 60_000 });
    const verdict = smokeVerdict({
      health,
      digest,
      logs: `${String(logs.stdout ?? '')}\n${String(logs.stderr ?? '')}`,
    });
    for (const line of formatSmokeVerdict(verdict)) console.log(line);
    if (verdict.outcome === 'pass') return 0;
    if (verdict.outcome === 'broken') {
      console.error('\n--- логи контейнера (хвост) ---');
      console.error(String(logs.stdout ?? '').slice(-4000));
      console.error(String(logs.stderr ?? '').slice(-4000));
      return 2;
    }
    return 1;
  } finally {
    if (!cli.keep) removeContainer();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}

export { main };
