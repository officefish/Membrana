/**
 * Fetches a balanced real-audio collection (default 120 × 5 s) for sample-library import.
 *
 * Drone:  mackenzie-jane/drone-visualization (32 models) + DroneAudioDataset top-up
 * Not-drone: ESC-50 negatives from DroneAudioDataset `unknown` folders (WAV)
 *
 * Usage:
 *   yarn dataset:fetch-real
 *   yarn dataset:fetch-real -- --target 100
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  decodeWavPcm16Mono,
  downloadFile,
  encodeWavPcm16,
  fitDuration,
  listDroneDatasetWavs,
  measureActiveRatio,
  normalize,
  resampleLinear,
  slugify,
  trimSilenceEdges,
} from './lib/dataset-audio.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'datasets', 'samples', 'real-collection');
const CACHE_DIR = join(ROOT, 'docs', 'datasets', 'samples', '.cache');
const TARGET_DURATION_SEC = 5;
const OUTPUT_SAMPLE_RATE = 48_000;

const MACKENZIE_DRONES_JSON =
  'https://raw.githubusercontent.com/mackenzie-jane/drone-visualization/main/src/data/drones.json';
const MACKENZIE_AUDIO_BASE =
  'https://raw.githubusercontent.com/mackenzie-jane/drone-visualization/main/public';
const DRONE_AUDIO_DATASET_RAW =
  'https://raw.githubusercontent.com/saraalemadi/DroneAudioDataset/master';
const ESC50_CSV =
  'https://raw.githubusercontent.com/karoldvl/ESC-50/master/meta/esc50.csv';
const ESC50_AUDIO_BASE =
  'https://raw.githubusercontent.com/karoldvl/ESC-50/master/audio';

/** Minimum active ratio for seamless-loop clips (drone top-up). */
const MIN_ACTIVE_RATIO_LOOP = 0.82;

/** @type {{ esc50: string; membranaClass: string; label: 'not-drone'; quota: number }[]} */
const NOT_DRONE_QUOTAS = [
  { esc50: 'chirping_birds', membranaClass: 'bird', label: 'not-drone', quota: 4 },
  { esc50: 'crow', membranaClass: 'bird', label: 'not-drone', quota: 3 },
  { esc50: 'hen', membranaClass: 'bird', label: 'not-drone', quota: 3 },
  { esc50: 'insects', membranaClass: 'bird', label: 'not-drone', quota: 2 },
  { esc50: 'wind', membranaClass: 'wind', label: 'not-drone', quota: 8 },
  { esc50: 'rain', membranaClass: 'wind', label: 'not-drone', quota: 4 },
  { esc50: 'thunderstorm', membranaClass: 'wind', label: 'not-drone', quota: 3 },
  { esc50: 'sea_waves', membranaClass: 'wind', label: 'not-drone', quota: 3 },
  { esc50: 'engine', membranaClass: 'traffic', label: 'not-drone', quota: 5 },
  { esc50: 'car_horn', membranaClass: 'traffic', label: 'not-drone', quota: 4 },
  { esc50: 'train', membranaClass: 'traffic', label: 'not-drone', quota: 4 },
  { esc50: 'airplane', membranaClass: 'traffic', label: 'not-drone', quota: 4 },
  { esc50: 'siren', membranaClass: 'traffic', label: 'not-drone', quota: 3 },
  { esc50: 'laughing', membranaClass: 'human-speech', label: 'not-drone', quota: 4 },
  { esc50: 'coughing', membranaClass: 'human-speech', label: 'not-drone', quota: 3 },
  { esc50: 'sneezing', membranaClass: 'human-speech', label: 'not-drone', quota: 2 },
  { esc50: 'clapping', membranaClass: 'human-speech', label: 'not-drone', quota: 2 },
  { esc50: 'breathing', membranaClass: 'human-speech', label: 'not-drone', quota: 2 },
  { esc50: 'crying_baby', membranaClass: 'human-speech', label: 'not-drone', quota: 3 },
  { esc50: 'brushing_teeth', membranaClass: 'human-speech', label: 'not-drone', quota: 2 },
  { esc50: 'clock_tick', membranaClass: 'silence', label: 'not-drone', quota: 4 },
  { esc50: 'pouring_water', membranaClass: 'silence', label: 'not-drone', quota: 3 },
  { esc50: 'mouse_click', membranaClass: 'silence', label: 'not-drone', quota: 3 },
  { esc50: 'keyboard_typing', membranaClass: 'silence', label: 'not-drone', quota: 3 },
  { esc50: 'door_wood_knock', membranaClass: 'silence', label: 'not-drone', quota: 2 },
];

/** DroneAudioDataset folders with positive drone clips. */
const DRONE_DATASET_FOLDERS = [
  'Binary_Drone_Audio/yes_drone',
  'Multiclass_Drone_Audio/bebop_1',
  'Multiclass_Drone_Audio/membo_1',
];

