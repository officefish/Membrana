import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePublishArgs } from '../strategic-docs-publish.mjs';
import { inventoryWorkshopTools, loadWorkshopTooling } from './strategic-docs-tools.mjs';
import { validateWorkshop } from './validate-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('strategic-docs publish args', () => {
  it('defaults target all', () => {
    const a = parsePublishArgs([]);
    assert.equal(a.target, 'all');
    assert.equal(a.namespace, 'strategic-docs');
    assert.equal(a.dryRun, false);
  });

  it('parses template and dry-run', () => {
    const a = parsePublishArgs(['--dry-run', '--template', 'readme-main', '--skip-generate']);
    assert.equal(a.dryRun, true);
    assert.equal(a.template, 'readme-main');
    assert.equal(a.skipGenerate, true);
  });

  it('parses --push flag', () => {
    const a = parsePublishArgs(['--push', '--target', 'templates']);
    assert.equal(a.push, true);
    assert.equal(a.target, 'templates');
  });

  it('rejects unknown target', () => {
    assert.throws(() => parsePublishArgs(['--target', 'foo']), /all\|templates\|releases/);
  });
});

describe('strategic-docs workshop catalog', () => {
  it('loads manifest and catalog', () => {
    const { problems } = loadWorkshopTooling(repoRoot);
    assert.deepEqual(problems, []);
  });

  it('inventoryWorkshopTools ok', () => {
    const inv = inventoryWorkshopTools(repoRoot);
    assert.equal(inv.ok, true);
    assert.ok(inv.tools.length >= 5);
    const ids = inv.tools.map((t) => t.id);
    assert.ok(ids.includes('publish'));
    assert.ok(ids.includes('generate'));
  });

  it('validateWorkshop manifest passes', () => {
    const path = resolve(repoRoot, 'docs/containers/strategic-docs/workshop.manifest.json');
    const r = validateWorkshop(path, repoRoot);
    assert.equal(r.valid, true, r.problems.join('; '));
  });
});
