import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  auditContainers,
  decomposeContainers,
  discoverContainers,
  inspectContainer,
  renderAtlasRegistry,
  renderMintlifyPage,
} from './lib/tooling-atlas.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'atlas-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

// Паттерн-док, чтобы validateWorkshop.resolvable прошёл.
mkdirSync(join(tmp, 'docs', 'patterns'), { recursive: true });
writeFileSync(join(tmp, 'docs', 'patterns', 'HOME_WORKSHOP.md'), '# паттерн');

function makeContainer(homeRel, { name, worksOn, verbs, readme }) {
  const dir = join(tmp, homeRel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'workshop.manifest.json'), JSON.stringify({
    pattern: 'docs/patterns/HOME_WORKSHOP.md', name, worksOn, kit: null,
    verbs: { audit: 'a', decompose: 'd', inspectElement: verbs.inspect ? 'i' : null, stackLike: [], domain: [] },
  }));
  if (readme) writeFileSync(join(dir, 'README.md'), readme);
}

makeContainer('docs/audit/git', { name: 'мастерская веток', worksOn: 'docs/audit/git', verbs: {}, readme: '# git\n\nДом веток репозитория.' });
makeContainer('docs/procedures', { name: 'мастерская процедур', worksOn: 'docs/procedures', verbs: { inspect: true }, readme: '# процедуры\n\nДом определений процедур.' });

test('discoverContainers: находит оба, самоописания не хранит', () => {
  const cs = discoverContainers(tmp);
  assert.equal(cs.length, 2);
  const git = cs.find((c) => c.worksOn === 'docs/audit/git');
  assert.equal(git.title, 'git');
  assert.equal(git.summary, 'Дом веток репозитория.');
  assert.deepEqual(git.missingVerbs, ['inspectElement']);
});

test('audit: git с ⚠ (нет inspectElement), procedures здоров', () => {
  const { healthy, warned, broken, rows } = auditContainers(tmp);
  assert.equal(broken, 0);
  assert.equal(warned, 1);
  assert.equal(healthy, 1);
  assert.equal(rows.find((r) => r.worksOn === 'docs/procedures').missingVerbs.length, 0);
});

test('decompose by family: audit-family vs domain', () => {
  const g = decomposeContainers(discoverContainers(tmp), 'family');
  assert.deepEqual(g.get('audit-family'), ['docs/audit/git']);
  assert.deepEqual(g.get('domain'), ['docs/procedures']);
});

test('decompose by kit: оба null', () => {
  const g = decomposeContainers(discoverContainers(tmp), 'kit');
  assert.equal(g.get('null').length, 2);
});

test('inspectContainer: по worksOn и по home', () => {
  assert.equal(inspectContainer(tmp, 'docs/procedures').name, 'мастерская процедур');
  assert.equal(inspectContainer(tmp, 'docs/audit/git').title, 'git');
  assert.equal(inspectContainer(tmp, 'нет-такого'), null);
});

test('renderAtlasRegistry: числа и вычеркнутые глаголы', () => {
  const md = renderAtlasRegistry(discoverContainers(tmp), { date: 'D', sha: 'S' });
  assert.match(md, /Контейнеров: \*\*2\*\*/);
  assert.match(md, /~~inspectElement~~/); // git без него
});

test('renderMintlifyPage: frontmatter + заголовок контейнера', () => {
  const mdx = renderMintlifyPage(discoverContainers(tmp));
  assert.match(mdx, /title: Контейнеры и мастерские/);
  assert.match(mdx, /## мастерская веток/);
});

test('битый манифест не роняет discover целиком', () => {
  const dir = join(tmp, 'docs', 'broke');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'workshop.manifest.json'), '{ битый');
  const cs = discoverContainers(tmp);
  assert.ok(cs.length >= 3);
  const broke = cs.find((c) => c.home === 'docs/broke');
  assert.equal(broke.valid, false);
});
