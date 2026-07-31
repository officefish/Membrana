#!/usr/bin/env node
/**
 * yarn calibrate:mfcc — ПЕРВАЯ ПРИКИДКА ворот тембрового детектора по аналогии с пороговым
 * детектором на быстром преобразовании (`scripts/calibrate-detectors.mjs`).
 *
 * Слово владельца 31.07 (шторм `storm-mfcc-mic-plugins-2026-07-31`, хвост Х5):
 *   «На этом тарифе будет датасет из 600 звуков, калибровка текущей версии детектора пока не
 *    окончательная. Нужна сама возможность калибровки по аналогии и первая прикидка возможных
 *    ворот. Этого будет достаточно.»
 *
 * ЧТО СЧИТАЕТ. Для каждого кепстрального коэффициента — коридор [min, max] по классу «дрон»,
 * взятый ПЕРЦЕНТИЛЯМИ, а не крайними значениями: один выброс раздвинул бы ворота до
 * бессмысленных. Затем меряет, как часто в этот коридор попадает фон — это и есть
 * разделяющая сила коэффициента, а не красота числа.
 *
 * ЧЕГО НЕ ДЕЛАЕТ И ПОЧЕМУ.
 *  · Не назначает окончательных ворот: корпус 120 записей, цель и фон из РАЗНЫХ чужих
 *    датасетов (тракт склеен с меткой) — вердикт первого боевого прогона `undecided_corpus_bias`
 *    этой работой НЕ снимается.
 *  · Не калибрует три уровня строгости владельца (строгий — дрон · средний — модели+ветер ·
 *    мягкий — цель под моторами и стрельбой): в корпусе НЕТ СМЕСЕЙ, цель и помеха лежат в
 *    разных папках. О среднем и мягком корпус не свидетельствует.
 *  · Не выбирает числа настроек за исполнителя: сетка задаётся здесь явно и печатается.
 *
 * Usage: node scripts/calibrate-mfcc-gates.mjs [--top N] [--out <path>]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coefficientGate, frames } from './lib/mfcc-gates.mjs';
import { readWavMono } from './lib/wav-read.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_DIR = join(ROOT, 'data', 'detectors-benchmark', 'v0.2');
const MANIFEST_PATH = join(DATASET_DIR, 'manifest.json');
const DEFAULT_OUT = join(DATASET_DIR, 'reports', 'mfcc-gates-first-cut.json');

/**
 * Сетка настроек. Умолчаний ядро не назначает намеренно (см. `MfccConfig`): речевые 26/13/25мс
 * для дрона компактны. Здесь берём три точки сетки, названной в контракте ядра —
 * 16–40 фильтров / 13–30 коэффициентов / кадр 25–100 мс при 48 кГц.
 */
const CONFIGS = [
  { melBands: 26, numberOfCoefficients: 13, bufferSize: 2048 }, // ~43 мс
  { melBands: 32, numberOfCoefficients: 20, bufferSize: 2048 },
  { melBands: 40, numberOfCoefficients: 24, bufferSize: 4096 }, // ~85 мс
];

/** Перцентили ворот: 5-й и 95-й — хвосты отрезаны, коридор не раздувается выбросом. */
const GATE_LO_PCT = 5;
const GATE_HI_PCT = 95;

const argv = process.argv.slice(2);
const argOf = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};

const topSeparation = (cfg) => Math.max(...cfg.coefficients.map((x) => x.separation ?? -1));

