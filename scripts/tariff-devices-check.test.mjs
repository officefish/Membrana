import assert from 'node:assert/strict';
import { test } from 'node:test';

import { expectedDevicesFromCabinetRows, tariffDeviceFindings } from './lib/tariff-devices-check.mjs';

const cabinetRow = {
  mediaDeviceId: 'dev-1',
  node: {
    membrane: {
      tariff: {
        tariffContractVersion: 2,
        userStorageQuotaBytes: 1000n,
        bufferQuotaBytes: 2000n,
        datasetCatalogId: 'catalog-checkpoint',
        maxUserWorkspaces: 7,
      },
    },
  },
};

test('tooth 3 is green on field-by-field equality, not on count equality', () => {
  const expected = expectedDevicesFromCabinetRows([cabinetRow]);
  assert.deepEqual(
    tariffDeviceFindings(expected, [
      {
        id: 'dev-1',
        tariffContractVersion: 2,
        userStorageQuotaBytes: 1000n,
        bufferQuotaBytes: 2000n,
        datasetCatalogId: 'catalog-checkpoint',
        maxUserWorkspaces: 7,
        bufferPolicy: 'stop',
      },
    ]),
    [],
  );
});

test('tooth 3 reddens on one drift even when device count is still equal', () => {
  const expected = expectedDevicesFromCabinetRows([cabinetRow]);
  const findings = tariffDeviceFindings(expected, [
    {
      id: 'dev-1',
      tariffContractVersion: 2,
      userStorageQuotaBytes: 1000n,
      bufferQuotaBytes: 42n,
      datasetCatalogId: 'catalog-checkpoint',
      maxUserWorkspaces: 7,
      bufferPolicy: 'stop',
    },
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].where, 'dev-1.bufferQuotaBytes');
});

test('tooth 3 reddens on stale contract version', () => {
  const expected = expectedDevicesFromCabinetRows([cabinetRow]);
  const findings = tariffDeviceFindings(expected, [
    {
      id: 'dev-1',
      tariffContractVersion: 1,
      userStorageQuotaBytes: 1000n,
      bufferQuotaBytes: 2000n,
      datasetCatalogId: 'catalog-checkpoint',
      maxUserWorkspaces: 7,
      bufferPolicy: 'stop',
    },
  ]);
  assert.equal(findings[0].where, 'dev-1.tariffContractVersion');
});

test('tooth 3 reddens on policy drift', () => {
  const expected = expectedDevicesFromCabinetRows([cabinetRow]);
  const findings = tariffDeviceFindings(expected, [
    {
      id: 'dev-1',
      tariffContractVersion: 2,
      userStorageQuotaBytes: 1000n,
      bufferQuotaBytes: 2000n,
      datasetCatalogId: 'catalog-checkpoint',
      maxUserWorkspaces: 7,
      bufferPolicy: 'smart_cleanup',
    },
  ]);
  assert.equal(findings[0].where, 'dev-1.bufferPolicy');
});
