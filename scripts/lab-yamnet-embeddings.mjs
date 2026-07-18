/**
 * ЛАБОРАТОРНЫЙ эксперимент (не часть контура, в package.json не заводится).
 *
 * Вопрос: даёт ли что-нибудь обучение поверх yamnet — или его потолок
 * структурный и данные не помогут?
 *
 * Сегодня yamnet работает zero-shot: score = максимум по восьми «дрон-похожим»
 * классам AudioSet с весами, заданными АПРИОРНО (drone-classes.ts). Класса
 * «дрон» в AudioSet нет вовсе. Свип по всем 120 порогам дал потолок
 * precision 72.5% при recall >= 90% — порогом не пробивается.
 *
 * Но модель на каждом кадре считает и ЭМБЕДДИНГ (1024) — выход `Identity_1:0`,
 * который мы просто не забираем. Проверяем: отделимы ли классы в этом
 * пространстве лучше, чем через прокси-классы.
 *
 * Метод — leave-one-out kNN по косинусу. Выбран сознательно: на 120 сэмплах
 * логистическая регрессия по 1024 признакам переобучится и соврёт в нашу
 * пользу. LOO-kNN не имеет обучаемых параметров, поэтому его цифра — честная
 * нижняя оценка того, что даёт пространство признаков.
 *
 * Запуск: node scripts/lab-yamnet-embeddings.mjs
 */
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';

import { averagePrecision, rocAuc, wilsonInterval } from './lib/benchmark-metrics.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const YAMNET_DIST = join(ROOT, 'packages', 'services', 'detectors', 'yamnet', 'dist', 'node.js');
const DATASET = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const YAMNET_RATE = 16_000;
const MIN_LEN = 15_600;

/** Линейный ресэмпл — тот же, что использует сам yamnet, паритет важнее качества. */
function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const outLength = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const step = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const lo = Math.floor(pos);
    const hi = Math.min(samples.length - 1, lo + 1);
    const frac = pos - lo;
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
  }
  return out;
}

