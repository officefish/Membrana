import { describe, expect, it } from 'vitest';

import { DEVICE_GLOBAL_DEVICE_HANDLE } from './device-global-node.js';
import {
  DEVICE_REF_METHOD_TARGETS,
  JOURNAL_REF_METHOD_TARGETS,
  REPORTER_REF_METHOD_TARGETS,
  REPORT_REF_METHOD_TARGETS,
  suggestPaletteNodesForOutgoingConnection,
} from './connection-suggest.js';
import { createPaletteBoardNode } from './palette-node.js';
import { createMakeRecordingPolicyBoardNode, MAKE_RECORDING_POLICY_OUT_HANDLE } from './make-recording-policy-node.js';
import { createMakeFftTrendsPolicyBoardNode, MAKE_FFT_TRENDS_POLICY_OUT_HANDLE } from './make-fft-trends-policy-node.js';
import { MAKE_FFT_TRENDS_POLICY_HANDLE } from './make-fft-trends-analysis-node.js';

describe('connection-suggest', () => {
  it('suggests exec targets for exec-out source', () => {
    const event = {
      id: 'evt',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'Event',
        layer: 'scenario',
        status: 'active',
        blockKind: 'custom',
        nodeKind: 'event',
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [event],
      'evt',
      'exec-out',
      { sourceNode: event },
    );
    expect(suggestions.some((item) => item.nodeKind === 'stop-runtime')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-microphone')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-recorder')).toBe(false);
    expect(suggestions.some((item) => item.nodeKind === 'get-spectral-analyser')).toBe(false);
  });

  it('suggests get-microphone and stop-runtime for GetDevice device output', () => {
    const device = createPaletteBoardNode('device-global', { id: 'dg' });
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [device],
      'dg',
      DEVICE_GLOBAL_DEVICE_HANDLE,
      { sourceNode: device },
    );
    const kinds = suggestions.map((item) => item.nodeKind);
    expect(kinds).toContain('get-microphone');
    expect(kinds).toContain('get-recorder');
    expect(kinds).toContain('get-spectral-analyser');
    expect(kinds).toContain('stop-runtime');
    expect(kinds).not.toContain('device-global');
  });

  it('uses nodeKind catalog when GetDevice has stale inline pins', () => {
    const staleDevice = {
      id: 'dg-stale',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'GetDevice',
        layer: 'scenario',
        status: 'active',
        blockKind: 'custom',
        nodeKind: 'device-global',
        inputs: [{ name: 'exec-in', kind: 'exec' }],
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [staleDevice],
      'dg-stale',
      DEVICE_GLOBAL_DEVICE_HANDLE,
      { sourceNode: staleDevice },
    );
    expect(suggestions.map((item) => item.nodeKind)).toEqual(
      expect.arrayContaining(['get-microphone', 'stop-runtime']),
    );
  });

  it('maps DeviceRef to device method targets', () => {
    expect(DEVICE_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual([
      'get-microphone',
      'get-recorder',
      'get-spectral-analyser',
      'stop-runtime',
      'get-journal',
    ]);
  });

  it('maps JournalRef to get-reporter target', () => {
    expect(JOURNAL_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual([
      'get-reporter',
      'publish-report',
    ]);
  });

  it('maps ReporterRef to make-report node targets (DBJ3)', () => {
    expect(REPORTER_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual([
      'make-report-from-track',
      'make-report-from-analysis',
    ]);
  });

  it('maps ReportRef to publish-report target (DBJ4)', () => {
    expect(REPORT_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual(['publish-report']);
  });

  it('suggests start-recording for MakeRecordingPolicy policy output (A3)', () => {
    const policyNode = createMakeRecordingPolicyBoardNode({ id: 'mrp' });
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [policyNode],
      'mrp',
      MAKE_RECORDING_POLICY_OUT_HANDLE,
      { sourceNode: policyNode },
    );
    expect(suggestions.map((item) => item.nodeKind)).toContain('start-recording');
  });

  it('suggests make-fft-trends-analysis for MakeFftTrendsPolicy policy output (B1)', () => {
    const policyNode = createMakeFftTrendsPolicyBoardNode({ id: 'mftp' });
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [policyNode],
      'mftp',
      MAKE_FFT_TRENDS_POLICY_OUT_HANDLE,
      { sourceNode: policyNode },
    );
    const match = suggestions.find((item) => item.nodeKind === 'make-fft-trends-analysis');
    expect(match?.targetHandle).toBe(MAKE_FFT_TRENDS_POLICY_HANDLE);
  });
});
