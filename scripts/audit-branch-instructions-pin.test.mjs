/**
 * F4 #828 — зуб PINNED_SUBGRAPH: missing + drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import {
  auditPin,
  auditSummary,
  formatAuditTable,
  hashObject,
  refreshManifestShas,
} from './lib/branch-instructions-pin.mjs';

function gitInitWithFile(dir, rel, body) {
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: dir,
    stdio: 'ignore',
  });
  execFileSync('git', ['config', 'user.name', 'test'], { cwd: dir, stdio: 'ignore' });
  const abs = join(dir, rel);
  mkdirSync(join(dir, rel.split('/').slice(0, -1).join('/')), { recursive: true });
  writeFileSync(abs, body, 'utf8');
  return hashObject(dir, rel);
}

test('auditPin: ok when SHA matches', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bme-pin-ok-'));
  try {
    const sha = gitInitWithFile(dir, 'a.md', 'hello\n');
    const rows = auditPin({ nodes: { 'a.md': sha } }, dir);
    assert.equal(rows[0].status, 'ok');
    assert.equal(auditSummary(rows).clean, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditPin: drift when content moved', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bme-pin-drift-'));
  try {
    const sha = gitInitWithFile(dir, 'a.md', 'hello\n');
    writeFileSync(join(dir, 'a.md'), 'hello world\n', 'utf8');
    const rows = auditPin({ nodes: { 'a.md': sha } }, dir);
    assert.equal(rows[0].status, 'drift');
    assert.equal(auditSummary(rows).clean, false);
    assert.match(formatAuditTable(rows), /drift/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditPin: missing node', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bme-pin-miss-'));
  try {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    const rows = auditPin(
      { nodes: { 'gone.md': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } },
      dir,
    );
    assert.equal(rows[0].status, 'missing');
    assert.equal(auditSummary(rows).missing, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refreshManifestShas updates expected blobs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bme-pin-refresh-'));
  try {
    const sha1 = gitInitWithFile(dir, 'a.md', 'v1\n');
    writeFileSync(join(dir, 'a.md'), 'v2\n', 'utf8');
    const next = refreshManifestShas({ nodes: { 'a.md': sha1 }, owner: 't' }, dir);
    assert.notEqual(next.nodes['a.md'], sha1);
    assert.equal(next.nodes['a.md'], hashObject(dir, 'a.md'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