function parseArgs(argv) {
  let target = 120;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target' && argv[i + 1]) {
      target = Number(argv[++i]);
    }
  }
  if (!Number.isFinite(target) || target < 20) {
    throw new Error('--target must be a number >= 20');
  }
  const droneCount = Math.ceil(target / 2);
  const notDroneCount = target - droneCount;
  return { target, droneCount, notDroneCount };
}

// downloadFile / listDroneDatasetWavs / decodeWavPcm16Mono / resampleLinear /
// trimSilenceEdges / measureActiveRatio / tileLoopToDuration / fitDuration /
// normalize / encodeWavPcm16 / slugify — вынесены в ./lib/dataset-audio.mjs
// (reuse в fetch-vdr-pilot-corpus.mjs, VDR-HG1).

/**
 * @param {string} outPath
 * @param {Buffer} wavBuffer
 * @param {object} meta
 * @param {'crop' | 'loop'} durationMode
 */
async function writeSample(outPath, wavBuffer, meta, durationMode = 'crop') {
  const decoded = decodeWavPcm16Mono(wavBuffer);
  let pcm = resampleLinear(decoded.samples, decoded.sampleRate, OUTPUT_SAMPLE_RATE);
  if (durationMode === 'loop') {
    pcm = trimSilenceEdges(pcm, OUTPUT_SAMPLE_RATE);
  }
  pcm = fitDuration(pcm, OUTPUT_SAMPLE_RATE, durationMode, TARGET_DURATION_SEC);
  pcm = normalize(pcm);
  const activeRatio = measureActiveRatio(pcm, OUTPUT_SAMPLE_RATE);
  if (durationMode === 'loop' && activeRatio < MIN_ACTIVE_RATIO_LOOP) {
    throw new Error(
      `Homogeneity gate failed (${(activeRatio * 100).toFixed(0)}% active < ${(MIN_ACTIVE_RATIO_LOOP * 100).toFixed(0)}%)`,
    );
  }
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, encodeWavPcm16(pcm, OUTPUT_SAMPLE_RATE));
  const relPath = outPath.replace(OUT_DIR, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
  return {
    ...meta,
    durationSec: TARGET_DURATION_SEC,
    sampleRate: OUTPUT_SAMPLE_RATE,
    path: relPath,
    activeRatio: Number(activeRatio.toFixed(3)),
  };
}

