#!/usr/bin/env node
/**
 * Собирает канонический UserCase MVP microphone из golden `device-scenario` v0.9-functions:
 * branch JSON для каждого обработчика + embedded default document.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'docs/device-board-scripts');
const goldenPath = join(
  scriptsDir,
  'golden/usercase-mvp-microphone-v09-functions.document.json',
);
const outDir = join(scriptsDir, 'usercase-mvp-microphone');
const embeddedTsPath = join(
  root,
  'packages/device-board/src/graph/default-usercase-mvp-microphone.generated.ts',
);

const USERCASE_MVP_MICROPHONE_ID = 'usercase-mvp-microphone';

const BRANCH_TITLES = {
  onConnect: 'onConnect → GetJournal → journal1',
  initial: 'onStart → GetMicrophone → StartStreaming → StartRecording (fn-1)',
  main: 'onMainTick → gate → MakeTrack → reports → fn-3/fn-1 restart (v0.9-functions)',
  onStop: 'onStop → StopStreaming',
  onDisconnect: 'onDisconnect → invalidate journal1',
  alarm: 'onAlarmTick → stub (∞ only; MVP observation в main)',
};

const BRANCH_LABELS = {
  initial: 'On start',
  onConnect: 'onConnect',
  main: 'onMainTick',
  alarm: 'onAlarmTick',
  onStop: 'onStop',
  onDisconnect: 'onDisconnect',
};

const OUT_FILES = {
  onConnect: '01-onConnect.json',
  initial: '02-onStart.json',
  main: '03-onMainTick.json',
  alarm: '04-onAlarmTick.json',
  onStop: '05-onStop.json',
  onDisconnect: '06-onDisconnect.json',
};

const LEGACY_ROOT_FILES = {
  onConnect: 'device-scenario-microphone-onConnect.json',
  initial: 'device-scenario-microphone-initial.json',
  main: 'device-scenario-microphone-main-v08-policy-constructor.json',
  alarm: 'device-scenario-microphone-alarm.json',
  onStop: 'device-scenario-microphone-onStop.json',
  onDisconnect: 'device-scenario-microphone-onDisconnect.json',
};

const VALUE_VARIABLE_TYPES = new Set(['DateTime', 'Integer', 'String', 'Boolean', 'Number']);

function loadGoldenDocument() {
  return JSON.parse(readFileSync(goldenPath, 'utf8'));
}

function isReferenceVariableType(type) {
  return !VALUE_VARIABLE_TYPES.has(type);
}

function collectReferencedVariableIds(nodes) {
  const ids = new Set();
  for (const node of nodes) {
    if (node.nodeKind !== 'variable-get' && node.nodeKind !== 'variable-set') {
      continue;
    }
    if (typeof node.variableId === 'string') {
      ids.add(node.variableId);
    }
  }
  return [...ids];
}

function extractSubgraph(golden, branchKey) {
  const scenario = golden.scenario;
  switch (branchKey) {
    case 'initial':
      return scenario.initial;
    case 'onConnect':
      return scenario.onConnect;
    case 'main':
      return scenario.loops.main;
    case 'alarm':
      return scenario.loops.alarm;
    case 'onStop':
      return scenario.triggers.onStop;
    case 'onDisconnect':
      return scenario.triggers.onDisconnect;
    default:
      throw new Error(`Unknown branch: ${branchKey}`);
  }
}

function buildBranchExport(golden, branchKey) {
  const subgraph = extractSubgraph(golden, branchKey);
  const variables = golden.scenario.variables ?? [];
  const referencedVariableIds = collectReferencedVariableIds(subgraph.nodes);
  const referenceVariableSlots = referencedVariableIds
    .map((exportVariableId) => variables.find((variable) => variable.id === exportVariableId))
    .filter((variable) => variable !== undefined && isReferenceVariableType(variable.type))
    .map((variable) => ({
      exportVariableId: variable.id,
      type: variable.type,
      nameHint: variable.name,
    }));

  return {
    exportKind: 'branch-scenario',
    branch: branchKey,
    branchLabel: BRANCH_LABELS[branchKey],
    scenarioTitle: `UserCase MVP microphone: ${BRANCH_TITLES[branchKey]}`,
    userCaseId: USERCASE_MVP_MICROPHONE_ID,
    userCaseBranch: branchKey,
    deviceKind: golden.deviceKind,
    subgraph,
    variables: variables.filter((variable) => !isReferenceVariableType(variable.type)),
    referenceVariableSlots,
    referencedVariableIds,
    exportedAt: new Date().toISOString(),
  };
}

function buildEmbeddedDocument(golden) {
  const exportedAt = new Date().toISOString();
  return {
    ...golden,
    meta: {
      title: golden.meta?.title ?? 'UserCase MVP microphone (default)',
      exportedAt,
    },
  };
}

function snapToGrid(value) {
  return Math.round(value / 8) * 8;
}

function snapSubgraphPositions(subgraph) {
  return {
    ...subgraph,
    nodes: subgraph.nodes.map((node) => ({
      ...node,
      position: {
        x: snapToGrid(node.position.x),
        y: snapToGrid(node.position.y),
      },
    })),
  };
}

function snapDocumentPositions(document) {
  const scenario = document.scenario;
  return {
    ...document,
    scenario: {
      ...scenario,
      initial: snapSubgraphPositions(scenario.initial),
      onConnect: snapSubgraphPositions(scenario.onConnect),
      loops: {
        main: snapSubgraphPositions(scenario.loops.main),
        alarm: snapSubgraphPositions(scenario.loops.alarm),
      },
      triggers: {
        ...scenario.triggers,
        onStop: snapSubgraphPositions(scenario.triggers.onStop),
        onDisconnect: snapSubgraphPositions(scenario.triggers.onDisconnect),
      },
      functions: (scenario.functions ?? []).map((fn) => snapSubgraphPositions(fn)),
    },
  };
}

function writeJson(path, doc) {
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

function writeEmbeddedDocument(document) {
  const body = JSON.stringify(document, null, 2);
  writeFileSync(
    embeddedTsPath,
    `/**
 * AUTO-GENERATED by scripts/build-usercase-mvp-microphone.mjs — do not edit.
 * Default device-scenario for first-time microphone users (v0.9-functions).
 */
