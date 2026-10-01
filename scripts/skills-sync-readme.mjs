#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseSkillFrontMatter } from './lib/skill-status.mjs';

export function syncSkillsReadme(current, statuses) {
  const lines = current.split(/\r?\n/u);
  return lines.map((line) => {
    if (line === '| Skill | Triggers (summary) |') return '| Skill | Status | Triggers (summary) |';
    if (line === '|-------|-------------------|') return '|-------|--------|-------------------|';
    const match = /^\| \[`([^`]+)`\]\([^)]*\) \| (?:(?:`(?:live|deprecated|superseded|missing)` \| ))?(.*) \|$/u.exec(line);
    if (!match) return line;
    const status = statuses[match[1]];
    return `| [\`${match[1]}\`](./${match[1]}/SKILL.md) | \`${status ?? 'missing'}\` | ${match[2]} |`;
  }).join('\n');
}

function main() {
  const root = resolve('.cursor/skills');
  const readme = join(root, 'README.md');
  const statuses = {};
  for (const name of readdirSync(root)) {
    try {
      const fm = parseSkillFrontMatter(readFileSync(join(root, name, 'SKILL.md'), 'utf8'));
      if (fm.status) statuses[name] = fm.status;
    } catch { /* non-skill entry */ }
  }
  const before = readFileSync(readme, 'utf8');
  const after = syncSkillsReadme(before, statuses);
  writeFileSync(readme, after.endsWith('\n') ? after : `${after}\n`, 'utf8');
  console.log(`skills:sync-readme — ${Object.keys(statuses).length} statuses`);
}

if (process.argv[1]?.endsWith('skills-sync-readme.mjs')) main();
