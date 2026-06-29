import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const CLOSURE_REVIEW_SKILL_REL =
  '.agents/skills/membrana-task-closure-review/SKILL.md';
export const CLOSURE_REVIEW_SKILL_MIRRORS = [
  '.cursor/skills/membrana-task-closure-review/SKILL.md',
  '.claude/skills/membrana-task-closure-review/SKILL.md',
];

export function syncTaskClosureReviewSkills({ cwd = process.cwd(), write = false } = {}) {
  const canonicalPath = resolve(cwd, CLOSURE_REVIEW_SKILL_REL);
  if (!existsSync(canonicalPath)) throw new Error(`Canonical skill missing: ${canonicalPath}`);
  const canonical = readFileSync(canonicalPath, 'utf8');
  if (!canonical.includes('name: membrana-task-closure-review')) {
    throw new Error('Canonical skill has an unexpected name');
  }

  const results = [];
  for (const rel of CLOSURE_REVIEW_SKILL_MIRRORS) {
    const path = resolve(cwd, rel);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current !== canonical && write) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, canonical, 'utf8');
    }
    const synced = (write ? readFileSync(path, 'utf8') : current) === canonical;
    results.push({ rel, synced });
  }
  return results;
}

function main() {
  const write = process.argv.includes('--write');
  const results = syncTaskClosureReviewSkills({ write });
  for (const result of results) {
    console.log(`${result.synced ? 'OK' : 'DRIFT'} ${result.rel}`);
  }
  if (results.some((result) => !result.synced)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('sync-task-closure-review-skills.mjs')) main();
