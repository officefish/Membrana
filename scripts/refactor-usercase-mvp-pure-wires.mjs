#!/usr/bin/env node
/**
 * UserCase MVP: убрать лишние variables, протянуть refs из provider-узлов, pure getters.
 * Запуск: node scripts/refactor-usercase-mvp-pure-wires.mjs && node scripts/build-usercase-mvp-microphone.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = join(root, 'docs/device-board-scripts');

const MIC_ID = '0928f245e15f012de6b0d9e32f70efd5e6bc3957af6381c2b28da7536d150c04';
const JOURNAL_VAR_ID = 'var-JournalRef-mqm9dl4a-6';

const CANONICAL = {
  onConnect: 'device-scenario-microphone-onConnect.json',
  initial: 'device-scenario-microphone-initial.json',
  main: 'device-scenario-microphone-main-v08-policy-constructor.json',
  onStop: 'device-scenario-microphone-onStop.json',
  onDisconnect: 'device-scenario-microphone-onDisconnect.json',
};

function load(name) {
  return JSON.parse(readFileSync(join(scriptsDir, name), 'utf8'));
}

function save(name, doc) {
  writeFileSync(join(scriptsDir, name), `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

function removeNodes(subgraph, ids) {
  const drop = new Set(ids);
  subgraph.nodes = subgraph.nodes.filter((n) => !drop.has(n.id));
  subgraph.edges = subgraph.edges.filter((e) => !drop.has(e.source) && !drop.has(e.target));
}

function addNode(subgraph, node) {
  if (!subgraph.nodes.some((n) => n.id === node.id)) {
    subgraph.nodes.push(node);
  }
}

function addEdge(subgraph, edge) {
  const key = `${edge.source}:${edge.sourceHandle ?? ''}:${edge.target}:${edge.targetHandle ?? ''}:${edge.kind}`;
  const exists = subgraph.edges.some(
    (e) =>
      `${e.source}:${e.sourceHandle ?? ''}:${e.target}:${e.targetHandle ?? ''}:${e.kind}` === key,
  );
  if (!exists) {
    subgraph.edges.push(edge);
  }
}

function remapEdges(subgraph, fromId, toId, handleMap = {}) {
  for (const edge of subgraph.edges) {
    if (edge.source === fromId) {
      edge.source = toId;
      if (handleMap[edge.sourceHandle]) {
        edge.sourceHandle = handleMap[edge.sourceHandle];
      }
    }
    if (edge.target === fromId) {
      edge.target = toId;
      if (handleMap[edge.targetHandle]) {
        edge.targetHandle = handleMap[edge.targetHandle];
      }
    }
  }
}

function markPureGetters(subgraph) {
  for (const node of subgraph.nodes) {
    if (node.nodeKind === 'variable-get') {
      node.pure = true;
    }
  }
}

/** Pure GetJournal: exec bypass — data-only pull, exec идёт мимо getter. */
function rewirePureGetJournalExec(subgraph) {
  const journalNodes = subgraph.nodes.filter((node) => node.nodeKind === 'get-journal');
  for (const journal of journalNodes) {
    if (journal.pure === false) {
      continue;
    }
    const execIn = subgraph.edges.find(
      (edge) => edge.kind === 'exec' && edge.target === journal.id && edge.targetHandle === 'exec-in',
    );
    const execOut = subgraph.edges.find(
      (edge) => edge.kind === 'exec' && edge.source === journal.id && edge.sourceHandle === 'exec-out',
    );
    subgraph.edges = subgraph.edges.filter(
      (edge) =>
        !(
          edge.kind === 'exec' &&
          (edge.target === journal.id || edge.source === journal.id)
        ),
    );
    if (execIn !== undefined && execOut !== undefined) {
      addEdge(subgraph, {
        source: execIn.source,
        sourceHandle: execIn.sourceHandle,
        target: execOut.target,
        targetHandle: execOut.targetHandle,
        kind: 'exec',
      });
    }
  }
}

function journalOnlyVariables() {
  return [
    {
      id: JOURNAL_VAR_ID,
      name: 'journal1',
      type: 'JournalRef',
      value: null,
    },
  ];
}

function finalizeBranchDoc(doc) {
  doc.variables = journalOnlyVariables();
  doc.referenceVariableSlots = [];
  markPureGetters(doc.subgraph);
  rewirePureGetJournalExec(doc.subgraph);
  return doc;
}

function refactorOnConnect(doc) {
  doc.referencedVariableIds = [JOURNAL_VAR_ID];
  return finalizeBranchDoc(doc);
}