async function main() {
  const Meyda = (await import('meyda')).default;
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const samples = manifest.samples ?? manifest;

  console.log(`корпус: ${samples.length} записей · ${MANIFEST_PATH.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
  const byLabel = samples.reduce((a, s) => ((a[s.label] = (a[s.label] ?? 0) + 1), a), {});
  console.log(`классы: ${Object.entries(byLabel).map(([k, v]) => `${k}=${v}`).join(' · ')}`);

  const report = { generatedAt: null, corpus: { path: 'data/detectors-benchmark/v0.2', counts: byLabel }, configs: [] };

  for (const config of CONFIGS) {
    const tag = `mel${config.melBands}-c${config.numberOfCoefficients}-buf${config.bufferSize}`;
    /** @type {number[][]} по коэффициенту → значения кадров */
    const drone = Array.from({ length: config.numberOfCoefficients }, () => []);
    const other = Array.from({ length: config.numberOfCoefficients }, () => []);
    let framesDrone = 0;
    let framesOther = 0;
    let skipped = 0;

    // НАСТРОЙКИ ЗАДАЮТСЯ СВОЙСТВАМИ ОБЪЕКТА, А НЕ АРГУМЕНТОМ ВЫЗОВА.
    //
    // Контракт ядра (`MfccConfig`) утверждал обратное: «melBands, numberOfMFCCCoefficients,
    // bufferSize задаются вызовом, а не пересборкой — проверено на пакете, установленном ВНЕ
    // этого дерева». Автор блока честно пометил, что проверка шла снаружи. Пакет установлен
    // 31.07 здесь, предикат воспроизведён — и НЕ выполняется: `Meyda.extract('mfcc', buf,
    // {melBands: 26|40, …})` даёт побайтово одинаковый выход, то есть параметр молча
    // игнорируется. Через свойства объекта 26 и 40 фильтров дают 91.807 и 111.908.
    //
    // Первый прогон калибратора это и показал: две точки сетки вернули идентичные ворота.
    // Ложная зелёнка того же класса, что ловили весь день: число есть, а различия нет.
    Meyda.sampleRate = 48_000;
    Meyda.bufferSize = config.bufferSize;
    Meyda.melBands = config.melBands;
    Meyda.numberOfMFCCCoefficients = config.numberOfCoefficients;

    for (const s of samples) {
      let wav;
      try {
        wav = await readWavMono(join(DATASET_DIR, s.path));
      } catch {
        skipped += 1;
        continue;
      }
      const sink = s.label === 'drone' ? drone : other;
      for (const frame of frames(wav.samples, config.bufferSize)) {
        let vec;
        try {
          vec = Meyda.extract('mfcc', frame);
        } catch {
          continue;
        }
        if (!Array.isArray(vec)) continue;
        for (let c = 0; c < config.numberOfCoefficients && c < vec.length; c += 1) {
          if (Number.isFinite(vec[c])) sink[c].push(vec[c]);
        }
        if (s.label === 'drone') framesDrone += 1;
        else framesOther += 1;
      }
    }

    // Ворота — по классу «дрон». Разделяющая сила — доля кадров ФОНА, попавших внутрь ворот:
    // чем она ниже, тем коэффициент полезнее. Это и есть ответ на «какие брать».
    const coefficients = [];
    for (let c = 0; c < config.numberOfCoefficients; c += 1) {
      const g = coefficientGate(drone[c], other[c], { lo: GATE_LO_PCT, hi: GATE_HI_PCT });
      if (g.gate === null) continue;
      const r3 = (v) => (v === null ? null : Number(v.toFixed(3)));
      coefficients.push({
        index: c,
        gate: { lo: r3(g.gate.lo), hi: r3(g.gate.hi) },
        droneInside: r3(g.droneInside),
        // `null`, а не ноль: «фон не попадает ни разу» и «фона не было» — разные вещи,
        // и слить их значит соврать в пользу коэффициента. Причина печатается в `why`.
        otherInside: r3(g.otherInside),
        separation: r3(g.separation),
        why: g.why,
      });
    }

    const ranked = [...coefficients].filter((x) => x.separation !== null).sort((a, b) => b.separation - a.separation);
    report.configs.push({ tag, config, framesDrone, framesOther, skipped, coefficients, ranked: ranked.map((x) => x.index) });

    console.log(`\n=== ${tag} · кадров: дрон ${framesDrone} · фон ${framesOther}${skipped ? ` · пропущено файлов ${skipped}` : ''}`);
    const top = ranked.slice(0, Number(argOf('top', '6')));
    console.log('  лучшие по разделению (коэф · ворота · фона внутри · разделение):');
    for (const x of top) {
      console.log(`    c${String(x.index).padStart(2)} · [${x.gate.lo}, ${x.gate.hi}] · фон ${(x.otherInside * 100).toFixed(0)}% · разделение ${x.separation}`);
    }
  }

  // ПРЕСЕТ ДЕТЕКТОРА. Новой математики не нужно: коридорный детектор уже несёт
  // judgedCoefficients — «закрытый явный список вместо флага исключить C0». Кладём туда
  // отобранные коэффициенты, и minInBandRatio снова становится ЗАКРЫТЫМ СЧЁТОМ: при
  // четырёх судимых 0.25/0.5/0.75 читаются как «один из четырёх / два / три». Прежний
  // смысл трёх уровней строгости (Т2 шторма) возвращается без правки детектора.
  const best = report.configs.reduce((a, b) => (topSeparation(b) > topSeparation(a) ? b : a));
  const picked = best.coefficients
    .filter((x) => x.separation !== null)
    .sort((a, b) => b.separation - a.separation)
    .slice(0, Number(argOf('pick', '4')))
    .sort((a, b) => a.index - b.index);
  const n = picked.length;
  report.preset = {
    // Отпечаток настроек: коридор, снятый при 26 фильтрах, ничего не говорит о векторе
    // при 40 — детектор отвергает корпус с чужим отпечатком, и это его право.
    configHash: `mel${best.config.melBands}-c${best.config.numberOfCoefficients}-buf${best.config.bufferSize}`,
    judgedCoefficients: picked.map((x) => x.index),
    // Коридор НА КАЖДЫЙ коэффициент, длиной во весь вектор — так требует контракт трубы
    // (`boundsProblem` сверяет длину с `coefficientCount`). Отбор делает
    // `judgedCoefficients`, а НЕ усечение коридоров: усечённый список сместил бы номера,
    // и коридор c7 применился бы к c3. Поймано чтением контракта до прогона.
    bounds: best.coefficients.map((x) => ({ min: x.gate.lo, max: x.gate.hi })),
    // Три уровня строгости. Знаменатель равен числу СУДИМЫХ коэффициентов, поэтому доля
    // читается закрытым счётом — ровно как «сколько метрик из трёх» у порогового детектора.
    // Серийный этаж (minPassRate 0.3/0.6/0.9) перенесён без правок: он не зависит от числа
    // параметров (Т2 шторма).
    strictness: {
      easy: { minInBandRatio: Number((1 / n).toFixed(4)), minPassRate: 0.3, means: `1 из ${n} коэффициентов в воротах` },
      normal: { minInBandRatio: Number((Math.ceil(n / 2) / n).toFixed(4)), minPassRate: 0.6, means: `${Math.ceil(n / 2)} из ${n}` },
      strict: { minInBandRatio: 1, minPassRate: 0.9, means: `все ${n}` },
    },
    // Обстановки владельца (Т5) НЕ откалиброваны: строгий — дрон, средний — модели+ветер,
    // мягкий — цель под моторами и стрельбой. В корпусе нет смесей, и эти имена пока
    // держатся на аналогии с прежним детектором, а не на измерении.
    situationsCalibrated: false,
    // Труба требует конечное ≥ 0 и трактует 0 как ВЫКЛЮЧЕННУЮ защиту от немого кадра.
    // Ставим 0 сознательно: калибровкой порог не определяется — он снимается на тишине
    // СВОЕГО тракта, а корпус её не содержит. Это не «защита не нужна», это «защиты нет».
    minMagnitude: 0,
    minMagnitudeWhy:
      'ЗАЩИТА ВЫКЛЮЧЕНА (0). Порог немого кадра калибровкой НЕ определяется: снимается на тишине своего тракта, которой в корпусе нет. Кадр из одних нулей попадёт в любой коридор, включающий ноль, и труба даст зелёный на тишине. Перед любым живым прогоном значение обязано быть выбрано; до тех пор единственный признак — silentCount в отчёте, и он будет нулевым.',
  };

  const out = argOf('out', DEFAULT_OUT);
  await mkdir(dirname(out), { recursive: true });
  report.generatedAt = new Date().toISOString();
  report.disclaimer = [
    'ПЕРВАЯ ПРИКИДКА, не окончательные ворота (слово владельца 31.07).',
    'Корпус 120 записей; цель и фон из РАЗНЫХ чужих датасетов — тракт склеен с меткой класса.',
    'undecided_corpus_bias первого боевого прогона этой работой НЕ снимается.',
    'Три уровня строгости владельца НЕ откалиброваны: в корпусе нет смесей цели с помехой.',
  ];
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nотчёт: ${out.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
}

main().catch((e) => {
  console.error(`calibrate:mfcc — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
