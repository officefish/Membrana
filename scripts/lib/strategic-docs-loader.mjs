/**
 * Загрузчик гранул и шаблонов из docs/containers/strategic-docs/.
 * Git = SoT; адаптирует on-disk granule.json к dual-interface (valid + generate).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONTAINER_ROOT = path.join(__dirname, '../../docs/containers/strategic-docs');
export const GRANULES_DIR = path.join(CONTAINER_ROOT, 'granules');
export const TEMPLATES_DIR = path.join(CONTAINER_ROOT, 'templates');

/** @param {string} dir */
async function readGranuleDir(dir) {
  const metaPath = path.join(dir, 'granule.json');
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  } catch {
    return null;
  }

  if (!raw?.id || !raw?.version || !raw?.kind) return null;

  /** @type {Record<string, unknown>} */
  const granule = { ...raw, description: raw.description ?? '' };

  if (granule.kind === 'literal' && typeof granule.bodyPath === 'string') {
    const bodyFile = path.join(dir, granule.bodyPath.replace(/^\.\//, ''));
    granule.body = await fs.readFile(bodyFile, 'utf8');
  }

  if (granule.kind === 'function') {
    granule.exportName = granule.fn;
    if (typeof granule.modulePath === 'string') {
      const moduleFile = path.join(dir, granule.modulePath.replace(/^\.\//, ''));
      granule.modulePath = pathToFileURL(moduleFile).href;
    }
  }

  return granule;
}

/** @returns {Promise<Array<import('./strategic-docs-model.mjs').Granule & { body?: string, exportName?: string, modulePath?: string }>>} */
export async function loadGranules(granulesDir = GRANULES_DIR) {
  const entries = await fs.readdir(granulesDir, { withFileTypes: true });
  const granules = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const g = await readGranuleDir(path.join(granulesDir, entry.name));
    if (g) granules.push(g);
  }

  granules.sort((a, b) => a.id.localeCompare(b.id));
  return granules;
}

/** @param {string} templateId */
export async function loadTemplate(templateId, templatesDir = TEMPLATES_DIR) {
  const templatePath = path.join(templatesDir, templateId, 'template.json');
  return JSON.parse(await fs.readFile(templatePath, 'utf8'));
}
