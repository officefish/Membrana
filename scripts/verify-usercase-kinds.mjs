#!/usr/bin/env node
/**
 * Verifies nodeKind values in a UserCase embedded document against @membrana/core SCENARIO_NODE_KINDS.
 *
 * Usage: yarn usercase:verify-kinds <id>
 * Example: yarn usercase:verify-kinds usercase-mvp-microphone
 */
import { loadUserCaseManifest } from './lib/usercase-manifest.mjs';
import {
  collectScenarioNodeKindsFromDocument,
  loadEmbeddedDeviceScenarioDocument,
} from './lib/usercase-document.mjs';
import { loadScenarioNodeKinds } from './lib/scenario-node-kinds.mjs';

function printHelp() {
  console.log(`Usage: yarn usercase:verify-kinds <usercase-id>

  <usercase-id>  e.g. usercase-mvp-microphone or mvp-microphone
`);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const rawId = args.find((arg) => !arg.startsWith('--'));
if (rawId === undefined) {
  console.error('Missing <usercase-id>');
  process.exit(1);
}

try {
  const manifest = loadUserCaseManifest(rawId);
  const document = loadEmbeddedDeviceScenarioDocument(manifest.embeddedDocument);
  const allowed = new Set(loadScenarioNodeKinds());
  const found = collectScenarioNodeKindsFromDocument(document);

  /** @type {Array<{ nodeKind: string, path: string }>} */
  const unknown = [];
  for (const entry of found) {
    if (!allowed.has(entry.nodeKind)) {
      unknown.push(entry);
    }
  }

  if (unknown.length > 0) {
    console.error(`usercase:verify-kinds FAILED for ${manifest.id}`);
    for (const entry of unknown) {
      console.error(`  unknown nodeKind "${entry.nodeKind}" at ${entry.path}`);
    }
    process.exit(1);
  }

  console.log(`usercase:verify-kinds OK: ${manifest.id} (${found.length} nodes)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
