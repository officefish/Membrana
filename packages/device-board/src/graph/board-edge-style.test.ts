import { describe, expect, it } from 'vitest';

import { decorateBoardEdges } from './board-edge-style.js';
import { DATA_EDGE_STROKE_WIDTH, EXEC_EDGE_STROKE_WIDTH, INTEGER_SOCKET_STROKE, NULL_SOCKET_STROKE, REFERENCE_SOCKET_STROKE, STRING_SOCKET_STROKE } from './socket-type-palette.js';
import { EVENT_DEVICE_HANDLE } from './event-node.js';
import { createEventBoardNode } from './event-node.js';
import { createPaletteBoardNode, PALETTE_VALUE_HANDLE } from './palette-node.js';

describe('decorateBoardEdges', () => {
  it('does not animate edges while editing', () => {
    const nodes = [createEventBoardNode({ id: 'evt' }), createPaletteBoardNode('print', { id: 'p' })];
    const edges = [
      {
        id: 'e1',
        source: 'evt',
        sourceHandle: 'exec-out',
        target: 'p',
        targetHandle: 'exec-in',
      },
    ];
    const decorated = decorateBoardEdges(edges, nodes, { pulseWhenRunning: false });
    expect(decorated[0]?.animated).toBe(false);
    expect(decorated[0]?.style?.strokeWidth).toBe(EXEC_EDGE_STROKE_WIDTH);
  });

  it('animates exec edges only when running', () => {
    const nodes = [createEventBoardNode({ id: 'evt' }), createPaletteBoardNode('print', { id: 'p' })];
    const edges = [
      {
        id: 'e1',
        source: 'evt',
        sourceHandle: 'exec-out',
        target: 'p',
        targetHandle: 'exec-in',
      },
    ];
    expect(decorateBoardEdges(edges, nodes, { pulseWhenRunning: true })[0]?.animated).toBe(true);
    expect(decorateBoardEdges(edges, nodes, { pulseWhenRunning: false })[0]?.animated).toBe(false);
  });

  it('colors data edges by source socket type', () => {
    const evt = createEventBoardNode({ id: 'evt' });
    const print = createPaletteBoardNode('print', { id: 'p' });
    const edges = [
      {
        id: 'd1',
        source: 'evt',
        sourceHandle: EVENT_DEVICE_HANDLE,
        target: 'p',
        targetHandle: PALETTE_VALUE_HANDLE,
      },
    ];
    const decorated = decorateBoardEdges(edges, [evt, print], { pulseWhenRunning: false });
    expect(decorated[0]?.style?.stroke).toBe(REFERENCE_SOCKET_STROKE);
    expect(decorated[0]?.style?.strokeWidth).toBe(DATA_EDGE_STROKE_WIDTH);
  });

  it('colors reference data edges sky (including audio types)', () => {
    const gas = createPaletteBoardNode('get-audio-stream', { id: 'gas' });
    const gs = createPaletteBoardNode('get-sample', { id: 'gs' });
    const edges = [
      {
        id: 'stream',
        source: 'gas',
        sourceHandle: 'stream',
        target: 'gs',
        targetHandle: 'stream',
      },
    ];
    const decorated = decorateBoardEdges(edges, [gas, gs], { pulseWhenRunning: false });
    expect(decorated[0]?.style?.stroke).toBe(REFERENCE_SOCKET_STROKE);
  });

  it('colors String and Integer value edges distinctly', () => {
    const printNode = createPaletteBoardNode('print', { id: 'pr' });
    const setInteger = createPaletteBoardNode('print', { id: 'set-int' });
    const edges = [
      {
        id: 'str',
        source: 'pr',
        sourceHandle: 'text',
        target: 'set-int',
        targetHandle: 'value',
      },
    ];
    const decorated = decorateBoardEdges(edges, [printNode, setInteger], { pulseWhenRunning: false });
    expect(decorated[0]?.style?.stroke).toBe(STRING_SOCKET_STROKE);
    expect(INTEGER_SOCKET_STROKE).toBe('#1e3a8a');
  });

  it('colors nullable data edges indigo', () => {
    const evt = createEventBoardNode({ id: 'evt', nullableDeviceOutput: true });
    const print = createPaletteBoardNode('print', { id: 'p' });
    const edges = [
      {
        id: 'd1',
        source: 'evt',
        sourceHandle: EVENT_DEVICE_HANDLE,
        target: 'p',
        targetHandle: PALETTE_VALUE_HANDLE,
      },
    ];
    const decorated = decorateBoardEdges(edges, [evt, print], { pulseWhenRunning: false });
    expect(decorated[0]?.style?.stroke).toBe(NULL_SOCKET_STROKE);
  });
});
