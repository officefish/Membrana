import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'docs/device-board-scripts/device-scenario-microphone-main-v07.json');
const dest = join(
  root,
  'docs/device-board-scripts/device-scenario-microphone-main-v08-policy-constructor.json',
);

const doc = JSON.parse(readFileSync(src, 'utf8'));

doc.scenarioTitle = 'v0.8: MakeRecordingPolicy → recording gate (A3/A4 smoke)';
doc.exportedAt = new Date().toISOString();

const policyNodeId = 'node-make-recording-policy-v08-1';
const oldVarGetId = 'node-variable-get-var-RecordingPolicy-mqv07-38';
const startId = 'node-start-recording-mqv07-36';
const makeTrackId = 'node-make-track-mqmcipn5-28';

doc.subgraph.nodes = doc.subgraph.nodes.filter((n) => n.id !== oldVarGetId);
doc.subgraph.nodes.push({
  id: policyNodeId,
  blockKind: 'custom',
  position: { x: 3580.6926855916026, y: 420.85315683106893 },
  label: 'MakeRecordingPolicy',
  nodeKind: 'make-recording-policy',
  recordingPolicy: { windowSec: 5, captureFormat: 'wav' },
});

doc.subgraph.edges = doc.subgraph.edges.filter(
  (e) => e.source !== oldVarGetId && e.target !== oldVarGetId,
);

const makeTrackToStartIdx = doc.subgraph.edges.findIndex(
  (e) => e.source === makeTrackId && e.target === startId && e.kind === 'exec',
);
if (makeTrackToStartIdx >= 0) {
  doc.subgraph.edges[makeTrackToStartIdx] = {
    source: makeTrackId,
    sourceHandle: 'exec-out',
    target: policyNodeId,
    targetHandle: 'exec-in',
    kind: 'exec',
  };
}

doc.subgraph.edges.push(
  {
    source: policyNodeId,
    sourceHandle: 'exec-out',
    target: startId,
    targetHandle: 'exec-in',
    kind: 'exec',
  },
  {
    source: policyNodeId,
    sourceHandle: 'policy',
    target: startId,
    targetHandle: 'policy',
    kind: 'data',
    dataType: 'RecordingPolicy',
  },
);

doc.variables = doc.variables.filter((v) => v.id !== 'var-RecordingPolicy-mqmo0y2f-7');
doc.referencedVariableIds = doc.referencedVariableIds.filter(
  (id) => id !== 'var-RecordingPolicy-mqmo0y2f-7',
);

writeFileSync(dest, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
console.log('Wrote', dest);
