import assert from 'node:assert/strict';
import { test } from 'node:test';

import { auditManifest, computeCohensKappa, computeIntraRater, parseArgs } from './validate-vdr.mjs';

function sample(id, label, notes = '') {
  return { id, label, notes, path: null };
}

test('auditManifest считает метки и ловит дубли id/источников', () => {
  const manifest = {
    samples: [
      sample('a', 'drone', 'seamless-loop; Binary_Drone_Audio/yes_drone/B_S1_X_001_.wav'),
      sample('b', 'not-drone', 'ESC-50 category=wind; 1-100-A-16.wav'),
      sample('c', 'unlabeled'),
      sample('a', 'drone'),
      sample('d', 'not-drone', 'ESC-50 category=wind; 1-100-A-16.wav'),
      sample('e', 'wat'),
    ],
  };
  const { counts, errors } = auditManifest(manifest, null);
  assert.equal(counts.total, 6);
  assert.equal(counts.drone, 2);
  assert.equal(counts['not-drone'], 2);
  assert.equal(counts.unlabeled, 1);
  assert.ok(errors.some((e) => e.includes('дубль id: a')));
  assert.ok(errors.some((e) => e.includes('дубль источника 1-100-A-16.wav')));
  assert.ok(errors.some((e) => e.includes('invalid label "wat"')));
});

test('computeIntraRater: воспроизводимость и расхождения; unlabeled пропускается', () => {
  const original = [sample('a', 'drone'), sample('b', 'not-drone'), sample('c', 'drone'), sample('d', 'unlabeled')];
  const relabel = [
    { id: 'a', label: 'drone' },
    { id: 'b', label: 'drone' }, // расхождение
    { id: 'c', label: 'drone' },
    { id: 'd', label: 'drone' }, // original unlabeled — вне сравнения
    { id: 'zzz', label: 'drone' }, // нет в оригинале — вне сравнения
  ];
  const result = computeIntraRater(original, relabel);
  assert.equal(result.compared, 3);
  assert.equal(result.agreed, 2);
  assert.ok(Math.abs(result.reproducibility - 2 / 3) < 1e-9);
  assert.deepEqual(result.disagreements, [{ id: 'b', first: 'not-drone', second: 'drone' }]);
});

test('computeCohensKappa: полное согласие = 1, случайность ~0', () => {
  const a = [
    { id: '1', label: 'drone' },
    { id: '2', label: 'not-drone' },
    { id: '3', label: 'drone' },
    { id: '4', label: 'not-drone' },
  ];
  const perfect = computeCohensKappa(a, a);
  assert.equal(perfect.kappa, 1);
  assert.equal(perfect.n, 4);

  // Аннотатор B «переворачивает» половину — согласие 50% при равных маргиналах → Kappa 0.
  const b = [
    { id: '1', label: 'drone' },
    { id: '2', label: 'drone' },
    { id: '3', label: 'not-drone' },
    { id: '4', label: 'not-drone' },
  ];
  const random = computeCohensKappa(a, b);
  assert.equal(random.observedAgreement, 0.5);
  assert.equal(random.kappa, 0);
});

test('computeCohensKappa: пустое пересечение → kappa null', () => {
  const result = computeCohensKappa([{ id: 'x', label: 'drone' }], [{ id: 'y', label: 'drone' }]);
  assert.equal(result.n, 0);
  assert.equal(result.kappa, null);
});

test('parseArgs: дефолты и валидация порога', () => {
  const def = parseArgs([]);
  assert.equal(def.intraRaterThreshold, 0.95);
  assert.ok(def.manifest.replace(/\\/g, '/').endsWith('vdr-hard-gate-pilot/manifest.json'));
  assert.throws(() => parseArgs(['--intra-rater-threshold', '1.5']));
});
