#!/usr/bin/env node
/**
 * Open a Cowork Sprint: validate brief, print block-branch commands, ACTIVE guard.
 * Форк comp-open.mjs (Competition) под формат Cowork (#регламент
 * docs/COWORK_SPRINT_REGULATION.md, консилиум cowork-sprint-format-2026-07-14).
 *
 * Usage: yarn cowork:open --id cowork-<slug> --blocks capture,transport,render [--force]
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function parseCoworkOpenArgs(args) {
  const idIdx = args.indexOf('--id');
  const blocksIdx = args.indexOf('--blocks');
  const blocksRaw =
    blocksIdx >= 0 ? args[blocksIdx + 1] : args.find((a) => a.startsWith('--blocks='))?.slice(9);
  const blocks = (blocksRaw ?? '')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  return {
    sprintId: idIdx >= 0 ? args[idIdx + 1] : undefined,
    blocks,
    force: args.includes('--force'),
  };
}

/** Слаги блоков: kebab-case, три штуки, без дубликатов (регламент: имена из brief, не alpha/beta/gamma). */
export function validateBlocks(blocks) {
  if (blocks.length !== 3) return `нужно ровно 3 блока, получено ${blocks.length}`;
  if (new Set(blocks).size !== 3) return 'слаги блоков не должны повторяться';
  const bad = blocks.find((b) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b));
  if (bad) return `слаг блока не kebab-case: «${bad}»`;
  if (blocks.some((b) => ['alpha', 'beta', 'gamma'].includes(b))) {
    return 'alpha/beta/gamma — язык соревнования; блоки коворка называются по сути (см. регламент)';
  }
  return null;
}

const isMain = process.argv[1]?.endsWith('cowork-open.mjs');
if (isMain) {
  const { sprintId, blocks, force } = parseCoworkOpenArgs(process.argv.slice(2));

  if (!sprintId || blocks.length === 0) {
    console.error('Usage: yarn cowork:open --id <sprint-id> --blocks <a,b,c> [--force]');
    process.exit(1);
  }
  const blocksError = validateBlocks(blocks);
  if (blocksError) {
    console.error(`Блоки: ${blocksError}`);
    process.exit(1);
  }

  const briefPath = join(root, 'docs/cowork-sprint', sprintId, 'COWORK_SPRINT_BRIEF.md');
  const activePath = join(root, 'docs/COWORK_SPRINT_ACTIVE.md');

  if (!existsSync(briefPath)) {
    console.error(`Brief not found: ${briefPath}`);
    process.exit(1);
  }
  const active = existsSync(activePath) ? readFileSync(activePath, 'utf8') : '';
  if (active.includes('status** | `open`') && !force) {
    console.error('COWORK_SPRINT_ACTIVE.md already open. Use --force to continue.');
    process.exit(1);
  }

  const baseSha = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();

  console.log(`\nCowork Sprint OPEN: ${sprintId}`);
  console.log(`Brief: ${briefPath}`);
  console.log(`BASE_SHA: ${baseSha}`);
  console.log(`Blocks: ${blocks.join(', ')}`);
  console.log(`\nCreate block branches from current HEAD (каждой команде — свой worktree, скилл membrana-worktree):\n`);

  for (const block of blocks) {
    const branch = `cowork/${sprintId}/${block}`;
    console.log(`  git branch ${branch} && git push -u origin ${branch}`);
    console.log(`  git worktree add ../Membrana-${block} ${branch}\n`);
  }

  console.log('Phase 1: каждая команда пишет team-<block>/CONCEPT.md + первый EXPECTATIONS.md.');
  console.log('Изоляция до Interface Consilium: чужие ветки/EXPECTATIONS не читать, общие корневые файлы не трогать.');
  console.log('См. docs/COWORK_SPRINT_REGULATION.md\n');
}