function refactorOnStop(doc) {
  const sg = doc.subgraph;
  const oldMicGet = 'node-variable-get-var-MicrophoneRef-mqkpx2yg-2-mqm9o36j-11';
  const deviceGlobal = 'node-device-global-mvp-onstop-1';
  const getMic = 'node-get-microphone-mvp-onstop-1';

  removeNodes(sg, [oldMicGet]);
  addNode(sg, {
    id: deviceGlobal,
    blockKind: 'custom',
    position: { x: -120, y: 180 },
    label: 'GetDevice',
    nodeKind: 'device-global',
  });
  addNode(sg, {
    id: getMic,
    blockKind: 'custom',
    position: { x: 54, y: 249 },
    label: 'GetMicrophone',
    nodeKind: 'get-microphone',
    microphoneId: MIC_ID,
  });

  remapEdges(sg, oldMicGet, getMic, { value: 'microphone' });
  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: getMic,
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });

  doc.referencedVariableIds = [];
  return finalizeBranchDoc(doc);
}

function refactorOnDisconnect(doc) {
  doc.referencedVariableIds = [JOURNAL_VAR_ID];
  return finalizeBranchDoc(doc);
}

function refactorInitial(doc) {
  const sg = doc.subgraph;
  const removeIds = [
    'node-variable-set-var-DeviceRef-mqkpwruv-1-mqkpwt7s-11',
    'node-variable-set-var-MicrophoneRef-mqkpx2yg-2-mqkpx4kn-12',
    'node-variable-set-var-DateTime-mqkpyfxb-3-mqkpyoso-14',
    'node-variable-set-var-AudioStreamRef-mql3e818-5-mqm05ppc-8',
    'node-variable-get-var-MicrophoneRef-mqkpx2yg-2-mql55q86-25',
    'node-variable-get-var-JournalRef-mqm9dl4a-6-mqm9hzuj-9',
  ];
  removeNodes(sg, removeIds);

  const getJournalBootstrap = 'node-get-journal-mqm9j4wy-20';
  const getJournalValid = 'node-get-journal-mvp-initial-valid-1';
  const deviceGlobal = 'node-device-global-mqm9ip17-19';

  addNode(sg, {
    id: getJournalValid,
    blockKind: 'custom',
    position: { x: -1750, y: -242 },
    label: 'GetJournal',
    nodeKind: 'get-journal',
  });

  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: getJournalValid,
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: getJournalValid,
    sourceHandle: 'journal',
    target: 'node-is-valid-mqm9i48b-18',
    targetHandle: 'value',
    kind: 'data',
    dataType: 'JournalRef',
  });

  addEdge(sg, {
    source: 'initial-event',
    sourceHandle: 'device',
    target: 'node-get-microphone-mqkpxb3c-5',
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: 'node-get-microphone-mqkpxb3c-5',
    sourceHandle: 'microphone',
    target: 'node-start-streaming-mql556hh-49',
    targetHandle: 'microphone',
    kind: 'data',
    dataType: 'MicrophoneRef',
  });
  addEdge(sg, {
    source: 'initial-event',
    sourceHandle: 'datetime',
    target: 'node-print-mqksbm4o-3',
    targetHandle: 'value',
    kind: 'data',
    dataType: 'DateTime',
  });

  addEdge(sg, {
    source: 'node-is-valid-mqm9i48b-18',
    sourceHandle: 'exec-true-out',
    target: 'node-print-mqksbm4o-3',
    targetHandle: 'exec-in',
    kind: 'exec',
  });
  addEdge(sg, {
    source: 'node-print-mqksbm4o-3',
    sourceHandle: 'exec-out',
    target: 'node-get-microphone-mqkpxb3c-5',
    targetHandle: 'exec-in',
    kind: 'exec',
  });
  addEdge(sg, {
    source: 'node-get-microphone-mqkpxb3c-5',
    sourceHandle: 'exec-out',
    target: 'node-start-streaming-mql556hh-49',
    targetHandle: 'exec-in',
    kind: 'exec',
  });

  addEdge(sg, {
    source: 'node-variable-set-var-JournalRef-mqm9dl4a-6-mqm9it3v-10',
    sourceHandle: 'exec-out',
    target: 'node-print-mqksbm4o-3',
    targetHandle: 'exec-in',
    kind: 'exec',
  });

  doc.referencedVariableIds = [JOURNAL_VAR_ID];
  return finalizeBranchDoc(doc);
}

