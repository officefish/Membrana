/**
 * Merge cabinet/media catalog ground truth into benchmark manifest entries.
 */

/** @typedef {{ id: string; title?: string; label?: string; notes?: string | null }} CatalogSampleRef */

/**
 * Stable key for matching catalog rows to manifest entries (free-v1: manifest.id === catalog.title).
 * @param {CatalogSampleRef} sample
 */
function catalogMatchKey(sample) {
  const title = sample.title?.trim();
  if (title) return title;
  return sample.id;
}

/**
 * @param {CatalogSampleRef[]} catalogSamples
 */
function catalogByMatchKey(catalogSamples) {
  const byKey = new Map();
  for (const sample of catalogSamples) {
    byKey.set(catalogMatchKey(sample), sample);
  }
  return byKey;
}

/**
 * Normalize API / DB label to manifest `drone` | `not-drone` | `unlabeled`.
 * @param {string | undefined} label
 */
export function normalizeGroundTruthLabel(label) {
  if (label === 'drone') return 'drone';
  if (label === 'not-drone' || label === 'not_drone') return 'not-drone';
  return 'unlabeled';
}

/**
 * @param {Array<{ id: string; label?: string; [key: string]: unknown }>} manifestSamples
 * @param {CatalogSampleRef[]} catalogSamples
 */
export function mergeGroundTruthIntoManifest(manifestSamples, catalogSamples) {
  const byKey = catalogByMatchKey(catalogSamples);
  /** @type {string[]} */
  const missingInCatalog = [];
  let labeled = 0;
  let unlabeled = 0;
  let notesUpdated = 0;

  const samples = manifestSamples.map((entry) => {
    const gt = byKey.get(entry.id);
    if (!gt) {
      missingInCatalog.push(entry.id);
      return entry;
    }
    const label = normalizeGroundTruthLabel(gt.label);
    if (label === 'unlabeled') unlabeled += 1;
    else labeled += 1;
    const notes =
      gt.notes !== undefined && gt.notes !== null && String(gt.notes).trim().length > 0
        ? String(gt.notes).trim()
        : null;
    if (notes !== (entry.notes ?? null)) notesUpdated += 1;
    return {
      ...entry,
      label,
      notes,
    };
  });

  return {
    samples,
    stats: {
      manifestTotal: manifestSamples.length,
      catalogTotal: catalogSamples.length,
      missingInCatalog,
      labeled,
      unlabeled,
      notesUpdated,
    },
  };
}
