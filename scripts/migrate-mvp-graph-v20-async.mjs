#!/usr/bin/env node
/**
 * One-shot (repeatable) transform: v0.9-functions golden → v2.0-async gate topology.
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP5
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(
  root,
  'docs/device-board-scripts/golden/usercase-mvp-microphone-v09-functions.document.json',
);
const outPath = join(
  root,
  'docs/device-board-scripts/golden/usercase-mvp-microphone-v20-async.document.json',
);

const GATE = 'node-is-recording-window-full-mqmo40ie-32';
const STOP = 'node-stop-recording-mqmod4yf-35';
const MAKE_TRACK = 'node-make-track-mqmcipn5-28';
const FLUSH = 'node-flush-spectral-analyser-mqs6tcs6-172';
const FN3 = 'fn-3-block-2';
const FN1 = 'fn-1-block';
const MAKE_REPORT_TRACK = 'node-make-report-from-track-mqs54kgw-177';
const PUBLISH_TRENDS = 'node-publish-report-mqma49xv-35';
const PUBLISH_DRONE = 'board-mqs5v7w1-9c8xw62e';
const INFINITY = 'main-infinity';

const SEQUENCE = 'node-sequence-gate-v20-async';
const START_ASYNC = 'node-start-async-job-v20';
const ON_RESOLVED = 'node-on-async-resolved-v20';

const EVENT_OUT = 'event-out';

function edgeKey(edge) {
  return `${edge.kind}|${edge.source}|${edge.sourceHandle ?? ''}|${edge.target}|${edge.targetHandle ?? ''}`;
}

function shouldRemoveEdge(edge) {
  const keys = new Set(
    [
      [GATE, 'exec-true-out', STOP, 'exec-in'],
      [STOP, 'exec-out', MAKE_TRACK, 'exec-in'],
      [MAKE_TRACK, 'exec-out', FN3, 'exec-in'],
      [PUBLISH_TRENDS, 'exec-out', MAKE_REPORT_TRACK, 'exec-in'],
      [MAKE_REPORT_TRACK, 'exec-out', PUBLISH_DRONE, 'exec-in'],
      [FN1, 'exec-out', FLUSH, 'exec-in'],
      [PUBLISH_DRONE, 'exec-out', INFINITY, 'exec-in'],
    ].map(([source, sourceHandle, target, targetHandle]) =>
      edgeKey({ kind: 'exec', source, sourceHandle, target, targetHandle }),
    ),
  );
  return keys.has(edgeKey(edge));
}

function buildNewEdges() {
  return [
    {
      kind: 'exec',
      source: GATE,
      sourceHandle: 'exec-true-out',
      target: SEQUENCE,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: SEQUENCE,
      sourceHandle: 'then-0',
      target: STOP,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: SEQUENCE,
      sourceHandle: 'then-1',
      target: MAKE_TRACK,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: MAKE_TRACK,
      sourceHandle: 'exec-out',
      target: START_ASYNC,
      targetHandle: 'exec-in',
    },
    {
      kind: 'data',
      source: MAKE_TRACK,
      sourceHandle: 'track',
      target: START_ASYNC,
      targetHandle: 'track',
      dataType: 'TrackRef',
    },
    {
      kind: 'data',
      source: START_ASYNC,
      sourceHandle: 'promise',
      target: ON_RESOLVED,
      targetHandle: 'promise',
      dataType: 'PromiseRef',
    },
    {
      kind: 'event',
      source: ON_RESOLVED,
      sourceHandle: EVENT_OUT,
      target: MAKE_REPORT_TRACK,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: SEQUENCE,
      sourceHandle: 'then-2',
      target: FLUSH,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: SEQUENCE,
      sourceHandle: 'then-3',
      target: FN3,
      targetHandle: 'exec-in',
    },
    {
      kind: 'exec',
      source: SEQUENCE,
      sourceHandle: 'exec-out',
      target: INFINITY,
      targetHandle: 'exec-in',
    },
  ];
}

function buildNewNodes() {
  return [
    {
      id: SEQUENCE,
      label: 'Sequence',
      nodeKind: 'sequence',
      blockKind: 'custom',
      position: { x: 120, y: -360 },
      sequenceConfig: { thenCount: 4, parallelAsync: false, latentThen: true },
    },
    {
      id: START_ASYNC,
      label: 'StartAsyncJob',
      nodeKind: 'start-async-job',
      blockKind: 'custom',
      position: { x: 620, y: -540 },
      asyncJobConfig: { jobKind: 'track-upload' },
    },
    {
      id: ON_RESOLVED,
      label: 'OnAsyncResolved',
      nodeKind: 'on-async-resolved',
      blockKind: 'custom',
      position: { x: 880, y: -460 },
    },
  ];
}

function updateGroups(groups) {
  return groups.map((group) => {
    if (group.id === 'group-4') {
      return {
        ...group,
        title: 'fn-UploadPipeline',
        nodeIds: [
          SEQUENCE,
          STOP,
          MAKE_TRACK,
          START_ASYNC,
          ON_RESOLVED,
          MAKE_REPORT_TRACK,
          PUBLISH_DRONE,
        ],
        description:
          'Gate-true: StopRecording → MakeTrack → StartAsyncJob (latent); detached on-async-resolved → drone report.',
      };
    }
    if (group.id === 'group-7') {
      return {
        ...group,
        title: 'fn-TrendsPublish',
        description: 'Sequence Then-2: FlushSpectralAnalyser → trends analysis → PublishReport (sync).',
      };
    }
    if (group.id === 'group-6') {
      return {
        ...group,
        title: 'Публикация отчетов',
        nodeIds: [
          'node-make-report-from-analysis-mqma356z-34',
          PUBLISH_TRENDS,
        ],
        description: 'Trends report on hot path; drone report — detached via on-async-resolved.',
      };
    }
    if (group.id === 'group-8') {
      return {
        ...group,
        description: 'Sequence Then-3: GetAudioStream (fn-3) → StartRecording (fn-1).',
      };
    }
    return group;
  });
}

const LATENT_ASYNC_NODE_IDS = new Set([
  STOP,
  MAKE_TRACK,
  START_ASYNC,
  FLUSH,
  'node-make-fft-trends-analysis-mqs6vdme-174',
  'node-make-report-from-analysis-mqma356z-34',
  PUBLISH_TRENDS,
  FN3,
  FN1,
]);

function markLatentBranchSupportsAsync(nodes) {
  return nodes.map((node) =>
    LATENT_ASYNC_NODE_IDS.has(node.id) ? { ...node, supportsAsync: true } : node,
  );
}

function migrate(document) {
  const main = document.scenario.loops.main;
  const existingKeys = new Set(main.edges.map(edgeKey));
  const filteredEdges = main.edges.filter((edge) => !shouldRemoveEdge(edge));
  const newEdges = buildNewEdges().filter((edge) => !existingKeys.has(edgeKey(edge)));

  const existingNodeIds = new Set(main.nodes.map((node) => node.id));
  const newNodes = buildNewNodes().filter((node) => !existingNodeIds.has(node.id));

  return {
    ...document,
    meta: {
      ...document.meta,
      title: 'UserCase MVP microphone (v2.0-async)',
      bundledGraphVersion: 'v2.0-async',
    },
    scenario: {
      ...document.scenario,
      loops: {
        ...document.scenario.loops,
        main: {
          ...main,
          nodes: markLatentBranchSupportsAsync([...main.nodes, ...newNodes]),
          edges: [...filteredEdges, ...newEdges],
        },
      },
      groups: updateGroups(document.scenario.groups ?? []),
    },
  };
}

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const migrated = migrate(source);
writeFileSync(outPath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
console.log(
  `main: ${migrated.scenario.loops.main.nodes.length} nodes, ${migrated.scenario.loops.main.edges.length} edges`,
);
