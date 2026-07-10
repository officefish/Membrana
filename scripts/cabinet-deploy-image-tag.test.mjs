import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveCabinetImageTag } from './_ssh-cabinet-deploy-image.mjs';

test('resolveCabinetImageTag: дефолт main, НЕ latest (откат прода 2026-07-09)', () => {
  assert.equal(resolveCabinetImageTag({ env: {}, envFileGet: () => '' }), 'main');
});

test('resolveCabinetImageTag: явный env-тег имеет приоритет', () => {
  assert.equal(
    resolveCabinetImageTag({ env: { CABINET_IMAGE_TAG: 'sha-abc1234' }, envFileGet: () => '' }),
    'sha-abc1234',
  );
});

test('resolveCabinetImageTag: .env-файл — второй приоритет', () => {
  assert.equal(
    resolveCabinetImageTag({ env: {}, envFileGet: (k) => (k === 'CABINET_IMAGE_TAG' ? 'cabinet-v1.2.3' : '') }),
    'cabinet-v1.2.3',
  );
});
