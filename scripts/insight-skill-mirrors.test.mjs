import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKILLS = [
  'membrana-insight',
  'membrana-insight-to-sprint',
  'membrana-insight-lifecycle',
  'membrana-insight-overview',
];
const MIRROR_ROOTS = ['.claude/skills', '.agents/skills', '.opencode/skills'];

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, 'SKILL.md must have frontmatter');
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const descriptionBlock = match[1].match(/^description:\s*>-\r?\n([\s\S]*)$/m)?.[1] ?? '';
  const description = descriptionBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  return { name, description, body: text.slice(match[0].length) };
}

describe('insight skill mirrors', () => {
  for (const skill of SKILLS) {
    it(`${skill} has three resolvable thin mirrors with frontmatter parity`, () => {
      const canonicalPath = join(ROOT, '.cursor/skills', skill, 'SKILL.md');
      const canonical = frontmatter(readFileSync(canonicalPath, 'utf8'));
      assert.equal(canonical.name, skill);
      assert.ok(canonical.description.length > 20);

      for (const mirrorRoot of MIRROR_ROOTS) {
        const mirrorPath = join(ROOT, mirrorRoot, skill, 'SKILL.md');
        assert.ok(existsSync(mirrorPath), `missing mirror: ${mirrorPath}`);
        const text = readFileSync(mirrorPath, 'utf8');
        const mirror = frontmatter(text);
        assert.equal(mirror.name, canonical.name, `${mirrorRoot} name drift`);
        assert.equal(mirror.description, canonical.description, `${mirrorRoot} description drift`);
        const target = text.match(/\]\(([^)]+\.cursor\/skills\/[^)]+\/SKILL\.md)\)/)?.[1];
        assert.ok(target, `${mirrorRoot} has no delegate target`);
        assert.equal(resolve(dirname(mirrorPath), target), canonicalPath);
        assert.match(mirror.body.trimStart(), /^# .+\r?\n\r?\nDelegates to /);
        assert.ok(mirror.body.trim().split(/\r?\n/).length <= 3, `${mirrorRoot} contains a copied workflow body`);
      }
    });
  }
});
