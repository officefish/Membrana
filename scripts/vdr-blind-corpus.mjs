#!/usr/bin/env node
/**
 * yarn vdr:blind — сделать пилотный корпус пригодным для СЛЕПОЙ разметки.
 *
 * Повод (находка 15.08): корпус нельзя было разметить вслепую — имена файлов
 * (`pilot-drone-001`, `pilot-not-helicopter-01`) и раскладка по каталогам
 * `drone/` + `not-drone/` показывают оператору ответ раньше, чем он услышит
 * запись. Операторская истина, полученная с подсказкой, — не истина, и
 * приёмочное число на ней было бы фикцией.
 *
 * Что делает: раскладывает все записи в один каталог `samples/` под нейтральными
 * именами `pilot-NNN.wav`, перестраивает манифест под новые id и кладёт рядом
 * карту соответствия. Провенанс (`originLabel`, `class`, `source`) из манифеста
 * НЕ удаляется — он нужен для сверки после разметки; оператор его не видит,
 * потому что размечает в клиентской библиотеке, а не в манифесте.
 *
 * Порядок номеров — детерминированная перестановка по sha256 исходного id:
 * номер не коррелирует с классом, но результат воспроизводим (не Math.random).
 *
 * Usage:
 *   yarn vdr:blind --manifest data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json --dry-run
 *   yarn vdr:blind --manifest <...> --execute
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_MANIFEST = 'data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json';

/** @param {string[]} argv */
export function parseArgs(argv) {
  const out = { manifest: DEFAULT_MANIFEST, execute: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--manifest') out.manifest = argv[++i];
    else if (a === '--execute') out.execute = true;
    else if (a === '--dry-run') out.execute = false;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный флаг: ${a}`);
  }
  return out;
}

/**
 * Детерминированная перестановка: порядок задаётся sha256 исходного id.
 * @param {{id: string}[]} samples
 * @returns {Map<string, string>} исходный id → нейтральный id
 */
export function blindOrder(samples) {
  const ranked = samples
    .map((s) => ({ id: s.id, key: createHash('sha256').update(s.id).digest('hex') }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const width = String(ranked.length).length;
  const map = new Map();
  ranked.forEach((row, index) => {
    map.set(row.id, `pilot-${String(index + 1).padStart(width, '0')}`);
  });
  return map;
}

/**
 * @param {object} manifest
 * @param {Map<string,string>} map
 * @returns {object} новый манифест
 */
export function rewriteManifest(manifest, map) {
  const samples = (manifest.samples ?? []).map((s) => {
    const blindId = map.get(s.id);
    if (!blindId) throw new Error(`нет нейтрального имени для ${s.id}`);
    return {
      ...s,
      id: blindId,
      path: `samples/${blindId}.wav`,
      // провенанс сохраняется под явным именем: он НЕ метка и в разметку не идёт
      provenanceId: s.id,
    };
  });
  samples.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ...manifest, blindLabeling: true, samples };
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('Usage: yarn vdr:blind [--manifest <path>] [--dry-run|--execute]');
    return 0;
  }
  const manifestPath = resolve(process.cwd(), args.manifest);
  const root = dirname(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const samples = manifest.samples ?? [];

  if (manifest.blindLabeling) {
    console.log('vdr:blind — корпус уже слепой, ничего не делаю (идемпотентно)');
    return 0;
  }

  const map = blindOrder(samples);
  const moves = samples.map((s) => ({
    from: join(root, s.path ?? ''),
    to: join(root, 'samples', `${map.get(s.id)}.wav`),
    fromId: s.id,
    toId: map.get(s.id),
  }));

  const missing = moves.filter((m) => !existsSync(m.from));
  if (missing.length > 0) {
    console.error(`vdr:blind — не найдены файлы (${missing.length}): ${missing.slice(0, 3).map((m) => m.fromId).join(', ')}`);
    return 2;
  }

  console.log(`vdr:blind — записей: ${samples.length}; каталог назначения: samples/`);
  for (const m of moves.slice(0, 3)) console.log(`  ${m.fromId} → ${m.toId}`);
  console.log(`  … всего перемещений: ${moves.length}`);

  if (!args.execute) {
    console.log('dry-run: ничего не тронуто. Выполнить — --execute.');
    return 0;
  }

  mkdirSync(join(root, 'samples'), { recursive: true });
  for (const m of moves) renameSync(m.from, m.to);

  writeFileSync(manifestPath, `${JSON.stringify(rewriteManifest(manifest, map), null, 2)}\n`, 'utf8');
  writeFileSync(
    join(root, 'blind-map.json'),
    `${JSON.stringify(
      { note: 'Карта слепой разметки: нейтральный id → исходный. Смотреть ПОСЛЕ разметки, не до.', map: Object.fromEntries([...map].map(([k, v]) => [v, k])) },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log('vdr:blind — корпус слеп: имена нейтральны, каталоги классов расформированы, карта рядом.');
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/vdr-blind-corpus.mjs')) {
  process.exitCode = main(process.argv.slice(2));
}
