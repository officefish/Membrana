#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const mirrors = [
  '.agents/skills/membrana-local-sprint/SKILL.md',
  '.claude/skills/membrana-local-sprint/SKILL.md',
  '.opencode/skills/membrana-local-sprint/SKILL.md',
];

const canonical = '.cursor/skills/membrana-local-sprint/SKILL.md';
const requiredPointer = '../../../.cursor/skills/membrana-local-sprint/SKILL.md';

function read(path) {
  return readFileSync(resolve(repoRoot, path), 'utf8').replace(/\r\n/g, '\n');
}

const problems = [];
const canonicalText = read(canonical);
if (!canonicalText.includes('docs/procedures/membrana-local-sprint')) {
  problems.push(`${canonical}: missing procedure canon pointer`);
}

const mirrorTexts = mirrors.map((path) => [path, read(path)]);
const expected = mirrorTexts[0]?.[1];
for (const [path, text] of mirrorTexts) {
  if (!text.includes(requiredPointer)) {
    problems.push(`${path}: missing canonical skill pointer`);
  }
  if (text !== expected) {
    problems.push(`${path}: mirror body differs from ${mirrors[0]}`);
  }
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`skills:verify-mirrors: ${p}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`skills:verify-mirrors: OK (${mirrors.length} mirrors -> ${canonical})\n`);
}
