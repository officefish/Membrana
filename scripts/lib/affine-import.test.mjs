import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildDocTitle,
  buildMetaMarkdown,
  buildMetadataBlock,
  composeContentMarkdown,
  DEFAULT_CONTAINER_NAMESPACE,
  discoverSyncPlan,
  makeAffineSyncIo,
  mapGitPathToAffineNamespace,
  normalizeNamespace,
  parseImportArgs,
  prepareGranuleEntry,
  prepareReleaseEntries,
  prepareTemplateEntry,
  resolveGranuleBody,
  resolveWorkspaceId,
} from './affine-import.mjs';

const repoRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..');

test('parseImportArgs: ignores yarn `--` separator', () => {
  const a = parseImportArgs(['--dry-run', '--', 'docs/x.md'], 'templates');
  assert.equal(a.dryRun, true);
  assert.ok(a.file?.replace(/\\/g, '/').endsWith('docs/x.md'));
});

test('parseImportArgs: flags and positional path', () => {
  const a = parseImportArgs(
    ['--dry-run', '--namespace', 'strategic-docs', '--title', 'T', 'docs/x.md'],
    'templates',
  );
  assert.equal(a.dryRun, true);
  assert.equal(a.namespace, 'strategic-docs');
  assert.equal(a.title, 'T');
  assert.equal(a.target, 'templates');
  assert.ok(a.file?.replace(/\\/g, '/').endsWith('docs/x.md'));
});

test('parseImportArgs: --target overrides default', () => {
  const a = parseImportArgs(['--target', 'releases'], 'templates');
  assert.equal(a.target, 'releases');
});

test('parseImportArgs: invalid --target throws', () => {
  assert.throws(() => parseImportArgs(['--target', 'nope'], 'templates'), /templates\|releases/);
});

test('normalizeNamespace trims slashes and backslashes', () => {
  assert.equal(normalizeNamespace('/strategic-docs/'), 'strategic-docs');
  assert.equal(normalizeNamespace('strategic-docs\\readme-principles'), 'strategic-docs/readme-principles');
});

test('mapGitPathToAffineNamespace defaults to container id', () => {
  assert.equal(
    mapGitPathToAffineNamespace('granules/readme-principles/body.md', 'templates'),
    DEFAULT_CONTAINER_NAMESPACE,
  );
  assert.equal(mapGitPathToAffineNamespace('templates/readme-main', 'templates'), DEFAULT_CONTAINER_NAMESPACE);
  assert.equal(
    mapGitPathToAffineNamespace('releases/readme-main/README.md', 'releases'),
    DEFAULT_CONTAINER_NAMESPACE,
  );
});

test('mapGitPathToAffineNamespace explicit --namespace wins', () => {
  assert.equal(
    mapGitPathToAffineNamespace('granules/readme-principles', 'templates', 'custom-ns'),
    'custom-ns',
  );
});

test('mapGitPathToAffineNamespace rejects wrong target', () => {
  assert.throws(
    () => mapGitPathToAffineNamespace('releases/readme-main', 'templates'),
    /Cannot map/,
  );
});

test('buildDocTitle prefixes by kind', () => {
  assert.equal(buildDocTitle('granule', 'readme-principles'), 'Granule · readme-principles');
  assert.equal(buildDocTitle('release', 'readme-main'), 'Release · readme-main');
  assert.equal(buildDocTitle('release-meta', 'readme-main'), 'Meta · Release · readme-main');
  assert.equal(buildDocTitle('granule-meta', 'readme-principles'), 'Meta · Granule · readme-principles');
  assert.equal(buildDocTitle('template-meta', 'readme-main'), 'Meta · Template · readme-main');
  assert.equal(buildDocTitle('granule', 'x', 'Custom'), 'Custom');
});

