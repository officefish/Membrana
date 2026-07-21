import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  auditKit,
  collectSubgraph,
  gitBlobSha,
  kitManifestSchemaProblems,
} from './lib/kit-subgraph-audit.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'kit-audit-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function writeTree(files) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(tmp, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, body);
  }
}

test('gitBlobSha стабилен и отличим при смене содержимого', () => {
  const a = gitBlobSha('hello\n');
  const b = gitBlobSha('hello!\n');
  assert.match(a, /^[0-9a-f]{40}$/);
  assert.notEqual(a, b);
});

test('collectSubgraph тянет транзитивный импорт', () => {
  writeTree({
    'scripts/root.mjs': "import './lib/a.mjs';\n",
    'scripts/lib/a.mjs': "import './b.mjs';\nexport const x = 1;\n",
    'scripts/lib/b.mjs': 'export const y = 2;\n',
  });
  const { paths, errors } = collectSubgraph(tmp, ['scripts/root.mjs']);
  assert.equal(errors.length, 0);
  assert.deepEqual([...paths].sort(), [
    'scripts/lib/a.mjs',
    'scripts/lib/b.mjs',
    'scripts/root.mjs',
  ]);
});

test('недостающий узел в pins → missing_pin (blocking)', () => {
  writeTree({
    'scripts/root.mjs': "import './dep.mjs';\n",
    'scripts/dep.mjs': 'export {};\n',
    'kits/demo/MANIFEST.json': JSON.stringify({
      id: 'demo',
      leadPersona: 'dynin',
      roots: ['scripts/root.mjs'],
      pins: {
        'scripts/root.mjs': gitBlobSha("import './dep.mjs';\n"),
        // dep намеренно забыт
      },
    }),
  });
  const r = auditKit({ repoRoot: tmp, kitDir: join(tmp, 'kits', 'demo'), mode: 'pinned' });
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => f.kind === 'missing_pin' && f.path === 'scripts/dep.mjs' && f.blocking));
});

test('уехавший SHA → sha_drift; pinned=blocking, latest=warn', () => {
  const rootBody = 'export const v = 1;\n';
  const staleSha = gitBlobSha('export const v = 0;\n');
  const liveSha = gitBlobSha(rootBody);
  assert.notEqual(staleSha, liveSha);

  writeTree({
    'scripts/root.mjs': rootBody,
    'kits/demo/MANIFEST.json': JSON.stringify({
      id: 'demo',
      leadPersona: 'dynin',
      roots: ['scripts/root.mjs'],
      pins: { 'scripts/root.mjs': staleSha },
    }),
  });

  const pinned = auditKit({ repoRoot: tmp, kitDir: join(tmp, 'kits', 'demo'), mode: 'pinned' });
  assert.equal(pinned.ok, false);
  const driftP = pinned.findings.find((f) => f.kind === 'sha_drift');
  assert.ok(driftP);
  assert.equal(driftP.blocking, true);

  const latest = auditKit({ repoRoot: tmp, kitDir: join(tmp, 'kits', 'demo'), mode: 'latest' });
  assert.equal(latest.ok, true, latest.findings.map((f) => f.detail).join('; '));
  const driftL = latest.findings.find((f) => f.kind === 'sha_drift');
  assert.ok(driftL);
  assert.equal(driftL.blocking, false);
});

test('схема: root не в pins — дефект', () => {
  const problems = kitManifestSchemaProblems(
    {
      id: 'x',
      leadPersona: 'dynin',
      roots: ['scripts/a.mjs'],
      pins: { 'scripts/b.mjs': 'a'.repeat(40) },
    },
    'x',
  );
  assert.ok(problems.some((p) => p.includes('root не в pins')));
});
