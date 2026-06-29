#!/usr/bin/env node
/**
 * Phase A: move device-board process MD → docs/actions/device-board/
 * Canon: docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const moves = [
  ['docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md', 'docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md'],
  ['docs/actions/device-board/STUDIO_HOST_LESSONS.md', 'docs/actions/device-board/STUDIO_HOST_LESSONS.md'],
  ['docs/actions/device-board/CLIENT_LOGS_PARSING.md', 'docs/actions/device-board/CLIENT_LOGS_PARSING.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md', 'docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md', 'docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md'],
  ['docs/actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md', 'docs/actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md', 'docs/actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md', 'docs/actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md'],
  ['docs/actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md', 'docs/actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md'],
  ['docs/actions/device-board/sign-offs/PURE_GETTERS_LGTM.md', 'docs/actions/device-board/sign-offs/PURE_GETTERS_LGTM.md'],
  ['docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md', 'docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md'],
  ['docs/actions/device-board/specs/USERCASE_MVP_MICROPHONE.md', 'docs/actions/device-board/specs/USERCASE_MVP_MICROPHONE.md'],
  ['docs/device-board-scripts/DB_REALTIME_OBSERVATION_TEAMLEAD_REVIEW.md', 'docs/archive/device-board-reviews/DB_REALTIME_OBSERVATION_TEAMLEAD_REVIEW.md'],
  ['docs/device-board-scripts/DB_TRACE_P0_P3_TEAMLEAD_REVIEW.md', 'docs/archive/device-board-reviews/DB_TRACE_P0_P3_TEAMLEAD_REVIEW.md'],
];

const stubTargets = [
  ['docs/actions/device-board/USERCASE_GENERATION_REGULATION.md', '../actions/device-board/USERCASE_GENERATION_REGULATION.md'],
  ['docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md', '../actions/device-board/USERCASE_COMPETITION_LESSONS.md'],
  ['docs/actions/device-board/STUDIO_HOST_LESSONS.md', '../actions/device-board/STUDIO_HOST_LESSONS.md'],
  ['docs/actions/device-board/CLIENT_LOGS_PARSING.md', '../actions/device-board/CLIENT_LOGS_PARSING.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md', '../actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md', '../actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md'],
  ['docs/actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md', '../actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md', '../actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md', '../actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md'],
  ['docs/actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md', '../actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md'],
  ['docs/actions/device-board/sign-offs/PURE_GETTERS_LGTM.md', '../actions/device-board/sign-offs/PURE_GETTERS_LGTM.md'],
  ['docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md', '../actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md'],
  ['docs/actions/device-board/specs/USERCASE_MVP_MICROPHONE.md', '../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md'],
];

const linkReplacements = [
  ['docs/actions/device-board/USERCASE_GENERATION_REGULATION.md', 'docs/actions/device-board/USERCASE_GENERATION_REGULATION.md'],
  ['docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md', 'docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md'],
  ['docs/actions/device-board/STUDIO_HOST_LESSONS.md', 'docs/actions/device-board/STUDIO_HOST_LESSONS.md'],
  ['docs/actions/device-board/CLIENT_LOGS_PARSING.md', 'docs/actions/device-board/CLIENT_LOGS_PARSING.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md', 'docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md'],
  ['docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md', 'docs/actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md'],
  ['docs/actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md', 'docs/actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md', 'docs/actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md'],
  ['docs/actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md', 'docs/actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md'],
  ['docs/actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md', 'docs/actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md'],
  ['docs/actions/device-board/sign-offs/PURE_GETTERS_LGTM.md', 'docs/actions/device-board/sign-offs/PURE_GETTERS_LGTM.md'],
  ['docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md', 'docs/actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md'],
  ['docs/actions/device-board/specs/USERCASE_MVP_MICROPHONE.md', 'docs/actions/device-board/specs/USERCASE_MVP_MICROPHONE.md'],
  ['actions/device-board/USERCASE_GENERATION_REGULATION.md', 'actions/device-board/USERCASE_GENERATION_REGULATION.md'],
  ['actions/device-board/USERCASE_COMPETITION_LESSONS.md', 'actions/device-board/USERCASE_COMPETITION_LESSONS.md'],
  ['actions/device-board/STUDIO_HOST_LESSONS.md', 'actions/device-board/STUDIO_HOST_LESSONS.md'],
  ['actions/device-board/CLIENT_LOGS_PARSING.md', 'actions/device-board/CLIENT_LOGS_PARSING.md'],
  ['actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md', 'actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE_SANDBOX.md'],
  ['actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md', 'actions/device-board/smoke/DEVICE_BOARD_SERVER_FIRST_SMOKE.md'],
  ['actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md', 'actions/device-board/smoke/DB_RECORDING_PARITY_SMOKE_MATRIX.md'],
  ['actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md', 'actions/device-board/smoke/DB_TRENDS_FFT_PARITY_SMOKE_MATRIX.md'],
  ['actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md', 'actions/device-board/cookbooks/SCENARIO_CHAIN_LOG_COOKBOOK.md'],
  ['actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md', 'actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md'],
  ['actions/device-board/sign-offs/PURE_GETTERS_LGTM.md', 'actions/device-board/sign-offs/PURE_GETTERS_LGTM.md'],
  ['actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md', 'actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md'],
  ['actions/device-board/specs/USERCASE_MVP_MICROPHONE.md', 'actions/device-board/specs/USERCASE_MVP_MICROPHONE.md'],
];

function stubContent(relTarget) {
  return `# Moved

Этот документ переехал в [\`${relTarget.replace('../', 'docs/')}\`](${relTarget}).

> Stub удалить не раньше 2026-07-26 (4 недели после merge фазы A).
`;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function moveFiles() {
  for (const [from, to] of moves) {
    const fromPath = join(root, from);
    const toPath = join(root, to);
    await ensureDir(dirname(toPath));
    try {
      await rename(fromPath, toPath);
      console.log('moved', from);
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('skip (missing)', from);
      } else {
        throw e;
      }
    }
  }
}

async function writeStubs() {
  for (const [stubPath, target] of stubTargets) {
    const full = join(root, stubPath);
    await writeFile(full, stubContent(target), 'utf8');
    console.log('stub', stubPath);
  }
}

const walkRoots = ['docs', 'scripts', 'packages', 'apps', '.cursor', '.claude', 'logs'];
const walkFiles = new Set(['AGENTS.md', '.cursorrules']);

async function* walkDir(dir) {
  const { readdir, stat } = await import('node:fs/promises');
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.turbo') continue;
      yield* walkDir(p);
    } else if (/\.(md|mdx|mjs|ts|tsx|json|txt|yml)$/.test(ent.name)) {
      yield p;
    }
  }
}

async function replaceLinks() {
  const files = new Set();
  for (const r of walkRoots) {
    for await (const f of walkDir(join(root, r))) files.add(f);
  }
  for (const f of walkFiles) files.add(join(root, f));

  let changed = 0;
  for (const file of files) {
    if (file.includes('device-board-scripts') && file.endsWith('.md') && !file.includes('README.md')) {
      const base = file.replace(/\\/g, '/');
      if (base.includes('/docs/device-board-scripts/') && !base.includes('migrate-docs-actions')) {
        // skip redirect stubs
        const content = await readFile(file, 'utf8');
        if (content.startsWith('# Moved')) continue;
      }
    }
    let content = await readFile(file, 'utf8');
    let next = content;
    for (const [from, to] of linkReplacements) {
      next = next.split(from).join(to);
    }
    if (next !== content) {
      await writeFile(file, next, 'utf8');
      changed++;
      console.log('updated', file.replace(root + '\\', '').replace(root + '/', ''));
    }
  }
  console.log('link-replace files changed:', changed);
}

async function main() {
  const mode = process.argv[2] ?? 'all';
  if (mode === 'move') {
    await moveFiles();
    return;
  }
  if (mode === 'stubs') {
    await writeStubs();
    return;
  }
  if (mode === 'links') {
    await replaceLinks();
    return;
  }
  if (mode === 'all') {
    await moveFiles();
    await writeStubs();
    await replaceLinks();
    console.log('Done.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
