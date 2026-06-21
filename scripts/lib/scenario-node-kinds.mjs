import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoRootFromScripts } from './usercase-paths.mjs';

/** @type {readonly string[] | null} */
let cachedKinds = null;

/** @returns {readonly string[]} */
export function loadScenarioNodeKinds() {
  if (cachedKinds !== null) {
    return cachedKinds;
  }

  const path = join(
    repoRootFromScripts(),
    'packages/core/src/contracts/device-board/scenario-node-kind.ts',
  );
  const text = readFileSync(path, 'utf8');
  const match = text.match(/export const SCENARIO_NODE_KINDS = \[([\s\S]*?)\] as const;/);
  if (match === null) {
    throw new Error(`Could not parse SCENARIO_NODE_KINDS from ${path}`);
  }

  const kinds = [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
  if (kinds.length === 0) {
    throw new Error(`SCENARIO_NODE_KINDS is empty in ${path}`);
  }

  cachedKinds = kinds;
  return cachedKinds;
}
