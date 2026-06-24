import { describe, expect, it } from 'vitest';

import {
  createGetSpectralAnalyserBoardNode,
  GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  GET_SPECTRAL_ANALYSER_OUT_HANDLE,
  getSpectralAnalyserNodePins,
} from './get-spectral-analyser-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('get-spectral-analyser-node (DBC1)', () => {
  it('defines pure DeviceRef in and SpectralAnalyserRef out by default', () => {
    const pins = getSpectralAnalyserNodePins();
    expect(
      pins.inputs.find((pin) => pin.name === GET_SPECTRAL_ANALYSER_DEVICE_HANDLE)?.socketType,
    ).toBe('DeviceRef');
    expect(
      pins.outputs.find((pin) => pin.name === GET_SPECTRAL_ANALYSER_OUT_HANDLE)?.socketType,
    ).toBe('SpectralAnalyserRef');
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(false);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(false);
  });

  it('adds exec pins when impure', () => {
    const pins = getSpectralAnalyserNodePins(false);
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createGetSpectralAnalyserBoardNode({ id: 'gsa-1' });
    const sub = serializeScenarioSubgraph('gsa-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-spectral-analyser');
    expect(restored.nodes[0]?.data.label).toBe('GetSpectralAnalyser');
  });
});
