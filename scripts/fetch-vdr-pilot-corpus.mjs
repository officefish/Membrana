/**
 * VDR-HG1: сборка пилотного корпуса hard-gate (консилиум vdr-validation-scope-2026-07-03).
 *
 * 30–35 новых сэмплов, НЕЗАВИСИМЫХ от train v0.2 / real-collection:
 *  - drone: остатки DroneAudioDataset (исключаются целые группы записей,
 *    уже использованные в v0.2 — по префиксу файла до суффикса _NNN_);
 *  - not-drone: свежие файлы ESC-50, включая hard-negative категории
 *    (helicopter, vacuum_cleaner, washing_machine, chainsaw — классические
 *    путальщики дрона), исключая использованные filename'ы.
 *
 * Метки в манифесте — 'unlabeled': истину ставит оператор через VDR2-UI
 * (DATASET_CURATION.md §«Пилот hard-gate»); class/originLabel — только провенанс.
 *
 * Usage:
 *   yarn dataset:fetch-vdr-pilot            # 16 drone + 17 not-drone = 33
 *   yarn dataset:fetch-vdr-pilot -- --drone 15 --not-drone 15
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
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
  trimSilenceEdges,
} from './lib/dataset-audio.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'detectors-benchmark', 'vdr-hard-gate-pilot');
const CACHE_DIR = join(ROOT, 'docs', 'datasets', 'samples', '.cache', 'vdr-pilot');
const V02_MANIFEST = join(ROOT, 'data', 'detectors-benchmark', 'v0.2', 'manifest.json');
const REAL_COLLECTION_MANIFEST = join(
  ROOT,
  'docs',
  'datasets',
  'samples',
  'real-collection',
  'manifest.json',
);

const TARGET_DURATION_SEC = 5;
const OUTPUT_SAMPLE_RATE = 48_000;
const MIN_ACTIVE_RATIO_LOOP = 0.82;

const DRONE_AUDIO_DATASET_RAW =
  'https://raw.githubusercontent.com/saraalemadi/DroneAudioDataset/master';
const ESC50_CSV = 'https://raw.githubusercontent.com/karoldvl/ESC-50/master/meta/esc50.csv';
const ESC50_AUDIO_BASE = 'https://raw.githubusercontent.com/karoldvl/ESC-50/master/audio';

const DRONE_DATASET_FOLDERS = [
  'Binary_Drone_Audio/yes_drone',
  'Multiclass_Drone_Audio/bebop_1',
  'Multiclass_Drone_Audio/membo_1',
];

/**
 * Hard-gate not-drone квоты: упор на путальщики дрона (винтовые/моторные),
 * плюс контрольные природные категории.
 */
const NOT_DRONE_QUOTAS = [
  { esc50: 'helicopter', membranaClass: 'traffic', quota: 3 },
  { esc50: 'vacuum_cleaner', membranaClass: 'household', quota: 3 },
  { esc50: 'washing_machine', membranaClass: 'household', quota: 2 },
  { esc50: 'chainsaw', membranaClass: 'traffic', quota: 2 },
  { esc50: 'engine', membranaClass: 'traffic', quota: 2 },
  { esc50: 'airplane', membranaClass: 'traffic', quota: 1 },
  { esc50: 'wind', membranaClass: 'wind', quota: 2 },
  { esc50: 'chirping_birds', membranaClass: 'bird', quota: 2 },
];

function parseArgs(argv) {
  let droneCount = 16;
  let notDroneCount = 17;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--drone' && argv[i + 1]) droneCount = Number(argv[++i]);
    if (argv[i] === '--not-drone' && argv[i + 1]) notDroneCount = Number(argv[++i]);
  }
  const total = droneCount + notDroneCount;
  if (!Number.isFinite(total) || total < 30 || total > 40) {
    throw new Error('Пилот: суммарно 30–40 сэмплов (консилиум: 30–35)');
  }
  return { droneCount, notDroneCount };
}

