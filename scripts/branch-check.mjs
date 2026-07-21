#!/usr/bin/env node
/**
 * yarn branch:check [имя] — шапка шип-гейта по грамматике Р4 (вердикт
 * m4-grammar-manual): тип · держатель (+источник) · заморозка, исходы текстом.
 *
 * Без имени — текущая ветка. Держатель: --holder <персона> (явное слово) →
 * иначе leadPersona карточки реестра при slug = id → иначе персона-сегмент.
 * Exit: 0 — держатель выведен и мерджу ничего не мешает; 1 — CONFLICT/MISSING/
 * заморозка/вне конвенции (возврат на доработку, T8); 2 — инструментальная ошибка.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  nightFreezeVerdict,
  parseBranchName,
  refCollisionProblems,
  renderShipHeader,
  resolveHolder,
} from './lib/branch-grammar.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

let rules;
let branch;
let refs;
try {
  rules = JSON.parse(readFileSync(resolve(repoRoot, 'docs/procedures/layer-rules.json'), 'utf8'));
  branch = process.argv[2] && !process.argv[2].startsWith('--')
    ? process.argv[2]
    : execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8', cwd: repoRoot }).trim();
  refs = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], {
    encoding: 'utf8', cwd: repoRoot,
  }).trim().split(/\r?\n/);
} catch (e) {
  console.error(`✖ инструментальная ошибка: ${e.message}`);
  process.exit(2);
}

const parsed = parseBranchName(branch, rules);

// «Явное»: слово (--holder) → иначе leadPersona карточки при slug = id.
let explicit = arg('--holder');
if (!explicit && parsed.slug) {
  const regPath = resolve(repoRoot, 'docs/tasks/registry.json');
  if (existsSync(regPath)) {
    const reg = JSON.parse(readFileSync(regPath, 'utf8'));
    const card = (reg.tasks ?? reg).find?.((t) => t.id === parsed.slug);
    if (card?.leadPersona) explicit = card.leadPersona;
  }
}

const holderVerdict = resolveHolder(explicit, parsed.persona);
const nightOver = existsSync(resolve(repoRoot, 'docs', 'NIGHT_OVER.flag'));
const freeze = nightFreezeVerdict(parsed, nightOver);
const collisions = refCollisionProblems(branch, refs, rules);

console.log(`branch:check — ${branch}`);
console.log(renderShipHeader(parsed, holderVerdict, freeze));
for (const p of [...parsed.problems, ...collisions]) console.error(`  ✗ ${p}`);

const red =
  parsed.problems.length > 0 ||
  collisions.length > 0 ||
  freeze.frozen ||
  holderVerdict.holder === 'CONFLICT' ||
  holderVerdict.holder === 'MISSING';
process.exit(red ? 1 : 0);
