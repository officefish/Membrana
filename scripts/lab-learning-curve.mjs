/**
 * ЛАБОРАТОРНЫЙ СТЕНД: кривая «прогресс от объёма» для ОБОИХ детекторов.
 *
 * Вопрос владельца: даст ли объём звуков лучшую детекцию — и трендс-детектору
 * (примитивный спектральный анализ, три метрики), и yamnet (нейро).
 *
 * Дисциплина, без которой кривая фальшивая:
 *   1. ТЕСТ НЕПОДВИЖЕН. Один и тот же на всех точках лестницы, отобран по
 *      ГРУППАМ записи (куски одного полёта не попадают по разные стороны).
 *   2. ПАРАМЕТРЫ КРУТЯТСЯ ТОЛЬКО НА TRAIN. Подбор порога и способа сборки
 *      шаблонов — это и есть «обучение» трендс-детектора; тест в подборе не
 *      участвует. Иначе растёт подгонка, а не детектор.
 *   3. Растёт ТОЛЬКО обучающая часть.
 *
 * Запуск: node scripts/lab-learning-curve.mjs [--ladder 30,60,90]
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { detectorMetrics } from './lib/benchmark-metrics.mjs';
import { buildLadderReport, canonicalJson, ladderStep } from './lib/ladder-report.mjs';
import { buildClassTemplate, templateWidth } from './lib/percentile-template.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const TM_DIST = join(ROOT, 'packages', 'services', 'detectors', 'template-match', 'dist', 'index.js');
const TRENDS_DIST = join(ROOT, 'packages', 'services', 'trends-detector', 'dist', 'index.js');
const UPSTREAM = join(ROOT, 'docs', 'datasets', 'samples', 'real-collection', 'manifest.json');
const COLLECT_OPTS = { fftSize: 2048, intervalMs: 500, measurementsCount: 10 };

const ladderArg = process.argv.indexOf('--ladder');
const LADDER = ladderArg > -1 ? process.argv[ladderArg + 1].split(',').map(Number) : [20, 40, 60, 80];

/** Группа записи: куски одного полёта обязаны ехать вместе. */
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

