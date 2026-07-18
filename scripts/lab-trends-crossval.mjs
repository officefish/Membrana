#!/usr/bin/env node
/**
 * ЛАБОРАТОРНЫЙ прогон: trends-fft на ВСЕХ 120 записях корпуса через групповую
 * кросс-валидацию.
 *
 * Зачем: строка витрины для trends-fft стояла на val-сплите (20 из 20), тогда
 * как у остальных знаменатель 60/60 — строки были несравнимы. Просто пересчитать
 * доли нельзя, это подгонка; нужен честный прогон на том же корпусе.
 *
 * Дисциплина: каждая запись предсказывается моделью, которая её НЕ ВИДЕЛА, и
 * вместе с ней исключается вся её группа записи (куски одного полёта не
 * расходятся по разные стороны — та же защита, что у нейросетевой строки).
 *
 * Запуск: node scripts/lab-trends-crossval.mjs
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { detectorMetrics } from './lib/benchmark-metrics.mjs';
import { buildClassTemplate } from './lib/percentile-template.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const TM_DIST = join(ROOT, 'packages', 'services', 'detectors', 'template-match', 'dist', 'index.js');
const TRENDS_DIST = join(ROOT, 'packages', 'services', 'trends-detector', 'dist', 'index.js');
const UPSTREAM = join(ROOT, 'docs', 'datasets', 'samples', 'real-collection', 'manifest.json');
const COLLECT = { fftSize: 2048, intervalMs: 500, measurementsCount: 10 };
const FOLDS = 5;

function groupOf(id, byId) {
  const notes = byId.get(id)?.notes ?? '';
  const file = notes.match(/([^/\s]+\.wav)/)?.[1];
  if (!file) return `solo:${id}`;
  const dad = file.match(/^(.*?)_\d{3}_?\.wav$/);
  if (dad) return `rec:${dad[1]}`;
  const esc = file.match(/^(\d+-\d+)-/);
  if (esc) return `esc:${esc[1]}`;
  return `file:${file}`;
}

async function main() {
  const tm = await import(pathToFileURL(TM_DIST).href);
  const trends = await import(pathToFileURL(TRENDS_DIST).href);
  const manifest = JSON.parse(await readFile(join(DATASET, 'manifest.json'), 'utf8'));
  const upstream = JSON.parse(await readFile(UPSTREAM, 'utf8'));
  const byId = new Map((upstream.samples ?? upstream).map((s) => [s.id, s]));

  const items = manifest.samples
    .filter((s) => s.label === 'drone' || s.label === 'not-drone')
    .map((s) => ({ id: s.id, truthDrone: s.label === 'drone', path: join(DATASET, s.path), group: groupOf(s.id, byId) }));

  process.stdout.write(`Корпус: ${items.length} (дронов ${items.filter((i) => i.truthDrone).length}), траектории…`);
  for (const it of items) {
    const { samples, sampleRate } = await readWavMono(it.path);
    it.metrics = tm.collectMetricSamples(samples, sampleRate, COLLECT);
  }
  console.log(' готово');

  // Фолды нарезаются по ГРУППАМ, не по записям.
  const groups = [...new Set(items.map((i) => i.group))];
  const foldOf = new Map(groups.map((g, i) => [g, i % FOLDS]));
  console.log(`Групп записи: ${groups.length}, фолдов: ${FOLDS}\n`);

  const nonDrone = trends.SYSTEM_TEMPLATES.filter((t) => !t.key.startsWith('DRONE'));

  for (const method of ['envelope', 'percentile']) {
    /** @type {{truthDrone:boolean;predDrone:boolean;maxConfidence:number}[]} */
    const outOfFold = [];

    for (let fold = 0; fold < FOLDS; fold++) {
      const test = items.filter((i) => foldOf.get(i.group) === fold);
      const train = items.filter((i) => foldOf.get(i.group) !== fold);
      const trainDrones = train.filter((i) => i.truthDrone);
      if (trainDrones.length < 3 || test.length === 0) continue;

      const droneTemplate = {
        ...buildClassTemplate(trainDrones.map((s) => s.metrics), { key: 'DRONE', name: 'Дрон', method }),
        icon: '🛸',
        color: '#ff6b6b',
      };

      // Параметры подбираются на TRAIN этого фолда — тест не участвует.
      let best = null;
      for (const withCompetitors of [false, true]) {
        const templates = withCompetitors ? [droneTemplate, ...nonDrone] : [droneTemplate];
        for (const minC of [30, 40, 50, 60, 70]) {
          const m = detectorMetrics(
            train.map((s) => {
              const v = trends.classifyTrends(s.metrics, templates, { minConfidence: minC });
              return { truthDrone: s.truthDrone, predDrone: v.isDrone === true, maxConfidence: (v.confidence ?? 0) / 100 };
            }),
            [1],
          );
          if (!best || (m.f1 ?? 0) > best.score) best = { score: m.f1 ?? 0, templates, minC };
        }
      }

      for (const s of test) {
        const v = trends.classifyTrends(s.metrics, best.templates, { minConfidence: best.minC });
        outOfFold.push({ truthDrone: s.truthDrone, predDrone: v.isDrone === true, maxConfidence: (v.confidence ?? 0) / 100 });
      }
    }

    const m = detectorMetrics(outOfFold, [1]);
    const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
    console.log(
      `${method.padEnd(11)} | предсказано ${String(outOfFold.length).padStart(3)} | ` +
        `обнаружено ${m.tp} из ${m.tp + m.fn} | ложных ${m.fp} из ${m.fp + m.tn} | ` +
        `P_d=${pct(m.pd)} P_fa=${pct(m.pfa)} | AUC=${m.rocAuc?.toFixed(3) ?? '—'} | ` +
        `CI P_d ${pct(m.pdCI?.low)}–${pct(m.pdCI?.high)}`,
    );
  }

  // Отгружаемый DRONE_TIGHT — КОНСТАНТЫ (benchmark-fft-trends.mjs:311), от данных
  // не зависит: обучения нет, значит утечки нет, и его можно честно мерить сразу
  // на всех 120. Это строка витрины «детектор как он есть сегодня».
  const tight = {
    key: 'DRONE_TIGHT',
    name: 'Дрон (tight)',
    icon: '🛸',
    color: '#ff6b6b',
    description: 'Захардкоженный шаблон отгружаемой конфигурации',
    thresholds: {
      centroid: { min: 2900, max: 4300 },
      flux: { min: 0.03, max: 0.16 },
      rms: { min: 0.07, max: 0.28 },
      frameHitRatio: { min: 0.6, max: 1.0 },
    },
    temporalPatterns: {
      activityRatio: { min: 0.8, max: 1.0 },
      centroidStd: { min: 0, max: 400 },
      longTermStability: ['high', 'veryHigh'],
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
    },
  };

  console.log('');
  const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
  for (const [label, tpl] of [
    ['tight, без конкурентов', [tight]],
    ['tight + конкуренты', [tight, ...nonDrone]],
  ]) {
    const m = detectorMetrics(
      items.map((s) => {
        const v = trends.classifyTrends(s.metrics, tpl, { minConfidence: 50 });
        return {
          truthDrone: s.truthDrone,
          predDrone: v.isDrone === true,
          maxConfidence: (v.confidence ?? 0) / 100,
        };
      }),
      [1],
    );
    console.log(
      `${label.padEnd(24)} | обнаружено ${m.tp} из ${m.tp + m.fn} | ложных ${m.fp} из ${m.fp + m.tn} | ` +
        `P_d=${pct(m.pd)} P_fa=${pct(m.pfa)} | AUC=${m.rocAuc?.toFixed(3) ?? '—'} | ` +
        `CI P_d ${pct(m.pdCI?.low)}–${pct(m.pdCI?.high)}`,
    );
  }

  console.log('\nКаждая запись предсказана моделью, которая её не видела; вся группа записи исключалась вместе с ней.');
  console.log('Строки tight — отгружаемые константы: обучения нет, поэтому мерены сразу на всех 120.');
}

await main();
