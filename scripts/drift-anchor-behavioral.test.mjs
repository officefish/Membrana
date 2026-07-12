import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildBehavioralComponents, computeGoldenCombinedScore } from './drift-anchor-behavioral.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Детекторы собираются отдельно (yarn benchmark:detectors) — в CI без build тест скипается.
const BUILT = existsSync(join(ROOT, 'packages/services/detectors/harmonic/dist/index.js'));
const skip = BUILT ? false : 'DSP-детекторы не собраны (yarn benchmark:detectors)';

test('golden combinedScore детерминирован и в [0..1]', { skip }, async () => {
  const a = await computeGoldenCombinedScore();
  const b = await computeGoldenCombinedScore();
  assert.equal(a.combinedScore, b.combinedScore, 'два прогона одного сэмпла совпадают');
  assert.ok(a.combinedScore > 0 && a.combinedScore <= 1);
});

test('behavioral-компоненты: combinedScore + per-detector, kind=behavioral', { skip }, async () => {
  const comps = await buildBehavioralComponents();
  const ids = comps.map((c) => c.id);
  assert.ok(ids.includes('combinedScore:drone-golden'));
  assert.ok(ids.includes('detector:harmonic:drone-golden'));
  assert.ok(comps.every((c) => c.kind === 'behavioral' && typeof c.value === 'number'));
});