/** Детерминированный отбор: воспроизводимость важнее случайности. */
function seededShuffle(arr, seed = 7) {
  let s = seed;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  const tm = await import(pathToFileURL(TM_DIST).href);
  const trends = await import(pathToFileURL(TRENDS_DIST).href);
  const upstream = JSON.parse(await readFile(UPSTREAM, 'utf8'));
  const byId = new Map((upstream.samples ?? upstream).map((s) => [s.id, s]));

  // --- Корпус + траектории метрик (считаются один раз) ---
  const items = [];
  for (const [label, dir] of [
    ['drone', join(DATASET, 'drone')],
    ['not-drone', join(DATASET, 'not-drone')],
  ]) {
    for (const f of (await readdir(dir)).filter((x) => x.endsWith('.wav'))) {
      const id = f.replace(/\.wav$/, '');
      items.push({ id, label, truthDrone: label === 'drone', path: join(dir, f), group: groupOf(id, byId) });
    }
  }
  process.stdout.write(`Корпус: ${items.length} (дронов ${items.filter((i) => i.truthDrone).length}), считаю траектории…`);
  for (const it of items) {
    const { samples, sampleRate } = await readWavMono(it.path);
    it.metrics = tm.collectMetricSamples(samples, sampleRate, COLLECT_OPTS);
  }
  console.log(' готово');

  // --- Неподвижный тест: отбираем ГРУППАМИ, ~35% корпуса ---
  const groups = seededShuffle([...new Set(items.map((i) => i.group))]);
  const testGroups = new Set();
  let testCount = 0;
  for (const g of groups) {
    if (testCount >= items.length * 0.35) break;
    testGroups.add(g);
    testCount += items.filter((i) => i.group === g).length;
  }
  const test = items.filter((i) => testGroups.has(i.group));
  const pool = items.filter((i) => !testGroups.has(i.group));
  console.log(
    `Тест НЕПОДВИЖЕН: ${test.length} сэмплов (дронов ${test.filter((i) => i.truthDrone).length}), ` +
      `${testGroups.size} групп. Обучающий пул: ${pool.length}.\n`,
  );

  const nonDroneSystem = trends.SYSTEM_TEMPLATES.filter((t) => !t.key.startsWith('DRONE'));

  /** Вердикт трендс-детектора по набору шаблонов и порогу. */
  const evalTrends = (templates, minConfidence, sampleSet) =>
    detectorMetrics(
      sampleSet.map((s) => {
        const v = trends.classifyTrends(s.metrics, templates, { minConfidence });
        return { truthDrone: s.truthDrone, predDrone: v.isDrone === true, maxConfidence: (v.confidence ?? 0) / 100 };
      }),
      [1],
    );

  console.log('N_train | метод сборки | ширина | параметры (подобраны на TRAIN) | ТЕСТ: P / R / ROC-AUC');
  console.log('--------|--------------|--------|--------------------------------|----------------------');

  const poolShuffled = seededShuffle(pool, 11);
  const poolDrones = poolShuffled.filter((s) => s.truthDrone).length;
  /** @type {object[]} */
  const reportSteps = [];

  // Ступень считается в записях МЕНЬШЕГО класса — дронов (решение резчика 06.08).
  // Прежний счёт по СУММЕ классов молча смещал состав обучающей части: при 63 дронах
  // ступень «80» недостижима, и лестница показывала бы рост объёма вместо роста дронов.
  for (const n of [...LADDER, poolDrones]) {
    if (n > poolDrones) continue;
    // Берём подряд из перемешанного пула, пока не наберём n дронов: чистые едут с ними,
    // их фактическое число попадёт в отчёт как nTrainTotal — асимметрия видна, не спрятана.
    const train = [];
    let got = 0;
    for (const s of poolShuffled) {
      train.push(s);
      if (s.truthDrone) got += 1;
      if (got >= n) break;
    }
    const trainDrones = train.filter((s) => s.truthDrone);
    if (trainDrones.length < 3) continue;

    for (const method of ['envelope', 'percentile']) {
      const droneTemplate = {
        ...buildClassTemplate(trainDrones.map((s) => s.metrics), { key: 'DRONE', name: 'Дрон', method }),
        icon: '🛸',
        color: '#ff6b6b',
      };

      // --- Подкрутка ПАРАМЕТРОВ на train: порог × наличие конкурентов ---
      let best = null;
      for (const withCompetitors of [false, true]) {
        const templates = withCompetitors ? [droneTemplate, ...nonDroneSystem] : [droneTemplate];
        for (const minC of [30, 40, 50, 60, 70]) {
          const m = evalTrends(templates, minC, train);
          const score = m.f1 ?? 0;
          if (!best || score > best.score) best = { score, templates, minC, withCompetitors };
        }
      }

      const t = evalTrends(best.templates, best.minC, test);
      // Ступень едет в версионируемый отчёт — печать доказательством не является (Ф2).
      reportSteps.push(
        ladderStep({
          nTrainDrones: trainDrones.length,
          nTrainTotal: train.length,
          method,
          params: { minConfidence: best.minC, withCompetitors: best.withCompetitors },
          metrics: t,
        }),
      );
      const pctFmt = (v) => (v == null ? '  —  ' : `${(v * 100).toFixed(1)}%`);
      console.log(
        `${String(n).padStart(7)} | ${method.padEnd(12)} | ${String(templateWidth(droneTemplate)?.toFixed(0) ?? '—').padStart(6)} ` +
          `| minC=${String(best.minC).padEnd(3)} конкуренты=${best.withCompetitors ? 'да ' : 'нет'}        ` +
          `| ${pctFmt(t.precision)} / ${pctFmt(t.recall)} / ${t.rocAuc?.toFixed(3) ?? '—'}`,
      );
    }
  }

  console.log(
    '\nТест один и тот же во всех строках. Параметры (порог, набор шаблонов) подобраны\n' +
      'ТОЛЬКО на обучающей части шага — тест в подборе не участвовал.',
  );

  // --- Отчёт в репозиторий: витрина читает JSON, а не консоль (Ф2, блок g1) ---
  const report = buildLadderReport({
    generatedAt: new Date().toISOString(),
    corpus: {
      path: 'data/detectors-benchmark/v0.2',
      droneCount: items.filter((i) => i.truthDrone).length,
      cleanCount: items.filter((i) => !i.truthDrone).length,
      manifestSha256: createHash('sha256').update(canonicalJson(upstream)).digest('hex'),
    },
    test: {
      size: test.length,
      drones: test.filter((i) => i.truthDrone).length,
      groups: testGroups.size,
    },
    steps: reportSteps,
  });
  const outPath = join(DATASET, 'reports', 'spectral-ladder.json');
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nОтчёт лестницы: ${outPath} (ступеней ${reportSteps.length})`);
}

await main();