import type { DeviceScenarioDocument } from '@membrana/core';

export const DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT = ${body} as unknown as DeviceScenarioDocument;
`,
    'utf8',
  );
}

mkdirSync(outDir, { recursive: true });

const golden = snapDocumentPositions(loadGoldenDocument());

const manifest = {
  id: USERCASE_MVP_MICROPHONE_ID,
  title: 'MVP microphone: realtime observation + recording gate v0.9-functions',
  description:
    'Bundled reference UserCase: six handlers, user functions StartRecording/GetAudioStream, recording gate, MakeFftTrendsPolicy, journal trends-fft.',
  deviceKind: 'microphone',
  tier: 'bundled',
  layoutProfile: 'exec-lr-v1',
  minEditorFeatures: ['align', 'groups', 'functions', 'exec-layout'],
  canon: 'DEVICE_BOARD_CONCEPT.md §16.5.1',
  goldenDocument: 'docs/device-board-scripts/golden/usercase-mvp-microphone-v09-functions.document.json',
  embeddedDocument: 'packages/device-board/src/graph/default-usercase-mvp-microphone.generated.ts',
  importOrder: [
    '02-onStart.json',
    '01-onConnect.json',
    '03-onMainTick.json',
    '04-onAlarmTick.json',
    '05-onStop.json',
    '06-onDisconnect.json',
  ],
  branches: {},
};

const branchKeys = ['onConnect', 'initial', 'main', 'onStop', 'onDisconnect', 'alarm'];

for (const branchKey of branchKeys) {
  const doc = buildBranchExport(golden, branchKey);
  writeJson(join(outDir, OUT_FILES[branchKey]), doc);
  writeJson(join(scriptsDir, LEGACY_ROOT_FILES[branchKey]), doc);
  manifest.branches[branchKey] = {
    bundleFile: OUT_FILES[branchKey],
    legacyFile: LEGACY_ROOT_FILES[branchKey],
    nodeCount: doc.subgraph.nodes.length,
    edgeCount: doc.subgraph.edges.length,
  };
}

writeJson(join(outDir, 'manifest.json'), manifest);
writeEmbeddedDocument(buildEmbeddedDocument(golden));

console.log(`Built ${USERCASE_MVP_MICROPHONE_ID} from golden → ${outDir}`);
console.log(`Embedded default document → ${embeddedTsPath}`);
