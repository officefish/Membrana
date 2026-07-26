/**
 * strategic-docs-tools — инвентарь мастерской docs/containers/strategic-docs.
 * Read-only; без сети. Канон: WORKSHOP.md · workshop.catalog.json.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CATALOG_REL = 'docs/containers/strategic-docs/workshop.catalog.json';
const MANIFEST_REL = 'docs/containers/strategic-docs/workshop.manifest.json';
const DOMAIN_VERBS = ['generate', 'publish', 'publishTemplates', 'publishReleases', 'discoverWorkspaces'];
const ZONES = new Set(['workshop', 'contract', 'neighbor']);

/**
 * @param {string} repoRoot
 * @returns {{ catalog: object, manifest: object, problems: string[] }}
 */
export function loadWorkshopTooling(repoRoot) {
  const problems = [];
  const catalogPath = join(repoRoot, CATALOG_REL);
  const manifestPath = join(repoRoot, MANIFEST_REL);
  if (!existsSync(catalogPath)) problems.push(`нет ${CATALOG_REL}`);
  if (!existsSync(manifestPath)) problems.push(`нет ${MANIFEST_REL}`);
  if (problems.length) return { catalog: null, manifest: null, problems };

  let catalog;
  let manifest;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch (e) {
    problems.push(`${CATALOG_REL}: ${e.message}`);
  }
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    problems.push(`${MANIFEST_REL}: ${e.message}`);
  }
  if (problems.length) return { catalog: null, manifest: null, problems };

  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.tools)) {
    problems.push('catalog.tools — не массив');
  }
  if (!manifest || typeof manifest !== 'object' || !manifest.verbs || typeof manifest.verbs !== 'object') {
    problems.push('manifest.verbs — не объект');
  }
  return { catalog, manifest, problems };
}

/**
 * @param {object} catalog
 * @param {object} manifest
 * @param {string} repoRoot
 * @returns {{ tools: object[], problems: string[], warnings: string[] }}
 */
export function validateWorkshopCatalog(catalog, manifest, repoRoot) {
  const problems = [];
  const warnings = [];
  const tools = Array.isArray(catalog?.tools) ? catalog.tools : [];
  const byId = new Map();
  const byVerb = new Map();

  for (const t of tools) {
    if (!t || typeof t !== 'object') {
      problems.push('tools[] — не объект');
      continue;
    }
    if (typeof t.id !== 'string' || !t.id.trim()) problems.push('tool без id');
    else if (byId.has(t.id)) problems.push(`дубль id: ${t.id}`);
    else byId.set(t.id, t);

    if (!ZONES.has(t.zone)) problems.push(`tool ${t.id}: zone «${t.zone}» вне workshop|contract|neighbor`);
    if (typeof t.yarn !== 'string' || !t.yarn.trim()) problems.push(`tool ${t.id}: нет yarn`);
    if (typeof t.doc !== 'string' || !t.doc.trim()) problems.push(`tool ${t.id}: нет doc`);
    if (typeof t.summary !== 'string' || !t.summary.trim()) problems.push(`tool ${t.id}: нет summary`);

    if (typeof t.verb === 'string' && t.verb) {
      if (byVerb.has(t.verb)) problems.push(`дубль verb: ${t.verb}`);
      else byVerb.set(t.verb, t);
    }

    const scriptRel =
      typeof t.script === 'string' && t.script.trim()
        ? t.script.replace(/\\/gu, '/')
        : yarnToScriptGuess(t.yarn);
    if (scriptRel && t.zone !== 'neighbor' && t.yarn !== '—') {
      if (!existsSync(join(repoRoot, scriptRel))) {
        warnings.push(`tool ${t.id}: движок отсутствует (${scriptRel})`);
      }
    }
    if (typeof t.doc === 'string' && t.doc && t.doc !== '—' && !existsSync(join(repoRoot, t.doc))) {
      warnings.push(`tool ${t.id}: нет doc ${t.doc}`);
    }
  }

  const domain = manifest?.verbs?.domain;
  if (Array.isArray(domain)) {
    for (const d of domain) {
      if (d?.name && !byVerb.has(d.name)) {
        warnings.push(`manifest domain «${d.name}» — нет tool в catalog`);
      }
    }
  }

  for (const v of DOMAIN_VERBS) {
    if (byVerb.has(v) && !Array.isArray(domain)) {
      warnings.push(`catalog verb ${v} без domain[] в manifest`);
    }
  }

  return { tools, problems, warnings };
}

