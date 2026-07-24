import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STUBS = path.join(__dirname, '../../docs/containers/strategic-docs/stubs');

/**
 * @typedef {Object} Granule
 * @property {string} id
 * @property {string} version
 * @property {'literal'|'function'} kind
 * @property {string} [bodyPath]
 * @property {string} [fn]
 * @property {string} description
 */

/**
 * @typedef {Object} Template
 * @property {string} id
 * @property {string} version
 * @property {string} target
 * @property {string} skeleton
 * @property {Array<{granuleId:string, pin:string, placeholder:string}>} slots
 */

/**
 * @typedef {Object} ReleaseSnap
 * @property {string} id
 * @property {string} body
 * @property {Record<string,string>} pins
 */

/**
 * @typedef {Object} SyncRequest
 * @property {string} granuleId
 * @property {string} fromVersion
 * @property {string} toVersion
 * @property {string} newBody
 * @property {ReleaseSnap[]} releases
 */

/**
 * @typedef {Object} SyncResult
 * @property {ReleaseSnap[]} updated
 * @property {ReleaseSnap[]} skipped
 */

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/** @returns {boolean} */
export function isExactSemver(s) {
  return typeof s === 'string' && SEMVER_REGEX.test(s.trim());
}

/** @throws {Error} */
export function parsePin(s) {
  const trimmed = typeof s === 'string' ? s.trim() : '';
  if (!isExactSemver(trimmed)) {
    throw new Error(`Invalid exact semver pin: "${s}"`);
  }
  return trimmed;
}

/** @returns {string} */
export function granuleKey(id, version) {
  return `${id}@${version}`;
}

/**
 * Проверяет валидность шаблона
 * @param {Template} template
 * @param {Map<string, Granule>} granuleIndex
 * @returns {{ok:true}|{ok:false, reasons:string[]}}
 */
export function valid(template, granuleIndex) {
  const reasons = [];

  if (!template || typeof template !== 'object') {
    reasons.push('Template is not an object');
    return { ok: false, reasons };
  }

  if (!template.id || !template.version || !template.skeleton || !Array.isArray(template.slots)) {
    reasons.push('Missing required fields: id, version, skeleton or slots array');
  }

  if (!isExactSemver(template.version)) {
    reasons.push(`Invalid template version: ${template.version}`);
  }

  const placeholders = new Set();
  const usedPlaceholders = new Set();

  for (const slot of template.slots || []) {
    if (!slot.granuleId || !slot.pin || !slot.placeholder) {
      reasons.push('Slot missing granuleId, pin or placeholder');
      continue;
    }

    if (!isExactSemver(slot.pin)) {
      reasons.push(`Invalid pin ${slot.pin} for granule ${slot.granuleId}`);
      continue;
    }

    const key = granuleKey(slot.granuleId, slot.pin);
    const granule = granuleIndex.get(key);

    if (!granule) {
      reasons.push(`Granule ${key} not found in index`);
      continue;
    }

    if (!['literal', 'function'].includes(granule.kind)) {
      reasons.push(`Invalid kind "${granule.kind}" for granule ${key}`);
      continue;
    }

    if (granule.kind === 'literal' && (!granule.bodyPath || typeof granule.bodyPath !== 'string')) {
      reasons.push(`Literal granule ${key} has no bodyPath`);
    }

    if (granule.kind === 'function' && (!granule.fn || typeof granule.fn !== 'string')) {
      reasons.push(`Function granule ${key} has no fn export name`);
    }

    const ph = slot.placeholder.trim();
    if (placeholders.has(ph)) {
      reasons.push(`Duplicate placeholder: ${ph}`);
    } else {
      placeholders.add(ph);
    }

    if (template.skeleton.includes(ph)) {
      usedPlaceholders.add(ph);
    }
  }

  // Проверка плейсхолдеров
  const skeletonPlaceholders = [...template.skeleton.matchAll(/\{\{([^}]+)\}\}/g)]
    .map(m => `{{${m[1].trim()}}}`);

  for (const ph of skeletonPlaceholders) {
    if (!placeholders.has(ph)) {
      reasons.push(`Placeholder ${ph} in skeleton has no corresponding slot`);
    }
  }

  for (const ph of placeholders) {
    if (!template.skeleton.includes(ph)) {
      reasons.push(`Slot placeholder ${ph} is not used in skeleton`);
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  return { ok: true };
}

/** Извлекает тело гранулы из релиза по маркерам */
export function extractGranule(body, granuleId) {
  const regex = new RegExp(
    `<!--\\s*granule:${granuleId}@[^@]+?\\s*-->([\\s\\S]*?)<!--\\s*/granule\\s*-->`,
    'i'
  );
  const match = body.match(regex);
  return match ? match[1].trim() : '';
}

/** Вставляет гранулу с маркерами */
export function applyGranuleMarkers(body, granuleId, version, fragment) {
  const markerStart = `<!-- granule:${granuleId}@${version} -->`;
  const markerEnd = `<!-- /granule -->`;

  const regex = new RegExp(
    `<!--\\s*granule:${granuleId}@[^@]+?\\s*-->([\\s\\S]*?)<!--\\s*/granule\\s*-->`,
    'i'
  );

  if (regex.test(body)) {
    return body.replace(regex, `${markerStart}\n${fragment}\n${markerEnd}`);
  }

  return `${body}\n\n${markerStart}\n${fragment}\n${markerEnd}`;
}

/** Чистая операция синхронизации гранулы */
export function syncGranule(req) {
  const { granuleId, fromVersion, toVersion, newBody, releases } = req;

  const updated = [];
  const skipped = [];

  for (const release of releases) {
    const currentPin = release.pins?.[granuleId];

    if (currentPin !== fromVersion) {
      skipped.push({ ...release });
      continue;
    }

    const newReleaseBody = applyGranuleMarkers(release.body, granuleId, toVersion, newBody);

    const newPins = { ...release.pins, [granuleId]: toVersion };

    updated.push({
      id: release.id,
      body: newReleaseBody,
      pins: newPins
    });
  }

  return { updated, skipped };
}

/** Загружает стабы (I/O только для тестов и адаптеров) */
export async function loadStubSnaps(stubsDir = DEFAULT_STUBS) {
  const files = ['README.md', 'AGENTS.md', 'CLAUDE.md'];
  const snaps = [];

  for (const filename of files) {
    const filepath = path.join(stubsDir, filename);
    try {
      const content = await fs.readFile(filepath, 'utf8');
      snaps.push({
        id: filename.replace('.md', ''),
        body: content,
        pins: { 'course-north-star': '1.0.0' }
      });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // Если файла нет — создаём минимальный стаб
      const minimal = `# ${filename.replace('.md', '')}\n\n<!-- granule:course-north-star@1.0.0 -->\nДРЕЙФУЮЩИЙ ТЕКСТ\n<!-- /granule -->`;
      snaps.push({
        id: filename.replace('.md', ''),
        body: minimal,
        pins: { 'course-north-star': '1.0.0' }
      });
    }
  }

  return snaps;
}
