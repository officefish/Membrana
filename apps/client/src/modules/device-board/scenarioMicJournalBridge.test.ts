import { describe, expect, it } from 'vitest';
import { createReferenceValue } from '@membrana/core';

import { createScenarioMicJournalBridge } from './scenarioMicJournalBridge.js';

describe('scenarioMicJournalBridge collector sessions (DBC2)', () => {
  it('exposes stable recorder and analyser session refs per deviceHandle', () => {
    const bridge = createScenarioMicJournalBridge();
    expect(bridge.getRecorderSessionRef('dev-1')).toEqual(
      createReferenceValue('RecorderRef', 'recorder:dev-1'),
    );
    expect(bridge.getSpectralAnalyserSessionRef('dev-1')).toEqual(
      createReferenceValue('SpectralAnalyserRef', 'analyser:dev-1'),
    );
  });

  it('append and flush route samples and frames through registry', () => {
    const bridge = createScenarioMicJournalBridge();
    const sample = createReferenceValue('AudioSampleRef', 'sample-1');
    const frame = createReferenceValue('FftFrameRef', 'frame-1');

    expect(bridge.appendRecorderSample('dev-2', sample)).toBe(true);
    expect(bridge.appendSpectralAnalyserFrame('dev-2', frame)).toBe(true);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-2')).toBe(1);
    expect(bridge.getCollectorQueueDepth('spectral-analyser', 'dev-2')).toBe(1);

    const recorderFlush = bridge.flushRecorderSession('dev-2');
    expect(recorderFlush?.refs).toEqual([sample]);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-2')).toBe(0);
  });

  it('clears collector registry on stopAudioStreaming', async () => {
    const bridge = createScenarioMicJournalBridge();
    bridge.appendRecorderSample('dev-3', createReferenceValue('AudioSampleRef', 's1'));
    await bridge.stopAudioStreaming(null);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-3')).toBe(0);
  });

  it('clears collector registry on resetCollectorSessions', () => {
    const bridge = createScenarioMicJournalBridge();
    bridge.appendRecorderSample('dev-4', createReferenceValue('AudioSampleRef', 's1'));
    bridge.resetCollectorSessions();
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-4')).toBe(0);
  });
});
