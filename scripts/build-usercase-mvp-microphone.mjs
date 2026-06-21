#!/usr/bin/env node
/**
 * Собирает канонический UserCase MVP microphone: JSON для каждого обработчика/лупа
 * + embedded default document для @membrana/device-board.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'docs/device-board-scripts');
const outDir = join(scriptsDir, 'usercase-mvp-microphone');
const embeddedTsPath = join(
  root,
  'packages/device-board/src/graph/default-usercase-mvp-microphone.generated.ts',
);

const USERCASE_MVP_MICROPHONE_ID = 'usercase-mvp-microphone';

const BRANCH_SOURCES = {
  onConnect: 'device-scenario-microphone-onConnect.json',
  initial: 'device-scenario-microphone-initial.json',
  main: 'device-scenario-microphone-main-v08-policy-constructor.json',
  onStop: 'device-scenario-microphone-onStop.json',
  onDisconnect: 'device-scenario-microphone-onDisconnect.json',
};

const BRANCH_TITLES = {
  onConnect: 'onConnect → GetJournal → journal1',
  initial: 'onStart → GetMicrophone → StartStreaming → journal bootstrap',
  main: 'onMainTick → MakeRecordingPolicy + MakeFftTrendsPolicy → gate §16.5',
  onStop: 'onStop → StopStreaming',
  onDisconnect: 'onDisconnect → invalidate journal1',
  alarm: 'onAlarmTick → stub (∞ only; MVP observation в main)',
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

function loadJson(name) {
  return JSON.parse(readFileSync(join(scriptsDir, name), 'utf8'));
}

function stampBranch(doc, branch) {
  return {
    ...doc,
    scenarioTitle: `UserCase MVP microphone: ${BRANCH_TITLES[branch]}`,
    userCaseId: USERCASE_MVP_MICROPHONE_ID,
    userCaseBranch: branch,
    exportedAt: new Date().toISOString(),
  };
}

function buildAlarmStub() {
  return {
    exportKind: 'branch-scenario',
    branch: 'alarm',
    branchLabel: 'onAlarmTick',
    scenarioTitle: `UserCase MVP microphone: ${BRANCH_TITLES.alarm}`,
    userCaseId: USERCASE_MVP_MICROPHONE_ID,
    userCaseBranch: 'alarm',
    deviceKind: 'microphone',
    subgraph: {
      entry: 'alarm-on-tick',
      nodes: [
        {
          id: 'alarm-on-tick',
          blockKind: 'custom',
          position: { x: 40, y: 180 },
          label: 'onTick',
          nodeKind: 'event',
          system: true,
          eventVariant: 'loopTick',
        },
        {
          id: 'alarm-infinity',
          blockKind: 'custom',
          position: { x: 360, y: 180 },
          label: '∞',
          nodeKind: 'loop-repeat',
          system: true,
        },
      ],
      edges: [
        {
          source: 'alarm-on-tick',
          sourceHandle: 'exec-out',
          target: 'alarm-infinity',
          targetHandle: 'exec-in',
          kind: 'exec',
        },
      ],
    },
    variables: [],
    referenceVariableSlots: [],
    referencedVariableIds: [],
    exportedAt: new Date().toISOString(),
  };
}

function writeJson(path, doc) {
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

function mergeMvpVariables(branchDocs) {
  const map = new Map();
  for (const doc of branchDocs) {
    for (const variable of doc.variables ?? []) {
      map.set(variable.id, variable);
    }
    for (const slot of doc.referenceVariableSlots ?? []) {
      if (!map.has(slot.exportVariableId)) {
        map.set(slot.exportVariableId, {
          id: slot.exportVariableId,
          name: slot.nameHint,
          type: slot.type,
          value: null,
        });
      }
    }
  }
  return [...map.values()];
}

function buildDefaultDeviceScenarioDocument(branchByKey) {
  const exportedAt = new Date().toISOString();
  return {
    version: 2,
    kind: 'device-scenario',
    deviceKind: 'microphone',
    meta: {
      title: 'UserCase MVP microphone (default)',
      exportedAt,
    },
    signalGraph: { nodes: [], edges: [] },
    scenario: {
      initial: branchByKey.initial.subgraph,
      onConnect: branchByKey.onConnect.subgraph,
      loops: {
        main: branchByKey.main.subgraph,
        alarm: branchByKey.alarm.subgraph,
      },
      triggers: {
        onStop: branchByKey.onStop.subgraph,
        onDisconnect: branchByKey.onDisconnect.subgraph,
        custom: [],
      },
      functions: [],
      scheduled: [],
      variables: mergeMvpVariables(Object.values(branchByKey)),
    },
  };
}

function writeEmbeddedDocument(document) {
  const body = JSON.stringify(document, null, 2);
  writeFileSync(
    embeddedTsPath,
    `/**
 * AUTO-GENERATED by scripts/build-usercase-mvp-microphone.mjs — do not edit.
 * Default device-scenario for first-time microphone users.
 */
import type { DeviceScenarioDocument } from '@membrana/core';

export const DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT = ${body} as unknown as DeviceScenarioDocument;
`,
    'utf8',
  );
}

mkdirSync(outDir, { recursive: true });

const manifest = {
  id: USERCASE_MVP_MICROPHONE_ID,
  title: 'MVP microphone: realtime observation + recording gate v0.8',
  description:
    'Bundled reference UserCase: six handlers, recording gate v0.8, MakeRecordingPolicy + MakeFftTrendsPolicy, journal trends-fft.',
  deviceKind: 'microphone',
  tier: 'bundled',
  layoutProfile: 'exec-lr-v1',
  minEditorFeatures: ['align', 'groups', 'functions', 'exec-layout'],
  canon: 'DEVICE_BOARD_CONCEPT.md §16.5',
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

const branchByKey = {};

for (const [branch, src] of Object.entries(BRANCH_SOURCES)) {
  const doc = stampBranch(loadJson(src), branch);
  branchByKey[branch] = doc;
  writeJson(join(outDir, OUT_FILES[branch]), doc);
  writeJson(join(scriptsDir, LEGACY_ROOT_FILES[branch]), doc);
  manifest.branches[branch] = {
    bundleFile: OUT_FILES[branch],
    legacyFile: LEGACY_ROOT_FILES[branch],
    nodeCount: doc.subgraph.nodes.length,
    edgeCount: doc.subgraph.edges.length,
  };
}

const alarmDoc = buildAlarmStub();
branchByKey.alarm = alarmDoc;
writeJson(join(outDir, OUT_FILES.alarm), alarmDoc);
writeJson(join(scriptsDir, LEGACY_ROOT_FILES.alarm), alarmDoc);
manifest.branches.alarm = {
  bundleFile: OUT_FILES.alarm,
  legacyFile: LEGACY_ROOT_FILES.alarm,
  nodeCount: alarmDoc.subgraph.nodes.length,
  edgeCount: alarmDoc.subgraph.edges.length,
};

writeJson(join(outDir, 'manifest.json'), manifest);
writeEmbeddedDocument(buildDefaultDeviceScenarioDocument(branchByKey));

console.log(`Built ${USERCASE_MVP_MICROPHONE_ID} → ${outDir}`);
console.log(`Embedded default document → ${embeddedTsPath}`);
