import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contextsForAllMembranes, sendContextsToMedia } from './lib/tariff-devices-fanout.mjs';

const membrane = {
  id: 'm-1',
  tariff: {
    tariffContractVersion: 2,
    userStorageQuotaBytes: 1000n,
    bufferQuotaBytes: 2000n,
    datasetCatalogId: 'catalog-checkpoint',
    maxUserWorkspaces: 7,
  },
  nodes: [
    { id: 'n-1', device: { mediaDeviceId: 'dev-1' } },
    { id: 'n-2', device: { mediaDeviceId: 'dev-2' } },
    { id: 'n-3', device: null },
  ],
};

test('rollout contexts include every paired device across every membrane', () => {
  const contexts = contextsForAllMembranes([membrane, { ...membrane, id: 'm-2' }]);
  assert.deepEqual(contexts.map((c) => `${c.membrane.membraneId}:${c.deviceId}`), [
    'm-1:dev-1',
    'm-1:dev-2',
    'm-2:dev-1',
    'm-2:dev-2',
  ]);
});

test('rollout context carries version and all tariff fields', () => {
  const [context] = contextsForAllMembranes([membrane]);
  assert.equal(context.membrane.tariffContractVersion, 2);
  assert.equal(context.membrane.userStorageQuotaBytes, '1000');
  assert.equal(context.membrane.bufferQuotaBytes, '2000');
  assert.equal(context.membrane.datasetCatalogId, 'catalog-checkpoint');
  assert.equal(context.membrane.maxUserWorkspaces, 7);
});

test('rollout counts per-device domain refusals as failed, not as a global throw', async () => {
  const contexts = contextsForAllMembranes([membrane]);
  const result = await sendContextsToMedia(contexts, async (context) =>
    context.deviceId === 'dev-2' ? { ok: false } : { ok: true },
  );
  assert.deepEqual(result, { attempted: 2, updated: 1, failed: 1 });
});
