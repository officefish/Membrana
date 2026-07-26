import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildAffineCliEnvFromAuth,
  detectSocketIoBlocked,
  isSocketIoPushError,
  pushImportBundle,
  resetAffineCliPushEnv,
  resolveAffineCliPath,
  resolveExistingDocId,
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
    assert.match(socketIoPushHint('https://strategy.mmbrn.tech'), /socket\.io/);
  });

  it('buildAffineCliEnvFromAuth prefers session cookie over bearer token', () => {
    const prevToken = process.env.AFFINE_API_TOKEN;
    process.env.AFFINE_API_TOKEN = 'test-token';
    try {
      const env = buildAffineCliEnvFromAuth({ cookieHeader: 'affine_session=x', token: 'ignored' });
      assert.equal(env.AFFINE_COOKIE, 'affine_session=x');
      assert.equal(env.AFFINE_API_TOKEN, undefined);
    } finally {
      if (prevToken === undefined) delete process.env.AFFINE_API_TOKEN;
      else process.env.AFFINE_API_TOKEN = prevToken;
    }
  });

  it('resolveAffineCliPath returns null or string', () => {
    const p = resolveAffineCliPath();
    assert.ok(p === null || typeof p === 'string');
  });

  it('pushImportBundle fails without manifest', async () => {
    resetAffineCliPushEnv();
    const dir = mkdtempSync(join(tmpdir(), 'affine-push-'));
    const r = await pushImportBundle({
      bundleDir: dir,
      workspaceId: '00000000-0000-0000-0000-000000000001',
    });
    if (resolveAffineCliPath()) {
      assert.equal(r.ok, false);
      assert.match(r.error ?? '', /manifest missing/);
    } else {
      assert.equal(r.ok, false);
      assert.match(r.error ?? '', /affine-cli not found/);
    }
  });

  it('resolveExistingDocId prefers title then legacyTitles', () => {
    const map = new Map([
      ['Meta · affine-surface-policy', 'legacy-id'],
      ['Meta · Release · affine-surface-policy', 'new-id'],
    ]);
    assert.equal(
      resolveExistingDocId(map, 'Meta · Release · affine-surface-policy', [
        'Meta · affine-surface-policy',
      ]),
      'new-id',
    );
    assert.equal(
      resolveExistingDocId(map, 'Meta · Release · other', ['Meta · affine-surface-policy']),
      'legacy-id',
    );
    assert.equal(resolveExistingDocId(map, 'Missing', ['Also missing']), undefined);
  });

  it('pushImportBundle dry-run with manifest when cli present', async () => {
    const cli = resolveAffineCliPath();
    if (!cli) return;

    resetAffineCliPushEnv();
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
            pairRole: 'content',
            pairTitle: 'Meta · Granule · dry-run-only',
          },
        ],
      }),
      'utf8',
    );

    const r = await pushImportBundle({
      bundleDir: dir,
      workspaceId: process.env.AFFINE_WORKSPACE_TEMPLATES_ID ?? '00000000-0000-0000-0000-000000000001',
      dryRun: true,
    });
    assert.equal(r.dryRun, true);
    assert.ok(Array.isArray(r.results));
    assert.match(r.namespaceStrategy ?? '', /tag/);
  });
});
