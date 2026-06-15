import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeGroundTruthIntoManifest,
  normalizeGroundTruthLabel,
} from './lib/ground-truth-export.mjs';

test('normalizeGroundTruthLabel', () => {
  assert.equal(normalizeGroundTruthLabel('drone'), 'drone');
  assert.equal(normalizeGroundTruthLabel('not-drone'), 'not-drone');
  assert.equal(normalizeGroundTruthLabel('not_drone'), 'not-drone');
  assert.equal(normalizeGroundTruthLabel('unlabeled'), 'unlabeled');
  assert.equal(normalizeGroundTruthLabel(undefined), 'unlabeled');
});

test('mergeGroundTruthIntoManifest updates label and notes', () => {
  const manifest = [
    { id: 'a', path: 'drone/a.wav', label: 'drone', split: 'train', notes: 'old' },
    { id: 'b', path: 'not-drone/b.wav', label: 'not-drone', split: 'val' },
  ];
  const catalog = [
    { id: 'a', label: 'not_drone', notes: 'оператор: не дрон' },
    { id: 'b', label: 'drone', notes: null },
  ];
  const { samples, stats } = mergeGroundTruthIntoManifest(manifest, catalog);
  assert.equal(samples[0].label, 'not-drone');
  assert.equal(samples[0].notes, 'оператор: не дрон');
  assert.equal(samples[1].label, 'drone');
  assert.equal(samples[1].notes, null);
  assert.equal(stats.labeled, 2);
  assert.equal(stats.missingInCatalog.length, 0);
});

test('mergeGroundTruthIntoManifest matches catalog title to manifest id', () => {
  const manifest = [{ id: 'drone-dad-0030', label: 'drone', notes: 'old' }];
  const catalog = [
    {
      id: '7002267d-8ee5-4b70-9e7a-49ecc88fa4bb',
      title: 'drone-dad-0030',
      label: 'not_drone',
      notes: 'оператор',
    },
  ];
  const { samples, stats } = mergeGroundTruthIntoManifest(manifest, catalog);
  assert.equal(samples[0].label, 'not-drone');
  assert.equal(samples[0].notes, 'оператор');
  assert.equal(stats.labeled, 1);
  assert.equal(stats.missingInCatalog.length, 0);
});

test('mergeGroundTruthIntoManifest reports missing catalog ids', () => {
  const { stats } = mergeGroundTruthIntoManifest(
    [{ id: 'only-manifest', label: 'drone' }],
    [],
  );
  assert.deepEqual(stats.missingInCatalog, ['only-manifest']);
});
