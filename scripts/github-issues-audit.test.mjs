import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import {
  loadManifest,
  renderAuditReport,
  validateManifestCoverage,
} from './lib/github-issues-audit.mjs';

test('loadManifest reads 2026-06-20 audit manifest', () => {
  const manifest = loadManifest(
    resolve('docs/issues/manifests/github-issues-audit-2026-06-20.json'),
  );
  assert.equal(manifest.version, 1);
  assert.equal(manifest.auditDate, '2026-06-20');
  assert.ok(manifest.closed.length >= 10);
  assert.ok(manifest.open.length >= 10);
});

test('renderAuditReport includes priority sections', () => {
  const manifest = loadManifest(
    resolve('docs/issues/manifests/github-issues-audit-2026-06-20.json'),
  );
  const ghOpen = manifest.open.map((o) => ({
    number: o.number,
    title: `Issue ${o.number}`,
    url: `https://github.com/officefish/Membrana/issues/${o.number}`,
  }));
  const validation = validateManifestCoverage(manifest, ghOpen);
  const md = renderAuditReport(manifest, ghOpen, validation);
  assert.match(md, /## 1\. Закрытые issues/);
  assert.match(md, /🔴 \*\*Важно\*\*/);
  assert.match(md, /⚪ \*\*Не обязательно\*\*/);
});
