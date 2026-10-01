import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncSkillsReadme } from './skills-sync-readme.mjs';

test('adds status and is idempotent', () => {
  const source = '# Skills\n\n| Skill | Triggers (summary) |\n|-------|-------------------|\n| [`a`](./a/SKILL.md) | alpha |\n';
  const once = syncSkillsReadme(source, { a: 'live' });
  assert.match(once, /\| Skill \| Status \|/u);
  assert.match(once, /\| `live` \| alpha \|/u);
  assert.equal(syncSkillsReadme(once, { a: 'live' }), once);
});

test('refuses an undocumented status', () => {
  assert.match(syncSkillsReadme('| [`a`](./a/SKILL.md) | alpha |', {}), /`missing`/u);
});