/** Группа записи DAD: имя файла без хвостового суффикса _NNN_.wav (нарезки одной сессии). */
function dadRecordingGroup(filePath) {
  const base = filePath.split('/').pop() ?? filePath;
  return base.replace(/_\d+_?\.wav$/i, '');
}

/** Использованные источники из существующих манифестов (независимость пилота). */
async function loadUsedSources() {
  const usedDadGroups = new Set();
  const usedEscFiles = new Set();
  const usedMjModels = new Set();

  for (const manifestPath of [REAL_COLLECTION_MANIFEST, V02_MANIFEST]) {
    /** @type {{ samples: { id: string, notes?: string }[] }} */
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const sample of manifest.samples ?? []) {
      const notes = sample.notes ?? '';
      const dadMatch = notes.match(/((?:Binary|Multiclass)_Drone_Audio\/[\w-]+\/[\w.-]+\.wav)/i);
      if (dadMatch) {
        usedDadGroups.add(dadRecordingGroup(dadMatch[1]));
      }
      const escMatch = notes.match(/(\d+-\d+-[A-Z]-\d+\.wav)/);
      if (escMatch) {
        usedEscFiles.add(escMatch[1]);
      }
      if (sample.id.startsWith('drone-mj-')) {
        usedMjModels.add(sample.id);
      }
    }
  }
  return { usedDadGroups, usedEscFiles, usedMjModels };
}

/** Обработка WAV → 5 с / 48 кГц / mono / normalize; запись + manifest-entry. */
async function writeSample(outPath, wavBuffer, meta, durationMode) {
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
      `Homogeneity gate failed (${(activeRatio * 100).toFixed(0)}% active)`,
    );
  }
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, encodeWavPcm16(pcm, OUTPUT_SAMPLE_RATE));
  const relPath = outPath.replace(OUT_DIR, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
  return {
    ...meta,
    // Истина — от оператора (VDR2-UI); originLabel/class — только провенанс.
    label: 'unlabeled',
    operator: null,
    labeledAt: null,
    durationSec: TARGET_DURATION_SEC,
    sampleRate: OUTPUT_SAMPLE_RATE,
    path: relPath,
    activeRatio: Number(activeRatio.toFixed(3)),
  };
}

async function collectPilotDrones(droneCount, usedDadGroups) {
  const wavs = await listDroneDatasetWavs(DRONE_DATASET_FOLDERS);
  /** @type {Map<string, string>} группа → первый файл группы */
  const freshByGroup = new Map();
  for (const item of wavs) {
    const group = dadRecordingGroup(item.path);
    if (usedDadGroups.has(group)) continue;
    if (!freshByGroup.has(group)) {
      freshByGroup.set(group, item.path);
    }
  }
  const groups = [...freshByGroup.keys()].sort();
  if (groups.length < droneCount) {
    throw new Error(
      `DAD-остаток мал: свежих групп ${groups.length} < ${droneCount}. Уменьшите --drone.`,
    );
  }
  // Равномерный охват остатка: берём группы с равным шагом по отсортированному списку.
  const step = groups.length / droneCount;
  const entries = [];
  for (let i = 0; i < droneCount; i++) {
    const group = groups[Math.floor(i * step)];
    const filePath = freshByGroup.get(group);
    const id = `pilot-drone-${String(i + 1).padStart(3, '0')}`;
    const cache = join(CACHE_DIR, 'dad', filePath.replace(/\//g, '_'));
    await downloadFile(`${DRONE_AUDIO_DATASET_RAW}/${filePath}`, cache);
    const entry = await writeSample(
      join(OUT_DIR, 'drone', `${id}.wav`),
      await readFile(cache),
      {
        id,
        class: 'drone-multirotor',
        originLabel: 'drone',
        source: 'saraalemadi/DroneAudioDataset',
        notes: `seamless-loop; ${filePath}; группа ${group} не встречается в v0.2/real-collection`,
      },
      'loop',
    );
    entries.push(entry);
    console.log(`drone ${entries.length}/${droneCount}  ${id}  ${group}`);
  }
  return entries;
}

async function loadEsc50Rows() {
  const cache = join(CACHE_DIR, 'esc50.csv');
  await downloadFile(ESC50_CSV, cache);
  const text = await readFile(cache, 'utf8');
  return text
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [filename, , , category] = line.split(',');
      return { filename, category };
    });
}

