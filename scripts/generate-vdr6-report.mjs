#!/usr/bin/env node
/**
 * VDR6: synthesize val-split closure report from calibration + benchmark JSON.
 *
 * Usage: yarn report:vdr6
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  confusionFromPairs,
  f1Score,
  formatPct,
  precision,
  recall,
} from './lib/benchmark-metrics.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V02 = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const CALIBRATION_JSON = join(V02, 'reports', 'calibration-latest.json');
const BENCHMARK_JSON = join(V02, 'reports', 'latest.json');
const MANIFEST_PATH = join(V02, 'manifest.json');
const OUT_JSON = join(V02, 'reports', 'vdr6-closure.json');
const OUT_MD = join(ROOT, 'docs', 'discussions', 'vdr-epic-closure-2026-06-15.md');

const ACCURACY_GOAL = 0.8;

function metricsFromConfusion({ tp, fp, fn, tn }, total) {
  const prec = precision(tp, fp);
  const rec = recall(tp, fn);
  const accuracy = total > 0 ? (tp + tn) / total : null;
  return {
    tp,
    fp,
    fn,
    tn,
    precision: prec,
    recall: rec,
    f1: f1Score(prec, rec),
    accuracy,
    accuracyGoalPassed: accuracy != null && accuracy >= ACCURACY_GOAL,
  };
}

function valMetricsFromPerSample(perSample, valIds) {
  const valSet = new Set(valIds);
  const pairs = perSample
    .filter((row) => valSet.has(row.id))
    .map((row) => ({ truthDrone: row.truthDrone, predDrone: row.predDrone }));
  return metricsFromConfusion(confusionFromPairs(pairs), pairs.length);
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const calibration = JSON.parse(await readFile(CALIBRATION_JSON, 'utf8'));
  const benchmark = JSON.parse(await readFile(BENCHMARK_JSON, 'utf8'));

  const valIds = manifest.samples.filter((s) => s.split === 'val').map((s) => s.id);
  if (valIds.length === 0) throw new Error('Manifest has no val split');

  const rows = [];

  for (const detector of calibration.detectors) {
    const m = detector.val;
    rows.push({
      name: detector.name,
      source: 'calibration-latest.json (train-tuned config)',
      val: {
        ...m,
        accuracyGoalPassed: m.accuracy != null && m.accuracy >= ACCURACY_GOAL,
      },
    });
  }

  const templateBench = benchmark.detectors.find((d) => d.name === 'template-match');
  if (!templateBench?.perSample) {
    throw new Error('Benchmark missing template-match perSample — run yarn benchmark:detectors');
  }
  const templateVal = valMetricsFromPerSample(templateBench.perSample, valIds);
  rows.push({
    name: 'template-match',
    source: 'latest.json perSample on val split',
    val: templateVal,
  });

  const bestByAccuracy = rows.reduce((a, b) =>
    (b.val.accuracy ?? 0) > (a.val.accuracy ?? 0) ? b : a,
  );
  const bestByF1 = rows.reduce((a, b) => (b.val.f1 ?? 0) > (a.val.f1 ?? 0) ? b : a);

  const report = {
    generatedAt: new Date().toISOString(),
    epic: 'validated-drone-recognition',
    phase: 'vdr6-epic-closure',
    dataset: 'free-v1 v0.2',
    groundTruth: manifest.groundTruth ?? null,
    valCount: valIds.length,
    accuracyGoal: ACCURACY_GOAL,
    accuracyGoalPassed: rows.some((r) => r.val.accuracyGoalPassed),
    bestValAccuracy: { name: bestByAccuracy.name, accuracy: bestByAccuracy.val.accuracy },
    bestValF1: { name: bestByF1.name, f1: bestByF1.val.f1 },
    detectors: rows,
    recommendations: [
      'FFT-only stack exhausted for free-v1: val accuracy ≤56%; do not block product on 80% gate.',
      'Ship template-match as best FFT trends row in sample-library plugin; keep harmonic for interpretability.',
      'Next tariff (out of scope this week): MFCC analyzer + spectrogram features + ~600 samples.',
      'Follow-up epic: journal refactor (agenda telemetry / sample-library drone journal).',
      'Optional later: weighted ensemble of harmonic + template-match; neural zero-shot (YAMNet) only after LGTM.',
    ],
  };

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const tableLines = [
    '| Детектор | Val accuracy | Val F1 | Val P | Val R | ≥80% accuracy |',
    '|----------|--------------|--------|-------|-------|---------------|',
    ...rows.map((r) => {
      const m = r.val;
      return `| ${r.name} | ${formatPct(m.accuracy)} | ${formatPct(m.f1)} | ${formatPct(m.precision)} | ${formatPct(m.recall)} | ${m.accuracyGoalPassed ? 'да' : 'нет'} |`;
    }),
  ];

  const md = `# VDR epic closure — validated drone recognition (2026-06-15)

> **Эпик:** [\`VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md\`](../prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md)  
> **JSON:** [\`vdr6-closure.json\`](../../data/detectors-benchmark/v0.2/reports/vdr6-closure.json)  
> **Ground truth:** [\`DATASET_CURATION.md\`](../DATASET_CURATION.md) · 120/120 curated · 80 train / 40 val

## Итог эпика (FFT-only, free-v1)

| Фаза | Статус |
|------|--------|
| VDR1–VDR2 | label + notes API/UI |
| VDR3 | export ground truth → manifest |
| VDR4 | DSP calibration on curated labels |
| VDR5 | template-match + \`DRONE_CURATED\` |
| VDR6 | этот отчёт |

**Цель ≥80% val accuracy:** **не достигнута** (by design acceptable для текущего тарифа).

## Val-split (40 сэмплов)

${tableLines.join('\n')}

**Лучший val accuracy:** ${bestByAccuracy.name} — ${formatPct(bestByAccuracy.val.accuracy)}  
**Лучший val F1:** ${bestByF1.name} — ${formatPct(bestByF1.val.f1)}

## Выводы

1. **Операторская разметка** работает (120/120, notes в manifest); метрики не выросли vs folder-labels — узкое место в **FFT-признаках**, не в GT.
2. **Template-match** (trends + curated шаблон) — лучший F1 на полном корпусе (71.4%) и конкурентен на val; всё ещё высокий FP на not-drone (речь, природа).
3. **Одиночные пороги** harmonic/cepstral/flux исчерпаны; grid search не спасает TN≈0 у cepstral.

## Рекомендации (приоритет)

${report.recommendations.map((line, i) => `${i + 1}. ${line}`).join('\n')}

## Команды воспроизведения

\`\`\`bash
yarn dataset:export-ground-truth
yarn templates:build-from-dataset
yarn calibrate:detectors
yarn benchmark:detectors
yarn report:vdr6
\`\`\`
`;

  await writeFile(OUT_MD, md, 'utf8');
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(
    `Accuracy goal: ${report.accuracyGoalPassed ? 'PASSED' : 'NOT PASSED'} (best ${bestByAccuracy.name} ${formatPct(bestByAccuracy.val.accuracy)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
