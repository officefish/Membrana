import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRootFromScripts } from './usercase-paths.mjs';

/**
 * @param {string} embeddedRelativePath
 * @param {string} [repoRoot]
 * @returns {Record<string, unknown>}
 */
export function loadEmbeddedDeviceScenarioDocument(
  embeddedRelativePath,
  repoRoot = repoRootFromScripts(),
) {
  const abs = join(repoRoot, embeddedRelativePath);
  const text = readFileSync(abs, 'utf8');
  const match = text.match(
    /export const \w+ = (\{[\s\S]*\}) as unknown as DeviceScenarioDocument;/,
  );
  if (match === null) {
    throw new Error(`Could not parse embedded DeviceScenarioDocument from ${abs}`);
  }
  return JSON.parse(match[1]);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {readonly unknown[]} nodes
 * @param {string} path
 * @returns {Array<{ nodeKind: string, path: string }>}
 */
function collectNodesFromList(nodes, path) {
  /** @type {Array<{ nodeKind: string, path: string }>} */
  const out = [];
  if (!Array.isArray(nodes)) {
    return out;
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isRecord(node)) {
      continue;
    }
    const nodeKind = node['nodeKind'];
    if (typeof nodeKind === 'string') {
      out.push({ nodeKind, path: `${path}[${index}]` });
    }
  }
  return out;
}

/**
 * @param {unknown} subgraph
 * @param {string} path
 */
function collectNodesFromSubgraph(subgraph, path) {
  if (!isRecord(subgraph)) {
    return [];
  }
  return collectNodesFromList(subgraph['nodes'] ?? [], `${path}.nodes`);
}

/**
 * Collects all scenario nodeKind values from a device-scenario document.
 * @param {Record<string, unknown>} document
 */
export function collectScenarioNodeKindsFromDocument(document) {
  /** @type {Array<{ nodeKind: string, path: string }>} */
  const found = [];

  const scenario = document['scenario'];
  if (!isRecord(scenario)) {
    return found;
  }

  found.push(...collectNodesFromSubgraph(scenario['initial'], 'scenario.initial'));
  found.push(...collectNodesFromSubgraph(scenario['onConnect'], 'scenario.onConnect'));

  const loops = scenario['loops'];
  if (isRecord(loops)) {
    found.push(...collectNodesFromSubgraph(loops['main'], 'scenario.loops.main'));
    found.push(...collectNodesFromSubgraph(loops['alarm'], 'scenario.loops.alarm'));
  }

  const triggers = scenario['triggers'];
  if (isRecord(triggers)) {
    found.push(...collectNodesFromSubgraph(triggers['onStop'], 'scenario.triggers.onStop'));
    found.push(...collectNodesFromSubgraph(triggers['onDisconnect'], 'scenario.triggers.onDisconnect'));
    const custom = triggers['custom'];
    if (Array.isArray(custom)) {
      for (let index = 0; index < custom.length; index += 1) {
        found.push(
          ...collectNodesFromSubgraph(custom[index], `scenario.triggers.custom[${index}]`),
        );
      }
    }
  }

  const functions = scenario['functions'];
  if (Array.isArray(functions)) {
    for (let index = 0; index < functions.length; index += 1) {
      const fn = functions[index];
      if (!isRecord(fn)) {
        continue;
      }
      found.push(...collectNodesFromSubgraph(fn['subgraph'], `scenario.functions[${index}].subgraph`));
    }
  }

  const scheduled = scenario['scheduled'];
  if (Array.isArray(scheduled)) {
    for (let index = 0; index < scheduled.length; index += 1) {
      found.push(...collectNodesFromSubgraph(scheduled[index], `scenario.scheduled[${index}]`));
    }
  }

  return found;
}