function refactorMain(doc) {
  const sg = doc.subgraph;
  const deviceGlobal = 'node-device-global-mqm0q2fd-14';
  const getMic = 'node-get-microphone-mvp-main-1';
  const getJournal = 'node-get-journal-mvp-main-1';
  const getAudioStream = 'node-get-audio-stream-mql3ckno-7';
  const isValidStream = 'node-is-valid-mqm1nky7-30';
  const getSample = 'node-get-sample-mql3f1ro-9';

  const removeIds = [
    'node-variable-get-var-MicrophoneRef-mqkpx2yg-2-mql3c3qd-5',
    'node-variable-set-var-AudioStreamRef-mql3e818-5-mql3earo-6',
    'node-variable-get-var-DeviceRef-mqkpwruv-1-mqm9s2ju-14',
    'node-variable-get-var-DeviceRef-mqkpwruv-1-mqmo3c6u-18',
    'node-variable-get-var-JournalRef-mqm9dl4a-6-mqm9y76y-15',
    'node-variable-get-var-JournalRef-mqm9dl4a-6-mqma4k3m-17',
    'node-variable-get-var-AudioStreamRef-mqv07-37',
  ];
  removeNodes(sg, removeIds);

  addNode(sg, {
    id: getMic,
    blockKind: 'custom',
    position: { x: -708, y: 29 },
    label: 'GetMicrophone',
    nodeKind: 'get-microphone',
    microphoneId: MIC_ID,
  });
  addNode(sg, {
    id: getJournal,
    blockKind: 'custom',
    position: { x: 2434, y: 120 },
    label: 'GetJournal',
    nodeKind: 'get-journal',
  });

  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: getMic,
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: getMic,
    sourceHandle: 'microphone',
    target: 'node-is-valid-mql3c77w-6',
    targetHandle: 'value',
    kind: 'data',
    dataType: 'MicrophoneRef',
  });
  addEdge(sg, {
    source: getMic,
    sourceHandle: 'microphone',
    target: getAudioStream,
    targetHandle: 'microphone',
    kind: 'data',
    dataType: 'MicrophoneRef',
  });
  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: getJournal,
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: getJournal,
    sourceHandle: 'journal',
    target: 'node-get-reporter-mqm9yfmy-29',
    targetHandle: 'journal',
    kind: 'data',
    dataType: 'JournalRef',
  });
  addEdge(sg, {
    source: getJournal,
    sourceHandle: 'journal',
    target: 'node-publish-report-mqma49xv-35',
    targetHandle: 'journal',
    kind: 'data',
    dataType: 'JournalRef',
  });
  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: 'node-get-recorder-mqm9sdoi-25',
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: 'node-get-spectral-analyser-mqm9vz6a-27',
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: deviceGlobal,
    sourceHandle: 'device',
    target: 'node-get-recorder-mqmo3mba-31',
    targetHandle: 'device',
    kind: 'data',
    dataType: 'DeviceRef',
  });
  addEdge(sg, {
    source: isValidStream,
    sourceHandle: 'exec-true-out',
    target: getSample,
    targetHandle: 'exec-in',
    kind: 'exec',
  });
  addEdge(sg, {
    source: getAudioStream,
    sourceHandle: 'stream',
    target: getSample,
    targetHandle: 'stream',
    kind: 'data',
    dataType: 'AudioStreamRef',
  });
  addEdge(sg, {
    source: getAudioStream,
    sourceHandle: 'stream',
    target: 'node-start-recording-mqv07-36',
    targetHandle: 'stream',
    kind: 'data',
    dataType: 'AudioStreamRef',
  });
  addEdge(sg, {
    source: getAudioStream,
    sourceHandle: 'stream',
    target: 'node-start-recording-bootstrap-v08-2',
    targetHandle: 'stream',
    kind: 'data',
    dataType: 'AudioStreamRef',
  });

  doc.referencedVariableIds = [JOURNAL_VAR_ID];
  return finalizeBranchDoc(doc);
}

const refactored = {
  onConnect: refactorOnConnect(load(CANONICAL.onConnect)),
  initial: refactorInitial(load(CANONICAL.initial)),
  main: refactorMain(load(CANONICAL.main)),
  onStop: refactorOnStop(load(CANONICAL.onStop)),
  onDisconnect: refactorOnDisconnect(load(CANONICAL.onDisconnect)),
};

for (const [key, doc] of Object.entries(refactored)) {
  save(CANONICAL[key], doc);
  console.log(`refactored ${CANONICAL[key]}: nodes=${doc.subgraph.nodes.length} vars=${doc.variables.length}`);
}
