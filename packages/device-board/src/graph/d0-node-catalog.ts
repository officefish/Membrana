import type { ScenarioBlockKind, SocketType } from '@membrana/core';

import type { BoardSocketPin } from './board-node-data.js';

/** Шаблон D0-ноды signal graph (хакатон 1). */
export interface D0SignalNodeTemplate {
  readonly pluginId: string;
  readonly label: string;
  readonly inputs: readonly BoardSocketPin[];
  readonly outputs: readonly BoardSocketPin[];
}

/** Шаблон D0-ноды scenario graph (main loop). */
export interface D0ScenarioNodeTemplate {
  readonly blockKind: ScenarioBlockKind;
  readonly label: string;
  readonly inputs: readonly BoardSocketPin[];
  readonly outputs: readonly BoardSocketPin[];
}

const AUDIO_OUT: BoardSocketPin = { name: 'audio-out', kind: 'data', socketType: 'AudioFrame' };
const AUDIO_IN: BoardSocketPin = { name: 'audio-in', kind: 'data', socketType: 'AudioFrame' };
const SPECTRUM_OUT: BoardSocketPin = { name: 'spectrum-out', kind: 'data', socketType: 'Spectrum' };
const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Каталог pluginId → pins для signal graph (D0). */
export const D0_SIGNAL_NODE_CATALOG: Readonly<Record<string, D0SignalNodeTemplate>> = {
  microphone: {
    pluginId: 'microphone',
    label: 'Захват',
    inputs: [],
    outputs: [AUDIO_OUT],
  },
  'fft-analyzer': {
    pluginId: 'fft-analyzer',
    label: 'Анализатор',
    inputs: [AUDIO_IN],
    outputs: [SPECTRUM_OUT],
  },
};

/** Каталог blockKind → pins для scenario main loop (D0). */
export const D0_SCENARIO_NODE_CATALOG: Readonly<Record<ScenarioBlockKind, D0ScenarioNodeTemplate>> = {
  'select-microphone': {
    blockKind: 'select-microphone',
    // v0.4: больше не entry — exec-in для соединения от системного Event-узла.
    label: 'Initial',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
  'start-stream': {
    blockKind: 'start-stream',
    label: 'Main loop',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
  'write-journal': {
    blockKind: 'write-journal',
    label: 'Journal',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
  'record-chunk': {
    blockKind: 'record-chunk',
    label: 'Record chunk',
    inputs: [EXEC_IN, AUDIO_IN],
    outputs: [EXEC_OUT, AUDIO_OUT],
  },
  'trends-fft-detect': {
    blockKind: 'trends-fft-detect',
    label: 'Trends FFT',
    inputs: [EXEC_IN, { name: 'spectrum-in', kind: 'data', socketType: 'Spectrum' }],
    outputs: [EXEC_OUT],
  },
  'evaluate-sound-level': {
    blockKind: 'evaluate-sound-level',
    label: 'Sound level',
    inputs: [EXEC_IN, AUDIO_IN],
    outputs: [EXEC_OUT],
  },
  'branch-on-detection': {
    blockKind: 'branch-on-detection',
    label: 'Branch',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
  'stop-scenario': {
    blockKind: 'stop-scenario',
    label: 'Stop',
    inputs: [EXEC_IN],
    outputs: [],
  },
  'handle-disconnect': {
    blockKind: 'handle-disconnect',
    label: 'Disconnect',
    inputs: [EXEC_IN],
    outputs: [],
  },
  subgraph: {
    blockKind: 'subgraph',
    label: 'Subgraph',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
  custom: {
    blockKind: 'custom',
    label: 'Custom',
    inputs: [EXEC_IN],
    outputs: [EXEC_OUT],
  },
};

export function socketTypeForPin(pin: BoardSocketPin): SocketType | undefined {
  return pin.kind === 'data' ? pin.socketType : undefined;
}
