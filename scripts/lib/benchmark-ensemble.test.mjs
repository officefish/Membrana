/**
 * Зубы строки «ансамбль» измерителя детекторов.
 *
 * ЧТО ПРОВЕРЯЕТСЯ. Не прогон по корпусу (он читает звук и стоит минуты), а три вещи, каждая
 * из которых даёт нормально выглядящее число, если её не держать:
 *   1. ПОРЧА: подмена судьи слияния (`max`, OR, медиана, среднее без весов, среднее по
 *      молчащим) роняет строку, а не выдаёт цифру. Живой судья из dist ядра замок проходит.
 *   2. ДРЕЙФ: список `live` в измерителе равен списку `createCombinedStreamDetectors()` в
 *      клиенте, а порог — порогу моста. Оба читаются из продуктового исходника как текст:
 *      импортировать TS браузерного плагина из .mjs нечем, а копия молча разошлась бы.
 *   3. СБОРКА: строки слиты по id, а не по позиции; чужой корпус и расхождение меток — отказ.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  LIVE_ALARM_THRESHOLD,
  LIVE_ENSEMBLE_SOURCES,
  LIVE_FUSION_FIXTURE,
  assertLiveFusion,
  benchmarkEnsembles,
  ensembleConfigs,
  ensemblePredicate,
  fuseEnsembleRows,
  heldOutSelection,
  liveFusionProblem,
} from './benchmark-ensemble.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE_FUSION_DIST = join(ROOT, 'packages', 'core', 'dist', 'contracts', 'detection-fusion.js');
const LIVE_LIST_TS = join(
  ROOT,
  'apps',
  'client',
  'src',
  'plugins',
  'mic-combined-detection',
  'createCombinedStreamDetectors.ts',
);
const BRIDGE_TS = join(ROOT, 'apps', 'client', 'src', 'modules', 'device-board', 'scenarioMicJournalBridge.ts');

// --- Подмены судьи: каждая выглядит как слияние и ни одна им не является ------------------

const presentOf = (sources) => sources.filter((s) => s.present !== false);
const count = (sources) => presentOf(sources).length;
/** Максимум confidence — «сильный одиночка выстреливает». */
const maxFuse = (sources) => ({
  combinedScore: Math.max(...presentOf(sources).map((s) => s.confidence)),
  presentCount: count(sources),
});
/** Бинарный OR по вердиктам — то, от чего ND3 ушёл. */
const orFuse = (sources) => ({
  combinedScore: presentOf(sources).some((s) => s.isDrone) ? 1 : 0,
  presentCount: count(sources),
});
/** Медиана. */
const medianFuse = (sources) => {
  const c = presentOf(sources)
    .map((s) => s.confidence)
    .sort((a, b) => a - b);
  const mid = Math.floor(c.length / 2);
  return {
    combinedScore: c.length % 2 ? c[mid] : (c[mid - 1] + c[mid]) / 2,
    presentCount: count(sources),
  };
};
/** Среднее, забывшее про веса. */
const unweightedMean = (sources) => {
  const c = presentOf(sources).map((s) => s.confidence);
  return { combinedScore: c.reduce((a, b) => a + b, 0) / c.length, presentCount: count(sources) };
};
/** Среднее, считающее молчащих. */
const meanOverSilent = (sources) => {
  const total = sources.reduce((a, s) => a + (s.weight ?? 1), 0);
  return {
    combinedScore: sources.reduce((a, s) => a + (s.weight ?? 1) * s.confidence, 0) / total,
    presentCount: count(sources),
  };
};

const SUBSTITUTES = [
  ['max', maxFuse],
  ['бинарный OR', orFuse],
  ['медиана', medianFuse],
  ['среднее без весов', unweightedMean],
  ['среднее по молчащим', meanOverSilent],
];

