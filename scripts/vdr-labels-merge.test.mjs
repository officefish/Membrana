import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  flattenLabels,
  indexExportedLabels,
  labelKeyFromFileName,
  mergeLabelsIntoManifest,
} from './vdr-labels-merge.mjs';

const EXPORT_SAMPLE = {
  collection: 'vdr-pilot',
  labels: [
    { fileName: 'dad-bebop-01.wav', label: 'drone', notes: 'чистый звук ротора' },
    { fileName: 'esc-helicopter-02.wav', label: 'not-drone', notes: null },
    { fileName: 'esc-wind-03.WAV', label: 'unlabeled', notes: null },
    { fileName: 'broken-row.wav', label: 'maybe', notes: null },
  ],
};

const MANIFEST_SAMPLE = {
  version: 'vdr-hard-gate-pilot-v1',
  samples: [
    { id: 'dad-bebop-01', label: 'unlabeled', path: 'samples/dad-bebop-01.wav' },
    { id: 'esc-helicopter-02', label: 'unlabeled', path: 'samples/esc-helicopter-02.wav' },
    { id: 'esc-untouched-04', label: 'unlabeled', path: 'samples/esc-untouched-04.wav' },
  ],
};

test('labelKeyFromFileName: срезает .wav в любом регистре', () => {
  assert.equal(labelKeyFromFileName('a-b.wav'), 'a-b');
  assert.equal(labelKeyFromFileName('a-b.WAV'), 'a-b');
  assert.equal(labelKeyFromFileName(' a-b '), 'a-b');
});

test('indexExportedLabels: валидные в Map, битые строки в invalid', () => {
  const { byId, invalid, duplicates } = indexExportedLabels(EXPORT_SAMPLE);
  assert.equal(byId.size, 3);
  assert.deepEqual(byId.get('dad-bebop-01'), { label: 'drone', notes: 'чистый звук ротора' });
  assert.deepEqual(invalid, ['broken-row.wav']);
  assert.deepEqual(duplicates, []);
});

test('mergeLabelsIntoManifest: applied/same/untouched/unmatched + operatorNotes', () => {
  const { byId } = indexExportedLabels(EXPORT_SAMPLE);
  byId.set('ghost-99', { label: 'drone', notes: null });
  const { manifest, report } = mergeLabelsIntoManifest(MANIFEST_SAMPLE, byId);

  assert.deepEqual(report.applied, ['dad-bebop-01', 'esc-helicopter-02']);
  assert.deepEqual(report.untouched, ['esc-untouched-04']);
  assert.deepEqual(report.unmatchedExport, ['esc-wind-03', 'ghost-99']);
  assert.equal(manifest.samples[0].label, 'drone');
  assert.equal(manifest.samples[0].operatorNotes, 'чистый звук ротора');
  assert.equal(manifest.samples[1].label, 'not-drone');
  // Исходный объект не мутирован.
  assert.equal(MANIFEST_SAMPLE.samples[0].label, 'unlabeled');
});

test('mergeLabelsIntoManifest: повторный прогон — alreadySame, без applied', () => {
  const { byId } = indexExportedLabels(EXPORT_SAMPLE);
  const first = mergeLabelsIntoManifest(MANIFEST_SAMPLE, byId);
  const second = mergeLabelsIntoManifest(first.manifest, byId);
  assert.deepEqual(second.report.applied, []);
  assert.deepEqual(second.report.alreadySame, ['dad-bebop-01', 'esc-helicopter-02']);
});

test('flattenLabels: сортированный [{id, label}] — формат validate:vdr', () => {
  const { byId } = indexExportedLabels(EXPORT_SAMPLE);
  const flat = flattenLabels(byId);
  assert.deepEqual(
    flat.map((r) => r.id),
    ['dad-bebop-01', 'esc-helicopter-02', 'esc-wind-03'],
  );
  assert.deepEqual(flat[0], { id: 'dad-bebop-01', label: 'drone' });
});
