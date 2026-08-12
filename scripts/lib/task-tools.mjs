/**
 * task-tools — инвентарь мастерской docs/tasks (catalog + manifest).
 * Read-only; без сети. Канон: docs/tasks/WORKSHOP.md · kits/tasks-master.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CATALOG_REL = 'docs/tasks/workshop.catalog.json';
const MANIFEST_REL = 'docs/tasks/workshop.manifest.json';
const DECISION_VERBS = ['inspectElement', 'list', 'board', 'bookkeeping', 'reviewing'];
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

    // РОД declined (слово владельца 11.08, карточка tw-declared-verbs-honest-no):
    // глагол был объявлен и СНЯТ — движка нет и не будет. Такая запись живёт в
    // каталоге намеренно (пустой каталог читается как приглашение завести
    // заново), поэтому требовать у неё yarn/script нельзя: иначе честный отказ
    // сам становится дефектом описи. Требуется обратное — чтобы движка НЕ было
    // и чтобы отказ был адресуем.
    const declined = t.state === 'declined';
    if (declined) {
      if (t.yarn != null || t.script != null) {
        problems.push(`tool ${t.id}: declined, но движок объявлен — снятый глагол не зовут`);
      }
      if (typeof t.declinedRef !== 'string' || !t.declinedRef.trim()) {
        problems.push(`tool ${t.id}: declined без declinedRef — отказ обязан быть адресуем (docs/tasks/declined-verbs.json)`);
      }
    } else if (typeof t.yarn !== 'string' || !t.yarn.trim()) {
      problems.push(`tool ${t.id}: нет yarn`);
    }
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
    if (scriptRel && t.zone !== 'neighbor') {
      if (!existsSync(join(repoRoot, scriptRel))) {
        warnings.push(`tool ${t.id}: движок отсутствует (${scriptRel})`);
      }
    }
    if (typeof t.doc === 'string' && t.doc && !existsSync(join(repoRoot, t.doc))) {
      warnings.push(`tool ${t.id}: нет doc ${t.doc}`);
    }
  }

  const verbs = manifest?.verbs ?? {};
  for (const v of DECISION_VERBS) {
    const addr = verbs[v];
    if (typeof addr === 'string' && addr.trim()) {
      if (!byVerb.has(v)) problems.push(`manifest verbs.${v} есть, в catalog нет`);
    }
  }

  const kit = typeof catalog?.kit === 'string' ? catalog.kit : manifest?.kit;
  if (typeof kit === 'string' && kit.trim()) {
    const kitManifest = join(repoRoot, kit, 'MANIFEST.json');
    if (!existsSync(kitManifest)) problems.push(`kit ${kit}: нет MANIFEST.json`);
  } else if (manifest?.kit !== null) {
    warnings.push('kit не объявлен в catalog/manifest');
  }

  return { tools, problems, warnings };
}

/** @param {string} yarn */
function yarnToScriptGuess(yarn) {
  if (typeof yarn !== 'string') return null;
  // "yarn task:inspect" — script path only when catalog.script set; guess for package.json aliases
  const m = yarn.match(/^yarn\s+(\S+)/u);
  if (!m) return null;
  const alias = m[1];
  const map = {
    'task:inspect': 'scripts/task-inspect.mjs',
    'task:list': 'scripts/task-list.mjs',
    'task:board': 'scripts/generate-active-tasks-board.mjs',
    'tasks:bookkeeping': 'scripts/tasks-bookkeeping.mjs',
    'tasks:reviewing': 'scripts/tasks-reviewing.mjs',
    'task:validate': 'scripts/task-validate.mjs',
    'task:invariants': 'scripts/task-invariants.mjs',
    'task:invariants:repair': 'scripts/task-invariants-repair.mjs',
    'one-shot:rank': 'scripts/one-shot-rank.mjs',
    'one-shot:trail': 'scripts/one-shot-trail.mjs',
    'task:tools': 'scripts/task-tools.mjs',
    'tasks:audit': 'scripts/tasks-audit.mjs',
    'tasks:decompose': 'scripts/tasks-decompose.mjs',
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
 * @returns {{ ok: boolean, tool?: object, path?: string, excerpt?: string, error?: string }}
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
 * Полный прогон инвентаря.
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

export { CATALOG_REL, MANIFEST_REL, DECISION_VERBS, ZONES };
