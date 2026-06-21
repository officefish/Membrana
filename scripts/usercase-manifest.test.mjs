import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadUserCaseManifest,
  validateUserCaseManifest,
} from './lib/usercase-manifest.mjs';
import { normalizeUserCaseFolderId } from './lib/usercase-paths.mjs';
import { loadScenarioNodeKinds } from './lib/scenario-node-kinds.mjs';

describe('usercase-manifest', () => {
  it('normalizeUserCaseFolderId strips usercase- prefix', () => {
    assert.equal(normalizeUserCaseFolderId('usercase-mvp-microphone'), 'mvp-microphone');
    assert.equal(normalizeUserCaseFolderId('mvp-microphone'), 'mvp-microphone');
  });

  it('validateUserCaseManifest accepts canonical MVP fields', () => {
    const manifest = validateUserCaseManifest({
      id: 'usercase-mvp-microphone',
      title: 'MVP microphone',
      deviceKind: 'microphone',
      embeddedDocument: 'packages/device-board/src/graph/default-usercase-mvp-microphone.generated.ts',
      layoutProfile: 'exec-lr-v1',
      tier: 'bundled',
      minEditorFeatures: ['align', 'groups', 'functions', 'exec-layout'],
      branches: { main: { bundleFile: '03-onMainTick.json' } },
    });
    assert.equal(manifest.id, 'usercase-mvp-microphone');
  });

  it('validateUserCaseManifest rejects missing layoutProfile', () => {
    assert.throws(() =>
      validateUserCaseManifest({
        id: 'usercase-demo',
        title: 'Demo',
        deviceKind: 'microphone',
        embeddedDocument: 'path.ts',
        minEditorFeatures: ['align'],
        branches: { main: {} },
      }),
    );
  });

  it('loadUserCaseManifest reads bundled MVP manifest', () => {
    const manifest = loadUserCaseManifest('usercase-mvp-microphone');
    assert.equal(manifest.deviceKind, 'microphone');
    assert.equal(manifest.layoutProfile, 'exec-lr-v1');
  });

  it('loadScenarioNodeKinds includes make-recording-policy', () => {
    const kinds = loadScenarioNodeKinds();
    assert.ok(kinds.includes('make-recording-policy'));
    assert.ok(kinds.includes('function-input'));
  });
});

describe('usercase-manifest temp dir', () => {
  it('loadUserCaseManifest validates tariffSku for tariff tier', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'membrana-uc-'));
    try {
      const dir = join(cwd, 'docs/device-board-scripts/usercase-tariff-demo');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'manifest.json'),
        `${JSON.stringify(
          {
            id: 'usercase-tariff-demo',
            title: 'Tariff demo',
            deviceKind: 'microphone',
            embeddedDocument: 'packages/foo.ts',
            layoutProfile: 'exec-lr-v1',
            tier: 'tariff',
            tariffSku: 'pro-usercases-v1',
            minEditorFeatures: ['align'],
            branches: { main: {} },
          },
          null,
          2,
        )}\n`,
      );
      const manifest = loadUserCaseManifest('usercase-tariff-demo', cwd);
      assert.equal(manifest.tariffSku, 'pro-usercases-v1');
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