function padTo(samples, minLen) {
  if (samples.length >= minLen) return samples;
  const out = new Float32Array(minLen);
  out.set(samples);
  return out;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

async function main() {
  await tf.setBackend('wasm');
  await tf.ready();

  const { readYamnetArtifacts } = await import(pathToFileURL(YAMNET_DIST).href);
  const artifacts = await readYamnetArtifacts();
  const weightSpecs = artifacts.modelJson.weightsManifest.flatMap((g) => g.weights);
  const totalBytes = artifacts.weightShards.reduce((n, s) => n + s.byteLength, 0);
  const weightData = new Uint8Array(totalBytes);
  let offset = 0;
  for (const shard of artifacts.weightShards) {
    weightData.set(new Uint8Array(shard), offset);
    offset += shard.byteLength;
  }
  const graph = await tf.loadGraphModel(
    tf.io.fromMemory({
      modelTopology: artifacts.modelJson.modelTopology,
      weightSpecs,
      weightData: weightData.buffer,
    }),
  );
  console.log('Модель загружена. Достаём ЭМБЕДДИНГИ (Identity_1:0), а не scores.\n');

  const items = [];
  for (const [label, dir] of [
    ['drone', join(DATASET, 'drone')],
    ['not-drone', join(DATASET, 'not-drone')],
  ]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.wav'))) {
      items.push({ id: f, label, path: join(dir, f) });
    }
  }
  console.log(`Сэмплов: ${items.length} (дронов ${items.filter((i) => i.label === 'drone').length})`);

  const vectors = [];
  for (const item of items) {
    const { samples, sampleRate } = await readWavMono(item.path);
    const wave = padTo(resampleLinear(samples, sampleRate, YAMNET_RATE), MIN_LEN);
    const input = tf.tensor1d(wave);
    try {
      const out = graph.execute(input, 'Identity_1:0');
      const t = Array.isArray(out) ? out[0] : out;
      const [frames, dim] = t.shape;
      const data = await t.data();
      // Клип-вектор = среднее по кадрам, как yamnet усредняет scores.
      const mean = new Float32Array(dim);
      for (let f = 0; f < frames; f++) {
        for (let d = 0; d < dim; d++) mean[d] += data[f * dim + d];
      }
      for (let d = 0; d < dim; d++) mean[d] /= frames;
      vectors.push({ ...item, vec: mean, truthDrone: item.label === 'drone' });
      t.dispose();
    } finally {
      input.dispose();
    }
  }
  console.log(`Эмбеддинги получены: ${vectors.length} × ${vectors[0].vec.length}\n`);

  // --- Группы записи: защита от утечки «сосед — брат по той же записи» ---
  // drone-dad-0030/0031/0032 = B_S2_D1_067-bebop_000_/_001_/_002_ — три куска
  // ОДНОЙ записи. Без группировки kNN узнаёт запись, а не класс.
  const upstream = JSON.parse(
    await (await import('node:fs/promises')).readFile(
      join(ROOT, 'docs', 'datasets', 'samples', 'real-collection', 'manifest.json'),
      'utf8',
    ),
  );
  const byId = new Map((upstream.samples ?? upstream).map((s) => [s.id, s]));
  const groupOf = (id) => {
    const notes = byId.get(id.replace(/\.wav$/, ''))?.notes ?? '';
    const file = notes.match(/([^/\s]+\.wav)/)?.[1];
    if (!file) return `solo:${id}`;
    // DAD: срезы одной записи различаются хвостом _NNN_
    const dad = file.match(/^(.*?)_\d{3}_?\.wav$/);
    if (dad) return `rec:${dad[1]}`;
    // ESC-50: fold-clipID-take-class → один исходный клип = одна группа
    const esc = file.match(/^(\d+-\d+)-/);
    if (esc) return `esc:${esc[1]}`;
    return `file:${file}`;
  };
  for (const v of vectors) v.group = groupOf(v.id);
  const groups = new Set(vectors.map((v) => v.group));
  console.log(`Групп записи: ${groups.size} на ${vectors.length} сэмплов\n`);

  console.log('--- Leave-one-out (наивный: сосед может быть братом по записи) ---');
  for (const k of [1, 3, 5, 9]) {
    const scored = vectors.map((v, i) => {
      const sims = vectors
        .map((u, j) => (i === j ? null : { sim: cosine(v.vec, u.vec), drone: u.truthDrone }))
        .filter(Boolean)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, k);
      const votes = sims.filter((s) => s.drone).length;
      return { truthDrone: v.truthDrone, maxConfidence: votes / k, predDrone: votes / k > 0.5 };
    });
    const tp = scored.filter((s) => s.truthDrone && s.predDrone).length;
    const fp = scored.filter((s) => !s.truthDrone && s.predDrone).length;
    const fn = scored.filter((s) => s.truthDrone && !s.predDrone).length;
    const tn = scored.filter((s) => !s.truthDrone && !s.predDrone).length;
    const P = tp + fp ? tp / (tp + fp) : 0;
    const R = tp / (tp + fn);
    const ci = wilsonInterval(tp, tp + fn);
    console.log(
      `kNN k=${String(k).padEnd(2)} P=${(P * 100).toFixed(1)}% R=${(R * 100).toFixed(1)}%` +
        ` [${ci ? `${(ci.low * 100).toFixed(0)}–${(ci.high * 100).toFixed(0)}%` : '—'}]` +
        ` ROC-AUC=${rocAuc(scored)?.toFixed(3)} PR-AUC=${averagePrecision(scored)?.toFixed(3)}` +
        ` (TP${tp} FP${fp} FN${fn} TN${tn})`,
    );
  }

  console.log('\n--- Leave-one-GROUP-out (честный: вся запись исключается) ---');
  for (const k of [1, 3, 5, 9]) {
    const scored = vectors.map((v) => {
      const sims = vectors
        .filter((u) => u.group !== v.group)
        .map((u) => ({ sim: cosine(v.vec, u.vec), drone: u.truthDrone }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, k);
      const votes = sims.filter((s) => s.drone).length;
      return { truthDrone: v.truthDrone, maxConfidence: votes / k, predDrone: votes / k > 0.5 };
    });
    const tp = scored.filter((s) => s.truthDrone && s.predDrone).length;
    const fp = scored.filter((s) => !s.truthDrone && s.predDrone).length;
    const fn = scored.filter((s) => s.truthDrone && !s.predDrone).length;
    const tn = scored.filter((s) => !s.truthDrone && !s.predDrone).length;
    const P = tp + fp ? tp / (tp + fp) : 0;
    const R = tp / (tp + fn);
    const ci = wilsonInterval(tp, tp + fn);
    const gate = P >= 0.85 && R >= 0.9 ? ' ✅ ГЕЙТ' : '';
    console.log(
      `kNN k=${String(k).padEnd(2)} P=${(P * 100).toFixed(1)}% R=${(R * 100).toFixed(1)}%` +
        ` [${ci ? `${(ci.low * 100).toFixed(0)}–${(ci.high * 100).toFixed(0)}%` : '—'}]` +
        ` ROC-AUC=${rocAuc(scored)?.toFixed(3)} PR-AUC=${averagePrecision(scored)?.toFixed(3)}` +
        ` (TP${tp} FP${fp} FN${fn} TN${tn})${gate}`,
    );
  }

  console.log('\nДля сравнения — zero-shot yamnet на том же корпусе:');
  console.log('           P=71.4% R=91.7% ROC-AUC=0.799 PR-AUC=0.734 (TP55 FP22 FN5 TN38)');
  graph.dispose();
}

await main();
