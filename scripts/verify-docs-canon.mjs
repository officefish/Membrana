#!/usr/bin/env node
/**
 * verify-docs-canon — живой канон не должен обещать того, чего нет (#497).
 *
 *   yarn docs:verify-canon           # проверить
 *   yarn docs:verify-canon --list    # показать, какие доки считаются каноном
 *
 * Сканирует ТОЛЬКО живой канон (см. isCanonDoc): архивные доки — исторические
 * записи, их правка = фальсификация истории. Строка с честной пометкой
 * («не реализовано», «Запланировано», «optional») — правда, а не ошибка.
 *
 * Если команда действительно нужна — реализуйте её. Если нет — пометьте честно.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findMissingCommands,
  findMissingScriptPaths,
  isCanonDoc,
} from './lib/docs-canon.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => p.slice(repoRoot.length + 1).split('\\').join('/');

function collectDocs(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', '.turbo'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectDocs(full, acc);
    else if (/\.md$/.test(entry)) acc.push(full);
  }
  return acc;
}

const scripts = new Set(
  Object.keys(JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts),
);

const candidates = [
  ...collectDocs(join(repoRoot, 'docs')),
  join(repoRoot, 'AGENTS.md'),
  join(repoRoot, '.cursorrules'),
].filter((p) => existsSync(p) && isCanonDoc(rel(p)));

if (process.argv.includes('--list')) {
  console.log(`Живой канон (${candidates.length} док.):`);
  for (const p of candidates) console.log('  ' + rel(p));
  process.exitCode = 0;
} else {
  const problems = [];
  for (const path of candidates) {
    const text = readFileSync(path, 'utf8');
    for (const hit of findMissingCommands(text, scripts)) {
      problems.push({ file: rel(path), ...hit, kind: `yarn ${hit.command}` });
    }
    for (const hit of findMissingScriptPaths(text, (p) => existsSync(join(repoRoot, p)))) {
      problems.push({ file: rel(path), ...hit, kind: hit.path });
    }
  }

  console.log(`docs:verify-canon · живого канона: ${candidates.length} док. (архивы не сканируются)`);
  if (problems.length === 0) {
    console.log('OK: канон не обещает того, чего нет.');
  } else {
    console.error(`\nКанон обещает несуществующее — ${problems.length}:\n`);
    for (const p of problems) {
      console.error(`  ${p.file}:${p.line}  ${p.kind}`);
      console.error(`      ${p.lineText.slice(0, 110)}`);
    }
    console.error(
      '\nЛибо реализуйте, либо пометьте честно в той же строке ' +
        '(«не реализовано», «Запланировано», «optional», «бэклог») — тогда это не ошибка.',
    );
    process.exitCode = 1;
  }
}
