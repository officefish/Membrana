/**
 * NB2 (vdr-label-roundtrip): перенос операторских меток из JSON-экспорта
 * клиентской «Библиотеки сэмплов» в манифест benchmark-корпуса.
 *
 * Usage:
 *   yarn vdr:labels-merge -- --labels <export.json> --manifest data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json
 *   yarn vdr:labels-merge -- --labels <export.json> --manifest <...> --dry-run
 *   yarn vdr:labels-merge -- --labels <export.json> --labels-only <out.json>   # intra-rater: плоский файл для validate:vdr
 *
 * Матч: fileName экспорта без расширения == sample.id манифеста (файлы корпуса
 * названы `<id>.wav`, при импорте в библиотеку title = имя файла).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALID_LABELS = new Set(['drone', 'not-drone', 'unlabeled']);

export function labelKeyFromFileName(fileName) {
  return String(fileName)
    .trim()
    .replace(/\.wav$/i, '');
}

/** Экспорт библиотеки → Map(id → {label, notes}); нормализует и валидирует. */
export function indexExportedLabels(exported) {
  if (!Array.isArray(exported?.labels)) {
    throw new Error('labels-файл: ожидается поле labels[] (экспорт из библиотеки сэмплов)');
  }
  const byId = new Map();
  const invalid = [];
  const duplicates = [];
  for (const row of exported.labels) {
    const id = labelKeyFromFileName(row.fileName ?? '');
    if (!id || !VALID_LABELS.has(row.label)) {
      invalid.push(row.fileName ?? '(без имени)');
      continue;
    }
    if (byId.has(id)) duplicates.push(id);
    byId.set(id, { label: row.label, notes: row.notes ?? null });
  }
  return { byId, invalid, duplicates };
}

/**
 * Слить метки в манифест (мутирует копию). Возвращает отчёт:
 * applied / alreadySame / unmatchedManifest (в манифесте нет метки из экспорта…
 * наоборот: строк экспорта без пары в манифесте) / untouched (сэмплы манифеста без метки в экспорте).
 */
export function mergeLabelsIntoManifest(manifest, byId) {
  if (!Array.isArray(manifest?.samples)) {
    throw new Error('manifest: ожидается поле samples[]');
  }
  const next = structuredClone(manifest);
  const report = { applied: [], alreadySame: [], untouched: [], unmatchedExport: [] };
  const manifestIds = new Set();
  for (const sample of next.samples) {
    manifestIds.add(sample.id);
    const found = byId.get(sample.id);
    if (!found) {
      report.untouched.push(sample.id);
      continue;
    }
    if (sample.label === found.label) {
      report.alreadySame.push(sample.id);
    } else {
      sample.label = found.label;
      report.applied.push(sample.id);
    }
    if (found.notes) {
      sample.operatorNotes = found.notes;
    }
  }
  for (const id of byId.keys()) {
    if (!manifestIds.has(id)) report.unmatchedExport.push(id);
  }
  return { manifest: next, report };
}

/** Intra-rater: массив [{id, label}] — формат validate:vdr --intra-rater / --labels-a/b. */
export function flattenLabels(byId) {
  return [...byId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, value]) => ({ id, label: value.label }));
}

function parseArgs(argv) {
  const options = { labels: null, manifest: null, labelsOnly: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--labels' && argv[i + 1]) options.labels = resolve(argv[++i]);
    else if (argv[i] === '--manifest' && argv[i + 1]) options.manifest = resolve(argv[++i]);
    else if (argv[i] === '--labels-only' && argv[i + 1]) options.labelsOnly = resolve(argv[++i]);
    else if (argv[i] === '--dry-run') options.dryRun = true;
  }
  if (!options.labels) throw new Error('--labels <export.json> обязателен');
  if (!options.manifest && !options.labelsOnly) {
    throw new Error('нужен --manifest <manifest.json> или --labels-only <out.json>');
  }
  return options;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]).endsWith('vdr-labels-merge.mjs');
if (isDirectRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const exported = JSON.parse(readFileSync(options.labels, 'utf8'));
    const { byId, invalid, duplicates } = indexExportedLabels(exported);
    if (invalid.length > 0) console.warn(`пропущено некорректных строк: ${invalid.length} (${invalid.join(', ')})`);
    if (duplicates.length > 0) console.warn(`дубликаты имён в экспорте (взята последняя): ${duplicates.join(', ')}`);

    if (options.labelsOnly) {
      const flat = flattenLabels(byId);
      writeFileSync(options.labelsOnly, `${JSON.stringify(flat, null, 2)}\n`, 'utf8');
      console.log(`labels-only: ${flat.length} меток → ${options.labelsOnly}`);
    }

    if (options.manifest) {
      const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
      const { manifest: next, report } = mergeLabelsIntoManifest(manifest, byId);
      console.log(
        `merge: applied=${report.applied.length} same=${report.alreadySame.length} ` +
          `untouched=${report.untouched.length} unmatched-export=${report.unmatchedExport.length}`,
      );
      if (report.unmatchedExport.length > 0) {
        console.warn(`  без пары в манифесте: ${report.unmatchedExport.join(', ')}`);
      }
      if (report.untouched.length > 0) {
        console.log(`  осталось без метки из экспорта: ${report.untouched.join(', ')}`);
      }
      if (options.dryRun) {
        console.log('dry-run: манифест не записан.');
      } else {
        writeFileSync(options.manifest, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
        console.log(`Манифест обновлён: ${options.manifest}`);
      }
    }
  } catch (err) {
    console.error(err.message ?? err);
    process.exitCode = 1;
  }
}