test('порча: каждая подмена судьи не проходит замок — с именем примера', () => {
  for (const [label, fuse] of SUBSTITUTES) {
    const problem = liveFusionProblem(fuse);
    assert.ok(problem !== null, `${label} прошла замок — замок пуст`);
    assert.match(problem, /^[ABC]: /u, `${label}: причина без имени примера: ${problem}`);
  }
  assert.match(liveFusionProblem(null), /не функция/u);
  assert.match(liveFusionProblem(() => ({ combinedScore: NaN, presentCount: 1 })), /не число/u);
  assert.match(
    liveFusionProblem(() => {
      throw new Error('boom');
    }),
    /судья бросил — boom/u,
  );
});

test('порча: строка ансамбля с подменённым судьёй не собирается вовсе', () => {
  const detectors = [
    { name: 'a', family: 'dsp', perSample: [{ id: 'x', truthDrone: true, predDrone: true, maxConfidence: 1 }] },
    { name: 'b', family: 'dsp', perSample: [{ id: 'x', truthDrone: true, predDrone: false, maxConfidence: 0 }] },
  ];
  const config = { name: 'пара', sources: ['a', 'b'] };
  for (const [label, fuse] of SUBSTITUTES) {
    assert.throws(
      () => fuseEnsembleRows(config, detectors, fuse),
      /судья слияния не прошёл замок/u,
      `${label} дала строку`,
    );
    assert.throws(() => benchmarkEnsembles({ detectors, fuse, configs: [config] }), /не прошёл замок/u);
  }
});

test('фикстура замка сама различает подмены: ни один ответ подмены не совпадает с ручным', () => {
  // Если бы пример A имел одинаковый ответ у среднего и у max, замок был бы дыркой.
  for (const [label, fuse] of SUBSTITUTES) {
    const caught = LIVE_FUSION_FIXTURE.some(
      (f) => Math.abs(fuse(f.sources.map((s) => ({ ...s }))).combinedScore - f.combinedScore) >= 1e-9,
    );
    assert.ok(caught, `${label} неотличима от живого правила на всех трёх примерах`);
  }
});

// Живой судья: dist ядра есть локально после `yarn detectors:build` и в прогоне бенчмарка
// (там замок стоит на каждом запуске). В CI test:scripts идёт до сборки, dist нет — эта
// половина зуба тогда пропускается ВСЛУХ, порча выше гоняется всегда.
test('живой fuseDetectorConfidences из dist ядра замок проходит', { skip: existsSync(CORE_FUSION_DIST) ? false : `нет ${CORE_FUSION_DIST} — соберите: yarn detectors:build` }, async () => {
  const { fuseDetectorConfidences } = await import(pathToFileURL(CORE_FUSION_DIST).href);
  assert.equal(liveFusionProblem(fuseDetectorConfidences), null);
  assert.doesNotThrow(() => assertLiveFusion(fuseDetectorConfidences));

  // Ровно тот сценарий шкалы, что на корпусе: cepstral 1, harmonic 0, flux 0, yamnet 0.04.
  const detectors = [
    { name: 'harmonic', family: 'dsp', perSample: [{ id: 'x', truthDrone: true, predDrone: false, maxConfidence: 0 }] },
    { name: 'cepstral', family: 'dsp', perSample: [{ id: 'x', truthDrone: true, predDrone: true, maxConfidence: 1 }] },
    { name: 'spectral-flux', family: 'dsp', perSample: [{ id: 'x', truthDrone: true, predDrone: false, maxConfidence: 0 }] },
    { name: 'yamnet', family: 'neural', perSample: [{ id: 'x', truthDrone: true, predDrone: true, maxConfidence: 0.04 }] },
  ];
  const [row] = fuseEnsembleRows({ name: 'live', sources: LIVE_ENSEMBLE_SOURCES }, detectors, fuseDetectorConfidences);
  assert.ok(Math.abs(row.maxConfidence - 1.04 / 4) < 1e-9);
  assert.equal(row.predDrone, false, '0.26 < порог 0.5');
});