test('prepareReleaseEntries emits linked content + meta (no JSON dump)', () => {
  const releaseDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/releases/affine-surface-policy',
  );
  const entries = prepareReleaseEntries(releaseDir, repoRoot);
  assert.equal(entries[0].title, 'Release · affine-surface-policy');
  assert.equal(entries[0].pairRole, 'content');
  assert.equal(entries[1].title, 'Meta · Release · affine-surface-policy');
  assert.equal(entries[1].pairRole, 'meta');
  assert.deepEqual(entries[1].legacyTitles, ['Meta · affine-surface-policy']);
  assert.match(entries[0].markdown, /Linked Meta:/);
  assert.match(entries[1].markdown, /## Purpose/);
  assert.doesNotMatch(entries[1].markdown, /```json/);
});

test('prepareTemplateEntry emits editable markdown content + meta', () => {
  const templateDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/templates/affine-surface-policy',
  );
  const entries = prepareTemplateEntry(templateDir, repoRoot);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, 'Template · affine-surface-policy');
  assert.equal(entries[1].title, 'Meta · Template · affine-surface-policy');
  assert.match(entries[0].markdown, /\{\{workspaces\}\}/);
  assert.doesNotMatch(entries[0].markdown, /"id":\s*"affine-surface-policy"/);
  assert.match(entries[1].markdown, /## Slots/);
});

test('buildMetaMarkdown is human-editable (no opaque JSON)', () => {
  const md = buildMetaMarkdown({
    kindLabel: 'Granule',
    id: 'readme-principles',
    contentTitle: 'Granule · readme-principles',
    metaTitle: 'Meta · Granule · readme-principles',
    namespace: 'strategic-docs',
    fields: [
      ['id', 'readme-principles'],
      ['version', '1.0.0'],
      ['kind', 'literal'],
    ],
    purpose: 'Principles',
  });
  assert.match(md, /affine-strategic-docs-meta/);
  assert.match(md, /\| id \| `readme-principles` \|/);
  assert.match(md, /Principles/);
  assert.match(md, /Linked Content:/);
});

test('composeContentMarkdown links to meta pair', () => {
  const md = composeContentMarkdown(
    '# Hello',
    'Granule · x',
    'Meta · Granule · x',
    'strategic-docs',
  );
  assert.match(md, /namespace `strategic-docs`/);
  assert.match(md, /Meta · Granule · x/);
  assert.match(md, /# Hello/);
});

test('buildMetadataBlock still works (compat)', () => {
  const md = buildMetadataBlock(
    { id: 'readme-principles', version: '1.0.0', kind: 'literal', description: 'Principles' },
    'Granule',
  );
  assert.match(md, /\| id \| `readme-principles` \|/);
  assert.match(md, /Principles/);
});

test('resolveWorkspaceId prefers target-specific over AFFINE_WORKSPACE_ID', () => {
  const prevTemplates = process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  const prevReleases = process.env.AFFINE_WORKSPACE_RELEASES_ID;
  const prevGeneric = process.env.AFFINE_WORKSPACE_ID;

  process.env.AFFINE_WORKSPACE_TEMPLATES_ID = 'tpl-uuid';
  process.env.AFFINE_WORKSPACE_RELEASES_ID = 'rel-uuid';
  process.env.AFFINE_WORKSPACE_ID = 'generic-should-not-win';

  assert.equal(resolveWorkspaceId('templates'), 'tpl-uuid');
  assert.equal(resolveWorkspaceId('releases'), 'rel-uuid');

  delete process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  assert.equal(resolveWorkspaceId('templates'), 'generic-should-not-win');

  if (prevTemplates === undefined) delete process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  else process.env.AFFINE_WORKSPACE_TEMPLATES_ID = prevTemplates;
  if (prevReleases === undefined) delete process.env.AFFINE_WORKSPACE_RELEASES_ID;
  else process.env.AFFINE_WORKSPACE_RELEASES_ID = prevReleases;
  if (prevGeneric === undefined) delete process.env.AFFINE_WORKSPACE_ID;
  else process.env.AFFINE_WORKSPACE_ID = prevGeneric;
});

test('resolveWorkspaceId throws with helpful message when missing', () => {
  const prevTemplates = process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  const prevGeneric = process.env.AFFINE_WORKSPACE_ID;
  delete process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  delete process.env.AFFINE_WORKSPACE_ID;
  assert.throws(() => resolveWorkspaceId('templates'), /affine:workspace:list/);
  if (prevTemplates === undefined) delete process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  else process.env.AFFINE_WORKSPACE_TEMPLATES_ID = prevTemplates;
  if (prevGeneric === undefined) delete process.env.AFFINE_WORKSPACE_ID;
  else process.env.AFFINE_WORKSPACE_ID = prevGeneric;
});

test('makeAffineSyncIo supplies loadRegistry to fn granules', async () => {
  const io = makeAffineSyncIo(repoRoot);
  const registry = await io.exec({ op: 'loadRegistry' });
  assert.ok(Array.isArray(registry.tasks), 'registry.tasks must be an array');
});

test('resolveGranuleBody: pure fn granule works without registry io', async () => {
  const granuleDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/granules/readme-background-servers-table',
  );
  const { readFileSync } = await import('node:fs');
  const granuleJson = JSON.parse(readFileSync(path.join(granuleDir, 'granule.json'), 'utf8'));
  const body = await resolveGranuleBody(granuleJson, granuleDir);
  assert.match(body, /### Фоновые серверы/);
});

test('resolveGranuleBody: tasks-readme fn granule needs registry io', async () => {
  const granuleDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/granules/tasks-readme-active-table',
  );
  const { readFileSync } = await import('node:fs');
  const granuleJson = JSON.parse(readFileSync(path.join(granuleDir, 'granule.json'), 'utf8'));
  const body = await resolveGranuleBody(granuleJson, granuleDir, makeAffineSyncIo(repoRoot));
  assert.match(body, /## Активные задачи/);
  assert.match(body, /\| ID \|/);
});

test('prepareGranuleEntry: dual content + meta for fn granule', async () => {
  const granuleDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/granules/tasks-readme-active-table',
  );
  const entries = await prepareGranuleEntry(granuleDir, repoRoot);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].kind, 'granule');
  assert.equal(entries[0].pairRole, 'content');
  assert.equal(entries[0].id, 'tasks-readme-active-table');
  assert.match(entries[0].markdown, /## Активные задачи/);
  assert.equal(entries[1].kind, 'granule-meta');
  assert.equal(entries[1].title, 'Meta · Granule · tasks-readme-active-table');
  assert.match(entries[1].markdown, /pure function/);
});

test('discoverSyncPlan(templates) includes content+meta for function granules', async () => {
  const entries = await discoverSyncPlan('templates', repoRoot);
  const ids = entries.filter((e) => e.kind === 'granule').map((e) => e.id);
  assert.ok(ids.includes('tasks-readme-active-table'));
  assert.ok(ids.includes('tasks-readme-archive-table'));
  assert.ok(ids.includes('readme-background-servers-table'));
  const metaIds = entries.filter((e) => e.kind === 'granule-meta').map((e) => e.id);
  assert.ok(metaIds.includes('tasks-readme-active-table'));
  // content+meta roughly doubles prior count
  assert.ok(entries.length >= 40, `expected >=40 entries, got ${entries.length}`);
});
