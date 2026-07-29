#!/usr/bin/env node
/**
 * yarn workspace:links — почему `@membrana/*` не резолвится (#1465 Ф1).
 *
 * Читает ссылки `node_modules/@membrana/*`, говорит для каждой: куда ведёт и лежит ли
 * по тому пути объявленный вход (`types`/`main`). Read-only: ничего не собирает и не чинит.
 *
 * Exit: 0 — ссылки целы · 1 — есть битые · 2 — инструментальная (нет node_modules).
 */
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyLink, declaredEntries, summarize } from './lib/workspace-links.mjs';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SCOPE = join('node_modules', '@membrana');

/** Цель вне дерева = соседний worktree: turbo соберёт свою копию, а ссылка смотрит в чужую. */
function isOutside(root, target) {
  const rel = relative(root, target);
  return rel.startsWith('..') || (rel.length > 1 && rel[1] === ':');
}

export function collectLinks(root = repoRoot) {
  const dir = join(root, SCOPE);
  if (!existsSync(dir)) return null;
  const out = [];
  for (const name of readdirSync(dir)) {
    const linkPath = join(dir, name);
    let target = null;
    try {
      target = realpathSync(linkPath);
    } catch {
      /* висячая ссылка */
    }
    let manifest = null;
    if (target) {
      try {
        manifest = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
      } catch {
        /* нечитаемый манифест */
      }
    }
    const missing = manifest
      ? declaredEntries(manifest).filter((entry) => !existsSync(join(target, entry)))
      : [];
    out.push(
      classifyLink({
        name,
        target,
        outside: Boolean(target) && isOutside(root, target),
        manifest,
        missing,
      }),
    );
  }
  return out;
}

function main() {
  const links = collectLinks();
  if (links === null) {
    console.error(`workspace:links — нет ${SCOPE}: зависимости не установлены (yarn install / yarn worktree:bootstrap)`);
    return 2;
  }
  const report = summarize(links);
  if (report.state === 'clean') {
    console.log(`workspace:links — ✓ ${report.total} ссылок целы: ${report.advice}`);
    return 0;
  }
  console.error(`workspace:links — битых ссылок: ${report.findings.length} из ${report.total}`);
  for (const f of report.findings) console.error(`  ✗ @membrana/${f.name} — ${f.reason}`);
  console.error(`\nремонт: ${report.advice}`);
  return 1;
}

if (process.argv[1]?.endsWith('workspace-links.mjs')) process.exit(main());