/** @param {string} yarn */
function yarnToScriptGuess(yarn) {
  if (typeof yarn !== 'string' || yarn === '—') return null;
  const m = yarn.match(/^yarn\s+(\S+)/u);
  if (!m) return null;
  const alias = m[1];
  const map = {
    'strategic-docs:tools': 'scripts/strategic-docs-tools.mjs',
    'strategic-docs:generate': 'scripts/strategic-docs-generate.mjs',
    'strategic-docs:publish': 'scripts/strategic-docs-publish.mjs',
    'affine:workspace:list': 'scripts/affine-workspace-list.mjs',
    'affine:sync:templates': 'scripts/affine-sync.mjs',
    'affine:sync:releases': 'scripts/affine-sync.mjs',
  };
  return map[alias] ?? null;
}

/**
 * @param {object[]} tools
 * @param {{ zone?: string }} [opts]
 */
export function filterTools(tools, opts = {}) {
  if (!opts.zone) return tools;
  return tools.filter((t) => t.zone === opts.zone);
}

/**
 * @param {object[]} tools
 * @returns {string}
 */
export function renderToolsTable(tools) {
  const lines = [
    '| zone | tool | yarn | doc | summary |',
    '|------|------|------|-----|---------|',
  ];
  for (const t of tools) {
    const summary = String(t.summary).replace(/\|/gu, '\\|');
    lines.push(`| ${t.zone} | \`${t.id}\` | \`${t.yarn}\` | ${t.doc} | ${summary} |`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} repoRoot
 * @param {string} toolId
 * @param {{ maxLines?: number }} [opts]
 */
export function readToolDoc(repoRoot, toolId, opts = {}) {
  const maxLines = opts.maxLines ?? 40;
  const { catalog, manifest, problems } = loadWorkshopTooling(repoRoot);
  if (problems.length) return { ok: false, error: problems.join('; ') };
  const { tools, problems: vp } = validateWorkshopCatalog(catalog, manifest, repoRoot);
  if (vp.length) return { ok: false, error: vp.join('; ') };
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) return { ok: false, error: `нет tool id «${toolId}»` };
  const abs = join(repoRoot, tool.doc);
  if (!existsSync(abs)) return { ok: false, tool, path: tool.doc, error: `файл не найден: ${tool.doc}` };
  const text = readFileSync(abs, 'utf8');
  const excerpt = text.split(/\r?\n/u).slice(0, maxLines).join('\n');
  return { ok: true, tool, path: tool.doc, excerpt };
}

/**
 * @param {string} repoRoot
 * @param {{ zone?: string }} [opts]
 */
export function inventoryWorkshopTools(repoRoot, opts = {}) {
  const { catalog, manifest, problems: loadProblems } = loadWorkshopTooling(repoRoot);
  if (loadProblems.length) {
    return { ok: false, tools: [], problems: loadProblems, warnings: [], table: '' };
  }
  const { tools: all, problems, warnings } = validateWorkshopCatalog(catalog, manifest, repoRoot);
  if (opts.zone && !ZONES.has(opts.zone)) {
    return {
      ok: false,
      tools: [],
      problems: [`--zone «${opts.zone}» вне workshop|contract|neighbor`],
      warnings,
      table: '',
    };
  }
  const tools = filterTools(all, opts);
  return {
    ok: problems.length === 0,
    tools,
    problems,
    warnings,
    table: renderToolsTable(tools),
    kit: catalog.kit ?? manifest.kit ?? null,
  };
}

export { CATALOG_REL, MANIFEST_REL, DOMAIN_VERBS, ZONES };