// --- Дрейф относительно продуктового кода -----------------------------------------------

test('список live равен createCombinedStreamDetectors() клиента (по исходнику)', () => {
  const src = readFileSync(LIVE_LIST_TS, 'utf8');
  const body = src.slice(src.indexOf('export function createCombinedStreamDetectors'));
  assert.ok(body.length > 0, 'функция не найдена — исходник переехал, зуб надо перенацелить');
  const NAMES = {
    createHarmonicDetector: 'harmonic',
    createCepstralDetector: 'cepstral',
    createSpectralFluxDetector: 'spectral-flux',
    createYamnetDetector: 'yamnet',
  };
  const calls = [...body.matchAll(/\b(create[A-Z][A-Za-z]*Detector)\s*\(/gu)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'в теле функции нет ни одного create*Detector(');
  const unknown = calls.filter((c) => !(c in NAMES));
  assert.deepEqual(unknown, [], `в живом списке появился источник без имени в измерителе: ${unknown}`);
  assert.deepEqual(
    [...new Set(calls.map((c) => NAMES[c]))].sort(),
    [...LIVE_ENSEMBLE_SOURCES].sort(),
    'состав live в измерителе разошёлся с клиентом',
  );
});

test('порог вердикта равен порогу моста device-board (по исходнику)', () => {
  const src = readFileSync(BRIDGE_TS, 'utf8');
  const m = src.match(/result\.combinedScore >= ([0-9.]+)/u);
  assert.ok(m, 'в мосте нет `result.combinedScore >= N` — порог переехал, зуб надо перенацелить');
  assert.equal(Number(m[1]), LIVE_ALARM_THRESHOLD);
});

// --- Сборка строк -----------------------------------------------------------------------

/** Судья-заглушка, проходящий замок ТОЛЬКО потому, что возвращает ответы фикстуры по входу. */
const fixtureFuse = (sources) => {
  const key = JSON.stringify(sources.map((s) => [s.confidence, s.weight ?? 1, s.present !== false]));
  const hit = LIVE_FUSION_FIXTURE.find(
    (f) => JSON.stringify(f.sources.map((s) => [s.confidence, s.weight ?? 1, s.present !== false])) === key,
  );
  if (hit) return { combinedScore: hit.combinedScore, presentCount: hit.presentCount };
  // Вне фикстуры — сумма confidence: заглушке важно лишь, ЧТО ей передали.
  return { combinedScore: sources.reduce((a, s) => a + s.confidence, 0), presentCount: sources.length };
};

test('строки слиты по id, а не по позиции', () => {
  const detectors = [
    {
      name: 'a',
      family: 'dsp',
      perSample: [
        { id: 'p', truthDrone: true, predDrone: true, maxConfidence: 0.1 },
        { id: 'q', truthDrone: false, predDrone: false, maxConfidence: 0.2 },
      ],
    },
    {
      name: 'b',
      family: 'neural',
      perSample: [
        { id: 'q', truthDrone: false, predDrone: false, maxConfidence: 0.02 },
        { id: 'p', truthDrone: true, predDrone: true, maxConfidence: 0.01 },
      ],
    },
  ];
  const rows = fuseEnsembleRows({ name: 'ab', sources: ['a', 'b'] }, detectors, fixtureFuse, 0.15);
  assert.deepEqual(
    rows.map((r) => [r.id, r.truthDrone, Number(r.maxConfidence.toFixed(3)), r.predDrone]),
    [
      ['p', true, 0.11, false],
      ['q', false, 0.22, true],
    ],
  );
});

test('неизмеренный источник, чужой корпус и расхождение меток — отказ, не пропуск', () => {
  const a = { name: 'a', family: 'dsp', perSample: [{ id: 'p', truthDrone: true, predDrone: true, maxConfidence: 1 }] };
  assert.throws(
    () => fuseEnsembleRows({ name: 'x', sources: ['a', 'нет'] }, [a], fixtureFuse),
    /источник «нет» не измерен/u,
  );
  assert.throws(
    () => fuseEnsembleRows({ name: 'x', sources: ['a', 'scaffold'] }, [a, { name: 'scaffold', family: 'neural', perSample: null }], fixtureFuse),
    /не измерен/u,
  );
  const bigger = {
    name: 'b',
    family: 'dsp',
    perSample: [
      { id: 'p', truthDrone: true, predDrone: true, maxConfidence: 1 },
      { id: 'r', truthDrone: true, predDrone: true, maxConfidence: 1 },
    ],
  };
  assert.throws(() => fuseEnsembleRows({ name: 'x', sources: ['a', 'b'] }, [a, bigger], fixtureFuse), /корпус не совпадает/u);
  const other = { name: 'b', family: 'dsp', perSample: [{ id: 'z', truthDrone: true, predDrone: true, maxConfidence: 1 }] };
  assert.throws(() => fuseEnsembleRows({ name: 'x', sources: ['a', 'b'] }, [a, other], fixtureFuse), /нет записи p/u);
  const flipped = { name: 'b', family: 'dsp', perSample: [{ id: 'p', truthDrone: false, predDrone: true, maxConfidence: 1 }] };
  assert.throws(() => fuseEnsembleRows({ name: 'x', sources: ['a', 'b'] }, [a, flipped], fixtureFuse), /метка записи p расходится/u);
  assert.throws(() => fuseEnsembleRows({ name: 'x', sources: [] }, [a], fixtureFuse), /список источников пуст/u);
});

test('семь конфигураций прогона: live, solo, yamnet+template, четыре leave-one-out', () => {
  const configs = ensembleConfigs();
  assert.deepEqual(
    configs.map((c) => c.name),
    [
      'live',
      'yamnet solo',
      'yamnet + template-match',
      'live − harmonic',
      'live − cepstral',
      'live − spectral-flux',
      'live − yamnet',
    ],
  );
  assert.deepEqual(configs[0].sources, ['harmonic', 'cepstral', 'spectral-flux', 'yamnet']);
  assert.deepEqual(configs[6].sources, ['harmonic', 'cepstral', 'spectral-flux']);
  for (const c of configs) assert.equal(c.weights, undefined, 'веса — как в живом коде, 1');
});

test('отложенная часть — только split: val; без неё null, а не весь корпус', () => {
  const sel = heldOutSelection([
    { id: 'a', split: 'train' },
    { id: 'b', split: 'val' },
    { id: 'c', split: 'val' },
    { id: 'd' },
  ]);
  assert.deepEqual([...sel.ids].sort(), ['b', 'c']);
  assert.equal(sel.sampleCount, 2);
  assert.equal(sel.label, 'val');
  assert.equal(heldOutSelection([{ id: 'a', split: 'train' }, { id: 'd' }]), null);
});

test('benchmarkEnsembles: метрики на всём корпусе и на отложенной части, предикат считается кодом', () => {
  // Два источника, четыре записи: «сильный» ранжирует верно, «слабый» — наоборот.
  const strong = [
    { id: 'd1', truthDrone: true, predDrone: true, maxConfidence: 0.9 },
    { id: 'd2', truthDrone: true, predDrone: true, maxConfidence: 0.8 },
    { id: 'n1', truthDrone: false, predDrone: false, maxConfidence: 0.2 },
    { id: 'n2', truthDrone: false, predDrone: false, maxConfidence: 0.1 },
  ];
  const weak = strong.map((r) => ({ ...r, maxConfidence: 1 - r.maxConfidence, predDrone: !r.predDrone }));
  const detectors = [
    { name: 'yamnet', family: 'neural', perSample: strong },
    { name: 'w', family: 'dsp', perSample: weak },
  ];
  const heldOut = { label: 'val', ids: new Set(['d2', 'n2']), sampleCount: 2 };
  const configs = [
    { name: 'live', sources: ['yamnet', 'w'] },
    { name: 'yamnet solo', sources: ['yamnet'] },
  ];
  const out = benchmarkEnsembles({ detectors, fuse: fixtureFuse, heldOut, configs });
  assert.equal(out.length, 2);
  assert.equal(out[0].status, 'fused');
  assert.deepEqual(out[0].weights, { yamnet: 1, w: 1 });
  assert.equal(out[0].threshold, LIVE_ALARM_THRESHOLD);
  // Сумма strong + weak = 1 на каждой записи → все баллы равны → AUC 0.5.
  assert.equal(out[0].metrics.rocAuc, 0.5);
  assert.equal(out[1].metrics.rocAuc, 1);
  assert.equal(out[0].heldOut.sampleCount, 2);
  assert.equal(out[1].heldOut.metrics.rocAuc, 1);
  assert.equal(out[0].metrics.latencyP50Ms, null, 'задержек у пост-фактум слияния нет');

  const p = ensemblePredicate(out);
  assert.equal(p.all.liveBeatsSolo, false);
  assert.equal(p.heldOut.liveBeatsSolo, false);
  assert.equal(p.all.live, 0.5);
  assert.equal(p.all.yamnetSolo, 1);
  assert.throws(() => ensemblePredicate([out[0]]), /нет строк live и yamnet solo/u);
});

test('авто-блок MD: блок ансамбля с двумя охватами и строкой предиката', async () => {
  const { patchDetectorBenchmarkMd } = await import('./benchmark-report-md.mjs');
  const metrics = (auc) => ({
    tp: 1, fp: 1, fn: 1, tn: 1, precision: 0.5, recall: 0.5, f1: 0.5, pd: 0.5, pfa: 0.5,
    pdCI: null, pfaCI: null, rocAuc: auc, prAuc: 0.5, positiveShare: 0.5, precisionByPrior: null,
    latencyP50Ms: null, latencyP95Ms: null,
  });
  const ens = (name, sources, auc, heldAuc) => ({
    name, sources, weights: {}, threshold: 0.5, status: 'fused', metrics: metrics(auc),
    heldOut: { label: 'val', sampleCount: 4, metrics: metrics(heldAuc) }, perSample: [],
  });
  const report = {
    generatedAt: 'T', datasetVersion: 'v2', sampleCount: 8, splitFallback: true, config: null,
    detectors: [{ name: 'yamnet', family: 'neural', status: 'benchmarked', metrics: null }],
    ensembles: [ens('live', ['a', 'yamnet'], 0.4, 0.45), ens('yamnet solo', ['yamnet'], 0.8, 0.7)],
    ensemblePredicate: {
      rule: 'r', all: { live: 0.4, yamnetSolo: 0.8, liveBeatsSolo: false },
      heldOut: { live: 0.45, yamnetSolo: 0.7, liveBeatsSolo: false },
    },
  };
  const md = patchDetectorBenchmarkMd('x\n<!-- BENCHMARK:auto:start -->\nold\n<!-- BENCHMARK:auto:end -->\ny', report);
  assert.match(md, /### Ансамбль — слияние пост-фактум/u);
  assert.match(md, /#### Весь тот же корпус, что у одиночных строк \(8 файлов\)/u);
  assert.match(md, /#### Отложенная часть — split: val \(4 файлов\)/u);
  assert.match(md, /\| live \| a \+ yamnet \| 0\.400 \|/u);
  assert.match(md, /\| yamnet solo \| yamnet \| 0\.700 \|/u);
  assert.match(md, /Весь корпус: live 0\.400 vs yamnet solo 0\.800 → \*\*live НЕ бьёт solo\*\*/u);
  assert.doesNotMatch(md, /old/u);
  assert.ok(md.startsWith('x\n') && md.endsWith('\ny'));
});
