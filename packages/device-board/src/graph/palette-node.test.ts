import { describe, expect, it } from 'vitest';

import {
  createPaletteBoardNode,
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  PALETTE_VALUE_HANDLE,
  paletteNodePins,
  V04_PALETTE_NODE_KINDS,
} from './palette-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('palette-node (DBR5)', () => {
  it('defines v0.4 palette with streaming and fft nodes', () => {
    expect([...V04_PALETTE_NODE_KINDS]).toEqual([
      'device-global',
      'stop-runtime',
      'pause-runtime',
      'sequence',
      'start-async-job',
      'await-promise',
      'on-async-resolved',
      'cancel-async-jobs',
      'print',
      'is-valid',
      'branch-on-detection',
      'get-microphone',
      'get-recorder',
      'get-spectral-analyser',
      'start-streaming',
      'stop-streaming',
      'get-audio-stream',
      'get-sample',
      'get-fft-frame',
      'collect-samples',
      'collect-fft-frames',
      'start-recording',
      'stop-recording',
      'is-recording-window-full',
      'is-window-elapsed',
      'flush-spectral-analyser',
      'make-recording-policy',
      'make-fft-trends-policy',
      'make-track',
      'make-fft-trends-analysis',
      'make-ensemble-analysis',
      'make-detection-fusion',
      'make-proximity-trend',
      'make-combined-report',
      'get-journal',
      'get-reporter',
      'make-report-from-track',
      'make-report-from-analysis',
      'publish-report',
    ]);
  });

  it('creates get-journal with device and server inputs', () => {
    const node = createPaletteBoardNode('get-journal');
    expect(node.data.nodeKind).toBe('get-journal');
    expect(node.data.inputs?.some((pin) => pin.name === 'device' && pin.socketType === 'DeviceRef')).toBe(
      true,
    );
    expect(node.data.inputs?.some((pin) => pin.name === 'server' && pin.socketType === 'ServerRef')).toBe(
      true,
    );
    expect(node.data.outputs?.find((pin) => pin.name === 'journal')?.socketType).toBe('JournalRef');
  });

  it('creates print node with exec + reference value input', () => {
    const node = createPaletteBoardNode('print');
    expect(node.data.nodeKind).toBe('print');
    expect(node.data.inputs?.some((pin) => pin.name === PALETTE_VALUE_HANDLE)).toBe(true);
    expect(node.data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('creates print node with exec in, value in, exec out and string out', () => {
    const node = createPaletteBoardNode('print');
    expect(node.data.outputs?.find((pin) => pin.name === 'text')?.socketType).toBe('String');
  });

  it('creates is-valid node with true/false exec outputs', () => {
    const pins = paletteNodePins('is-valid');
    expect(pins.outputs.map((pin) => pin.name)).toEqual([
      IS_VALID_TRUE_HANDLE,
      IS_VALID_FALSE_HANDLE,
    ]);
  });

  it('creates get-microphone with DeviceRef in and MicrophoneRef out', () => {
    const pins = paletteNodePins('get-microphone');
    expect(pins.inputs.find((pin) => pin.name === GET_MICROPHONE_DEVICE_HANDLE)?.socketType).toBe(
      'DeviceRef',
    );
    expect(pins.outputs.find((pin) => pin.name === GET_MICROPHONE_OUT_HANDLE)?.socketType).toBe(
      'MicrophoneRef',
    );
  });

  it('creates get-recorder with DeviceRef in and RecorderRef out', () => {
    const pins = paletteNodePins('get-recorder');
    expect(pins.inputs.find((pin) => pin.name === 'device')?.socketType).toBe('DeviceRef');
    expect(pins.outputs.find((pin) => pin.name === 'recorder')?.socketType).toBe('RecorderRef');
  });

  it('creates get-spectral-analyser with DeviceRef in and SpectralAnalyserRef out', () => {
    const pins = paletteNodePins('get-spectral-analyser');
    expect(pins.inputs.find((pin) => pin.name === 'device')?.socketType).toBe('DeviceRef');
    expect(pins.outputs.find((pin) => pin.name === 'analyser')?.socketType).toBe(
      'SpectralAnalyserRef',
    );
  });

  it('creates start-streaming with microphone in and AudioStreamRef out', () => {
    const pins = paletteNodePins('start-streaming');
    expect(pins.inputs.find((pin) => pin.name === 'microphone')?.socketType).toBe('MicrophoneRef');
    expect(pins.outputs.find((pin) => pin.name === 'stream')?.socketType).toBe('AudioStreamRef');
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('creates get-audio-stream with MicrophoneRef in and AudioStreamRef out', () => {
    const pins = paletteNodePins('get-audio-stream');
    expect(pins.inputs.find((pin) => pin.name === 'microphone')?.socketType).toBe('MicrophoneRef');
    expect(pins.outputs.find((pin) => pin.name === 'stream')?.socketType).toBe('AudioStreamRef');
  });

  it('creates get-sample with stream in and sample out', () => {
    const pins = paletteNodePins('get-sample');
    expect(pins.inputs.find((pin) => pin.name === 'stream')?.socketType).toBe('AudioStreamRef');
    expect(pins.outputs.find((pin) => pin.name === 'sample')?.socketType).toBe('AudioSampleRef');
  });

  it('creates get-fft-frame with sample in and frame out', () => {
    const pins = paletteNodePins('get-fft-frame');
    expect(pins.inputs.find((pin) => pin.name === 'sample')?.socketType).toBe('AudioSampleRef');
    expect(pins.outputs.find((pin) => pin.name === 'frame')?.socketType).toBe('FftFrameRef');
  });

  it('round-trips get-microphone with microphoneId', () => {
    const node = createPaletteBoardNode('get-microphone', { id: 'gm-1', microphoneId: 'mic-a' });
    const sub = serializeScenarioSubgraph('gm-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.microphoneId).toBe('mic-a');
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-microphone');
  });
});
