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

function makeContainer(homeRel, { name, worksOn, verbs, readme, role, dependentOn, mirrorsFrom }) {
  const dir = join(tmp, homeRel);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    pattern: 'docs/patterns/HOME_WORKSHOP.md', name, worksOn, kit: null,
    verbs: { audit: 'a', decompose: 'd', inspectElement: verbs.inspect ? 'i' : null, stackLike: [], domain: [] },
  };
  if (role) manifest.role = role;
  if (dependentOn) manifest.dependentOn = dependentOn;
  if (mirrorsFrom) manifest.mirrorsFrom = mirrorsFrom;
  writeFileSync(join(dir, 'workshop.manifest.json'), JSON.stringify(manifest));
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

test('renderMintlifyPage: frontmatter + home в заголовке + секция plane', () => {
  const mdx = renderMintlifyPage(discoverContainers(tmp));
  assert.match(mdx, /title: Контейнеры и мастерские/);
  assert.match(mdx, /### мастерская веток \(`docs\/audit\/git`\)/);
  assert.match(mdx, /Плоскость отчётов/);
});

test('plane/role: docs/tasks ≠ docs/audit/tasks', () => {
  makeContainer('docs/tasks', {
    name: 'мастерская задач (primary)',
    worksOn: 'docs/tasks/registry.json',
    role: 'primary',
    verbs: { inspect: true },
    readme: '# tasks\n\nДом заданий.',
  });
  makeContainer('docs/audit/tasks', {
    name: 'мастерская разборов задач (derivative)',
    worksOn: 'docs/audit/tasks/registry/',
    role: 'derivative',
    dependentOn: ['docs/tasks'],
    mirrorsFrom: 'docs/tasks/registry.json',
    verbs: {},
    readme: '# audit/tasks\n\nОтчёты про задачи.',
  });
  const cs = discoverContainers(tmp);
  const domainTasks = cs.find((c) => c.home === 'docs/tasks');
  const reportTasks = cs.find((c) => c.home === 'docs/audit/tasks');
  assert.equal(domainTasks.plane, 'domain');
  assert.equal(domainTasks.role, 'primary');
  assert.equal(reportTasks.plane, 'report');
  assert.equal(reportTasks.role, 'derivative');
  const md = renderAtlasRegistry(cs);
  assert.match(md, /\[docs\/audit\/tasks\]\(/u);
  assert.doesNotMatch(md, /\[docs\/audit\/tasks\/registry\/\]\(/u);
  assert.match(md, /\[docs\/tasks\]\(/u);
  assert.doesNotMatch(md, /\[docs\/tasks\/registry\.json\]\(/u);
  const byPlane = decomposeContainers(cs, 'plane');
  assert.ok(byPlane.get('report').includes('docs/audit/tasks'));
  assert.ok(byPlane.get('domain').includes('docs/tasks'));
});

test('ATLAS-ссылки резолвятся: ../../../ от registry/ (finding MAJOR-1)', () => {
  const md = renderAtlasRegistry(discoverContainers(tmp));
  assert.match(md, /\]\(\.\.\/\.\.\/\.\.\/docs\//u); // три уровня вверх
  assert.doesNotMatch(md, /\]\(\.\.\/\.\.\/docs\//u); // НЕ два (мёртвая ссылка)
});

test('renderAtlasRegistry детерминирован (байт-идемпотентность, finding MINOR-4)', () => {
  const cs = discoverContainers(tmp);
  assert.equal(renderAtlasRegistry(cs), renderAtlasRegistry(cs));
  assert.doesNotMatch(renderAtlasRegistry(cs), /Date:|SHA:/u); // без волатильной меты
});

test('mintlify нейтрализует {}<> (finding MAJOR-3, MDX-инъекция)', () => {
  makeContainer('docs/inject', { name: 'мастерская <Foo> {bad}', worksOn: 'docs/inject', verbs: {}, readme: '# t\n\nИспользует {config} и <Component/>.' });
  const mdx = renderMintlifyPage(discoverContainers(tmp));
  assert.doesNotMatch(mdx, /\{config\}/u);
  assert.doesNotMatch(mdx, /<Component/u);
  assert.doesNotMatch(mdx, /<Foo>|\{bad\}/u);
});

test('summary вычищает markdown-ссылки (иначе битые в mintlify — CI docs lint)', () => {
  makeContainer('docs/linked', { name: 'со ссылкой', worksOn: 'docs/linked', verbs: {}, readme: '# t\n\nРеализация [GROUP_CONTAINERIZATION](../../patterns/GROUP_CONTAINERIZATION.md).' });
  const c = discoverContainers(tmp).find((x) => x.worksOn === 'docs/linked');
  assert.equal(c.summary, 'Реализация GROUP_CONTAINERIZATION.');
  assert.doesNotMatch(c.summary, /\]\(/u); // ни одной ссылки
});

test('readmeDigest: summary без H1 (finding MINOR-5)', () => {
  makeContainer('docs/no-h1', { name: 'без H1', worksOn: 'docs/no-h1', verbs: {}, readme: 'Просто абзац без заголовка.' });
  const c = discoverContainers(tmp).find((x) => x.worksOn === 'docs/no-h1');
  assert.equal(c.summary, 'Просто абзац без заголовка.');
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
