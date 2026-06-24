#!/usr/bin/env node
/**
 * Hydrates embedded UserCase document and runs validatePreRun (editor gate).
 *
 * Usage: yarn usercase:verify-prerun <usercase-id>
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadEmbeddedDeviceScenarioDocument } from './lib/usercase-document.mjs';
import { loadUserCaseManifest } from './lib/usercase-manifest.mjs';
import { repoRootFromScripts } from './lib/usercase-paths.mjs';

function printHelp() {
  console.log(`Usage: yarn usercase:verify-prerun <usercase-id>

Examples:
  yarn usercase:verify-prerun usercase-mvp-microphone
  yarn usercase:verify-prerun usercase-mvp-microphone-beta
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

const repoRoot = repoRootFromScripts();

if (process.env.USERCASE_VERIFY_SKIP_BUILD !== '1') {
  const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const build = spawnSync(yarnCmd, ['workspace', '@membrana/device-board', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

try {
  const manifest = loadUserCaseManifest(rawId, repoRoot);
  const document = loadEmbeddedDeviceScenarioDocument(manifest.embeddedDocument, repoRoot);
  const graphUrl = pathToFileURL(
    join(repoRoot, 'packages/device-board/dist/graph/index.js'),
  ).href;
  const graph = await import(graphUrl);

  const hydrated = graph.hydrateBoardFromDocument(document);
  const runtimeUrl = pathToFileURL(
    join(repoRoot, 'packages/device-board/dist/runtime/index.js'),
  ).href;
  const runtime = await import(runtimeUrl);
  const documentValidation = runtime.validateUserCaseDocument(document);
  if (!runtime.isUserCaseValidationValid(documentValidation.errors)) {
    console.error(`usercase:verify-prerun FAILED (document validators) for ${manifest.id}`);
    console.error(JSON.stringify(documentValidation.errors, null, 2));
    process.exit(1);
  }

  const issues = graph.validatePreRun({
    deviceKind: hydrated.deviceKind,
    signalNodes: hydrated.signalNodes,
    signalEdges: hydrated.signalEdges,
    scenarioInitialNodes: hydrated.scenarioInitialNodes,
    scenarioInitialEdges: hydrated.scenarioInitialEdges,
    scenarioOnConnectNodes: hydrated.scenarioOnConnectNodes,
    scenarioOnConnectEdges: hydrated.scenarioOnConnectEdges,
    scenarioMainNodes: hydrated.scenarioMainNodes,
    scenarioMainEdges: hydrated.scenarioMainEdges,
    scenarioAlarmNodes: hydrated.scenarioAlarmNodes,
    scenarioAlarmEdges: hydrated.scenarioAlarmEdges,
    scenarioOnStopNodes: hydrated.scenarioOnStopNodes,
    scenarioOnStopEdges: hydrated.scenarioOnStopEdges,
    scenarioOnDisconnectNodes: hydrated.scenarioOnDisconnectNodes,
    scenarioOnDisconnectEdges: hydrated.scenarioOnDisconnectEdges,
    scenarioFunctions: graph.hydratedFunctionInputs(hydrated),
  });

  if (!graph.isPreRunValid(issues)) {
    console.error(`usercase:verify-prerun FAILED for ${manifest.id}`);
    console.error(JSON.stringify(issues, null, 2));
    process.exit(1);
  }

  console.log(`usercase:verify-prerun OK: ${manifest.id}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