async function collectPilotNotDrones(notDroneCount, usedEscFiles) {
  const rows = await loadEsc50Rows();
  const entries = [];
  for (const spec of NOT_DRONE_QUOTAS) {
    if (entries.length >= notDroneCount) break;
    const fresh = rows.filter(
      (r) => r.category === spec.esc50 && !usedEscFiles.has(r.filename),
    );
    let taken = 0;
    for (const row of fresh) {
      if (taken >= spec.quota || entries.length >= notDroneCount) break;
      const id = `pilot-not-${spec.esc50.replace(/_/g, '-')}-${String(taken + 1).padStart(2, '0')}`;
      const cache = join(CACHE_DIR, 'esc50', row.filename);
      try {
        await downloadFile(`${ESC50_AUDIO_BASE}/${row.filename}`, cache);
        const entry = await writeSample(
          join(OUT_DIR, 'not-drone', `${id}.wav`),
          await readFile(cache),
          {
            id,
            class: spec.membranaClass,
            originLabel: 'not-drone',
            source: 'karoldvl/ESC-50',
            notes: `ESC-50 category=${spec.esc50}; ${row.filename}; не встречается в v0.2/real-collection`,
          },
          'crop',
        );
        entries.push(entry);
        taken++;
        console.log(`not   ${entries.length}/${notDroneCount}  ${id}`);
      } catch (err) {
        console.warn(`skip ${row.filename}: ${err.message}`);
      }
    }
    if (taken < spec.quota) {
      console.warn(`Категория ${spec.esc50}: взято ${taken}/${spec.quota} (мало свежих файлов)`);
    }
  }
  if (entries.length < notDroneCount) {
    throw new Error(`Собрано not-drone ${entries.length}/${notDroneCount} — расширьте квоты`);
  }
  return entries;
}

async function main() {
  const { droneCount, notDroneCount } = parseArgs(process.argv.slice(2));
  const { usedDadGroups, usedEscFiles, usedMjModels } = await loadUsedSources();
  console.log(
    `Исключено использованных источников: DAD-групп ${usedDadGroups.size}, ESC-файлов ${usedEscFiles.size}, MJ-моделей ${usedMjModels.size}`,
  );

  const drones = await collectPilotDrones(droneCount, usedDadGroups);
  const notDrones = await collectPilotNotDrones(notDroneCount, usedEscFiles);
  const samples = [...drones, ...notDrones];

  const manifest = {
    version: 'vdr-hard-gate-pilot-v1',
    purpose:
      'Независимый пилотный корпус hard-gate 85/90 (консилиум vdr-validation-scope-2026-07-03). Метки ставит оператор (VDR2-UI, intra-rater ≥95%); originLabel — только провенанс.',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/fetch-vdr-pilot-corpus.mjs',
    sampleRate: OUTPUT_SAMPLE_RATE,
    durationSec: TARGET_DURATION_SEC,
    independence: {
      checkedAgainst: [
        'data/detectors-benchmark/v0.2/manifest.json',
        'docs/datasets/samples/real-collection/manifest.json',
      ],
      excludedDadRecordingGroups: usedDadGroups.size,
      excludedEsc50Files: usedEscFiles.size,
      rule: 'DAD: исключены целые группы записей (префикс до _NNN_); ESC-50: исключены использованные filename',
    },
    sources: {
      drone: ['saraalemadi/DroneAudioDataset (seamless-loop, свежие группы)'],
      notDrone: ['karoldvl/ESC-50 (hard negatives: helicopter/vacuum/washing/chainsaw + контроль)'],
    },
    samples,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Готово: ${samples.length} сэмплов (${drones.length} drone-происхождения, ${notDrones.length} not-drone) → ${OUT_DIR}`,
  );
  console.log('Все label=unlabeled — разметка оператором по DATASET_CURATION.md §«Пилот hard-gate».');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