/** @param {number} droneCount */
async function collectDroneSamples(droneCount) {
  /** @type {object[]} */
  const manifestEntries = [];

  const dronesRes = await fetch(MACKENZIE_DRONES_JSON);
  if (!dronesRes.ok) throw new Error('Failed to fetch mackenzie-jane drones.json');
  /** @type {{ id: string; name: string; audio: string; info?: string }[]} */
  const drones = await dronesRes.json();

  for (const drone of drones) {
    if (manifestEntries.length >= droneCount) break;
    const fileName = basename(drone.audio);
    const url = `${MACKENZIE_AUDIO_BASE}/droneAudio/${fileName}`;
    const cachePath = join(CACHE_DIR, 'mackenzie-jane', fileName);
    if (!(await fileExists(cachePath))) {
      await downloadFile(url, cachePath);
    }
    const id = `drone-mj-${slugify(drone.name)}`;
    const relOut = `drone/${id}.wav`;
    try {
      let entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
        id,
        class: 'drone-multirotor',
        label: 'drone',
        source: 'mackenzie-jane/drone-visualization',
        notes: `${drone.name}; frame ${drone.info ?? '?'}`,
      });
      if (entry.activeRatio < 0.72) {
        entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
          id,
          class: 'drone-multirotor',
          label: 'drone',
          source: 'mackenzie-jane/drone-visualization',
          notes: `seamless-loop; ${drone.name}; frame ${drone.info ?? '?'}`,
        }, 'loop');
        console.log(`drone  ${manifestEntries.length + 1}/${droneCount}  ${id}  active=${(entry.activeRatio * 100).toFixed(0)}% (loop)`);
      } else {
        console.log(`drone  ${manifestEntries.length + 1}/${droneCount}  ${id}  active=${(entry.activeRatio * 100).toFixed(0)}%`);
      }
      manifestEntries.push(entry);
    } catch (err) {
      try {
        const entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
          id,
          class: 'drone-multirotor',
          label: 'drone',
          source: 'mackenzie-jane/drone-visualization',
          notes: `seamless-loop; ${drone.name}; frame ${drone.info ?? '?'}`,
        }, 'loop');
        manifestEntries.push(entry);
        console.log(`drone  ${manifestEntries.length}/${droneCount}  ${id}  active=${(entry.activeRatio * 100).toFixed(0)}% (loop)`);
      } catch (err2) {
        console.warn(`skip mackenzie ${drone.name}: ${err2 instanceof Error ? err2.message : err2}`);
      }
    }
  }

  const remaining = droneCount - manifestEntries.length;
  if (remaining <= 0) return manifestEntries;

  const wavs = await listDroneDatasetWavs(DRONE_DATASET_FOLDERS);
  wavs.sort((a, b) => a.path.localeCompare(b.path));
  let idx = 0;
  while (manifestEntries.length < droneCount && idx < wavs.length) {
    const item = wavs[idx++];
    const fileName = basename(item.path);
    const url = `${DRONE_AUDIO_DATASET_RAW}/${item.path}`;
    const cachePath = join(CACHE_DIR, 'drone-audio-dataset', fileName);
    if (!(await fileExists(cachePath))) {
      await downloadFile(url, cachePath);
    }
    const id = `drone-dad-${String(manifestEntries.length + 1).padStart(4, '0')}`;
    const relOut = `drone/${id}.wav`;
    try {
      const entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
        id,
        class: 'drone-multirotor',
        label: 'drone',
        source: 'saraalemadi/DroneAudioDataset',
        notes: `seamless-loop from ~1s; ${item.path}`,
      }, 'loop');
      manifestEntries.push(entry);
      console.log(`drone  ${manifestEntries.length}/${droneCount}  ${id}  active=${(entry.activeRatio * 100).toFixed(0)}%`);
    } catch (err) {
      console.warn(`skip ${fileName}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (manifestEntries.length < droneCount) {
    throw new Error(
      `Only collected ${manifestEntries.length}/${droneCount} drone samples`,
    );
  }
  return manifestEntries;
}

/** @returns {Promise<{ filename: string; category: string }[]>} */
async function loadEsc50Rows() {
  const res = await fetch(ESC50_CSV);
  if (!res.ok) throw new Error('ESC-50 csv download failed');
  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [filename, , , category] = line.split(',');
      return { filename, category };
    });
}

/** @param {number} notDroneCount */
async function collectNotDroneSamples(notDroneCount) {
  const rows = await loadEsc50Rows();
  const byCategory = new Map();
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, []);
    byCategory.get(row.category).push(row.filename);
  }

  const quotaByCategory = new Map(
    NOT_DRONE_QUOTAS.map((q) => [q.esc50, { ...q, taken: 0, fileIdx: 0 }]),
  );

  /** @type {object[]} */
  const manifestEntries = [];

  for (const spec of NOT_DRONE_QUOTAS) {
    const files = byCategory.get(spec.esc50) ?? [];
    const state = quotaByCategory.get(spec.esc50);
    if (!state) continue;

    while (state.taken < spec.quota && manifestEntries.length < notDroneCount) {
      if (state.fileIdx >= files.length) {
        console.warn(`ESC-50 category ${spec.esc50} exhausted at ${state.taken}/${spec.quota}`);
        break;
      }
      const fileName = files[state.fileIdx++];
      const url = `${ESC50_AUDIO_BASE}/${fileName}`;
      const cachePath = join(CACHE_DIR, 'esc-50', fileName);
      if (!(await fileExists(cachePath))) {
        await downloadFile(url, cachePath);
      }
      const id = `not-${spec.membranaClass}-${slugify(spec.esc50)}-${String(state.taken + 1).padStart(2, '0')}`;
      const relOut = `not-drone/${id}.wav`;
      try {
        const entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
          id,
          class: spec.membranaClass,
          label: spec.label,
          source: 'karoldvl/ESC-50',
          notes: `ESC-50 category=${spec.esc50}; ${fileName}`,
        }, 'crop');
        manifestEntries.push(entry);
        state.taken++;
        console.log(`not    ${manifestEntries.length}/${notDroneCount}  ${id}  active=${(entry.activeRatio * 100).toFixed(0)}%`);
      } catch (err) {
        console.warn(`skip ${fileName}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (manifestEntries.length < notDroneCount) {
    // Top-up from any ESC-50 category not yet over-represented
    const used = new Set(manifestEntries.map((s) => s.notes));
    for (const row of rows) {
      if (manifestEntries.length >= notDroneCount) break;
      const cachePath = join(CACHE_DIR, 'esc-50', row.filename);
      if (!(await fileExists(cachePath))) {
        await downloadFile(`${ESC50_AUDIO_BASE}/${row.filename}`, cachePath);
      }
      const fallbackClass =
        NOT_DRONE_QUOTAS.find((q) => q.esc50 === row.category)?.membranaClass ?? 'unlabeled';
      const id = `not-extra-${slugify(row.category)}-${String(manifestEntries.length + 1).padStart(2, '0')}`;
      const relOut = `not-drone/${id}.wav`;
      try {
        const entry = await writeSample(join(OUT_DIR, relOut), await readFile(cachePath), {
          id,
          class: fallbackClass,
          label: 'not-drone',
          source: 'karoldvl/ESC-50',
          notes: `ESC-50 top-up category=${row.category}; ${row.filename}`,
        }, 'crop');
        manifestEntries.push(entry);
        console.log(`not    ${manifestEntries.length}/${notDroneCount}  ${id}  (top-up)`);
      } catch {
        /* try next */
      }
    }
  }

  if (manifestEntries.length < notDroneCount) {
    throw new Error(
      `Only collected ${manifestEntries.length}/${notDroneCount} not-drone samples`,
    );
  }
  return manifestEntries;
}

/** @param {string} path */
async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function writeInventory(manifest) {
  const invPath = join(ROOT, 'docs', 'datasets', 'week-2026-06-14', 'collections-inventory.md');
  const drone = manifest.samples.filter((s) => s.label === 'drone');
  const notDrone = manifest.samples.filter((s) => s.label === 'not-drone');
  const byClass = new Map();
  for (const s of manifest.samples) {
    byClass.set(s.class, (byClass.get(s.class) ?? 0) + 1);
  }

  const lines = [
    '# Collections inventory — week 2026-06-14',
    '',
    `> Сгенерировано: \`${manifest.generatedAt}\` скриптом \`${manifest.generatedBy}\``,
    '',
    '## Сводка',
    '',
    `| Метрика | Значение |`,
    `|---------|----------|`,
    `| Всего сэмплов | **${manifest.samples.length}** |`,
    `| Дрон (label=drone) | **${drone.length}** |`,
    `| Не-дрон (label=not-drone) | **${notDrone.length}** |`,
    `| Длительность | ${TARGET_DURATION_SEC} с |`,
    `| Sample rate | ${OUTPUT_SAMPLE_RATE} Hz mono |`,
    '',
    '## По классам',
    '',
    '| class | count |',
    '|-------|------:|',
    ...[...byClass.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cls, n]) => `| \`${cls}\` | ${n} |`),
    '',
    '## Источники',
    '',
    '| Источник | Дрон | Не-дрон | Лицензия |',
    '|----------|-----:|--------:|----------|',
    `| [mackenzie-jane/drone-visualization](https://mackenzie-jane.github.io/drone-visualization/) | ${drone.filter((s) => s.source.includes('mackenzie')).length} | 0 | уточнить у авторов |`,
    `| [saraalemadi/DroneAudioDataset](https://github.com/saraalemadi/DroneAudioDataset) | ${drone.filter((s) => s.source.includes('DroneAudioDataset')).length} | 0 | research |`,
    `| [karoldvl/ESC-50](https://github.com/karoldvl/ESC-50) (native 5 s) | 0 | ${notDrone.length} | CC-BY-NC 3.0 |`,
    '',
    '## Импорт в библиотеку сэмплов',
    '',
    '1. `yarn workspace @membrana/client dev`',
    '2. Модуль **Библиотека сэмплов** → коллекция **Реальные дроны** → импорт `docs/datasets/samples/real-collection/drone/*.wav`',
    '3. Коллекция **Шумные среды / Спокойные** → импорт `docs/datasets/samples/real-collection/not-drone/*.wav`',
    '4. Для каждого файла выставить `class` и `label` по `manifest.json`.',
    '',
    '## Файлы',
    '',
    `- WAV: \`docs/datasets/samples/real-collection/\``,
    `- Манифест: \`docs/datasets/samples/real-collection/manifest.json\``,
    '',
  ];
  await writeFile(invPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Inventory → ${invPath}`);
}

async function main() {
  const { target, droneCount, notDroneCount } = parseArgs(process.argv.slice(2));
  console.log(`Target: ${target} (${droneCount} drone + ${notDroneCount} not-drone), ${TARGET_DURATION_SEC}s @ ${OUTPUT_SAMPLE_RATE} Hz`);

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });
  await rm(join(OUT_DIR, 'drone'), { recursive: true, force: true });
  await rm(join(OUT_DIR, 'not-drone'), { recursive: true, force: true });

  const droneSamples = await collectDroneSamples(droneCount);
  const notDroneSamples = await collectNotDroneSamples(notDroneCount);
  const samples = [...droneSamples, ...notDroneSamples];

  const manifest = {
    version: 1,
    sampleRate: OUTPUT_SAMPLE_RATE,
    durationSec: TARGET_DURATION_SEC,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/fetch-real-dataset-collection.mjs',
    sources: {
      drone: ['mackenzie-jane/drone-visualization', 'saraalemadi/DroneAudioDataset (seamless-loop)'],
      notDrone: ['karoldvl/ESC-50'],
    },
    samples,
  };

  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeInventory(manifest);
  console.log(`Done: ${samples.length} samples → docs/datasets/samples/real-collection/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
