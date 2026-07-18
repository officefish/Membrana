import { describe, expect, it } from 'vitest';

import {
  createIsWindowElapsedBoardNode,
  DEFAULT_WINDOW_ELAPSED_MS,
  IS_WINDOW_ELAPSED_FALSE_HANDLE,
  IS_WINDOW_ELAPSED_TRUE_HANDLE,
  IS_WINDOW_ELAPSED_WINDOW_MS_HANDLE,
  isIsWindowElapsedNode,
  isWindowElapsedNodePins,
} from './is-window-elapsed-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('is-window-elapsed-node (PC-2)', () => {
  it('пины: exec-in + windowMs(Integer) in, exec true/false out — БЕЗ RecorderRef', () => {
    const pins = isWindowElapsedNodePins();
    const windowPin = pins.inputs.find((p) => p.name === IS_WINDOW_ELAPSED_WINDOW_MS_HANDLE);
    expect(windowPin?.socketType).toBe('Integer');
    expect(windowPin?.nullable).toBe(true);
    // Ключевой инвариант консилиума: гейт НЕ зависит от рекордера.
    expect(pins.inputs.some((p) => p.socketType === 'RecorderRef')).toBe(false);
    expect(pins.inputs.some((p) => p.name === 'exec-in')).toBe(true);
    expect(pins.outputs.map((p) => p.name)).toEqual([
      IS_WINDOW_ELAPSED_TRUE_HANDLE,
      IS_WINDOW_ELAPSED_FALSE_HANDLE,
    ]);
  });

  it('ветки совпадают с is-valid (connection-suggest): exec-true-out / exec-false-out', () => {
    expect(IS_WINDOW_ELAPSED_TRUE_HANDLE).toBe('exec-true-out');
    expect(IS_WINDOW_ELAPSED_FALSE_HANDLE).toBe('exec-false-out');
  });

  it('фабрика проставляет windowElapsedMs (дефолт) и корректный nodeKind', () => {
    const node = createIsWindowElapsedBoardNode({ id: 'iwe-1' });
    expect(isIsWindowElapsedNode(node)).toBe(true);
    expect((node.data as { windowElapsedMs?: number }).windowElapsedMs).toBe(
      DEFAULT_WINDOW_ELAPSED_MS,
    );
  });

  it('фабрика принимает кастомное окно', () => {
    const node = createIsWindowElapsedBoardNode({ id: 'iwe-2', windowElapsedMs: 3000 });
    expect((node.data as { windowElapsedMs?: number }).windowElapsedMs).toBe(3000);
  });

  it('round-trips через сериализацию subgraph', () => {
    const node = createIsWindowElapsedBoardNode({ id: 'iwe-3' });
    const sub = serializeScenarioSubgraph('iwe-3', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('is-window-elapsed');
    expect(restored.nodes[0]?.data.label).toBe('IsWindowElapsed');
  });
});
