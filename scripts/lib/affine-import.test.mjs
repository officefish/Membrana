import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildDocTitle,
  buildMetadataBlock,
  DEFAULT_CONTAINER_NAMESPACE,
  mapGitPathToAffineNamespace,
  normalizeNamespace,
  parseImportArgs,
  prepareReleaseEntries,
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
  assert.equal(buildDocTitle('release-meta', 'readme-main'), 'Meta · readme-main');
  assert.equal(buildDocTitle('granule', 'x', 'Custom'), 'Custom');
});

test('prepareReleaseEntries uses Release · id doc title', () => {
  const releaseDir = path.join(
    repoRoot,
    'docs/containers/strategic-docs/releases/affine-surface-policy',
  );
  const entries = prepareReleaseEntries(releaseDir, repoRoot);
  assert.equal(entries[0].title, 'Release · affine-surface-policy');
  assert.equal(entries[1].title, 'Meta · affine-surface-policy');
});

test('buildMetadataBlock includes table and comment markers', () => {
  const md = buildMetadataBlock(
    { id: 'readme-principles', version: '1.0.0', kind: 'literal', description: 'Principles' },
    'Granule',
  );
  assert.match(md, /affine-strategic-docs-metadata/);
  assert.match(md, /\| id \| `readme-principles` \|/);
  assert.match(md, /Principles/);
});

test('resolveWorkspaceId reads target-specific env', () => {
  const prevTemplates = process.env.AFFINE_WORKSPACE_TEMPLATES_ID;
  const prevReleases = process.env.AFFINE_WORKSPACE_RELEASES_ID;
  const prevGeneric = process.env.AFFINE_WORKSPACE_ID;
  delete process.env.AFFINE_WORKSPACE_ID;

  process.env.AFFINE_WORKSPACE_TEMPLATES_ID = 'tpl-uuid';
  process.env.AFFINE_WORKSPACE_RELEASES_ID = 'rel-uuid';

  assert.equal(resolveWorkspaceId('templates'), 'tpl-uuid');
  assert.equal(resolveWorkspaceId('releases'), 'rel-uuid');

  process.env.AFFINE_WORKSPACE_ID = 'override';
  assert.equal(resolveWorkspaceId('templates'), 'override');

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
