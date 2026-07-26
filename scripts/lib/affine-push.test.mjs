import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  detectSocketIoBlocked,
  isSocketIoPushError,
  pushImportBundle,
  resolveAffineCliPath,
  socketIoPushHint,
} from './affine-push.mjs';

describe('affine-push', () => {
  it('isSocketIoPushError detects socket.io failures', () => {
    assert.equal(isSocketIoPushError('socket.io connect timeout after 10s'), true);
    assert.equal(isSocketIoPushError("missing 'data' field"), true);
    assert.equal(isSocketIoPushError('affine-cli not found'), false);
  });

  it('detectSocketIoBlocked when all failures are socket.io', () => {
    const results = [
      { ok: false, error: 'socket.io connect timeout after 10s' },
      { ok: false, error: "missing 'data' field" },
    ];
    assert.equal(detectSocketIoBlocked(results), true);
    assert.match(socketIoPushHint('https://strategy.mmbrn.tech'), /WebSocket/);
  });

  it('resolveAffineCliPath returns null or string', () => {
    const p = resolveAffineCliPath();
    assert.ok(p === null || typeof p === 'string');
  });

  it('pushImportBundle fails without manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'affine-push-'));
    const r = pushImportBundle({ bundleDir: dir, workspaceId: '00000000-0000-0000-0000-000000000001' });
    if (resolveAffineCliPath()) {
      assert.equal(r.ok, false);
      assert.match(r.error ?? '', /manifest missing/);
    } else {
      assert.equal(r.ok, false);
      assert.match(r.error ?? '', /affine-cli not found/);
    }
  });

  it('pushImportBundle dry-run with manifest when cli present', () => {
    const cli = resolveAffineCliPath();
    if (!cli) return;

    const dir = mkdtempSync(join(tmpdir(), 'affine-push-'));
    mkdirSync(join(dir, 'strategic-docs'), { recursive: true });
    writeFileSync(join(dir, 'strategic-docs', 'Test.md'), '# Test\n', 'utf8');
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({
        entries: [
          {
            title: 'Test · dry-run-only',
            namespace: 'strategic-docs',
            file: 'strategic-docs/Test.md',
            kind: 'granule',
          },
        ],
      }),
      'utf8',
    );

    const r = pushImportBundle({
      bundleDir: dir,
      workspaceId: process.env.AFFINE_WORKSPACE_TEMPLATES_ID ?? '00000000-0000-0000-0000-000000000001',
      dryRun: true,
    });
    assert.ok(Array.isArray(r.results));
  });
});
