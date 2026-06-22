/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeviceBoardGraphProvider, useDeviceBoardGraph } from './device-board-graph-context.js';

function renderGraph() {
  return renderHook(() => useDeviceBoardGraph(), {
    wrapper: ({ children }) => <DeviceBoardGraphProvider>{children}</DeviceBoardGraphProvider>,
  });
}

function userMainNodes(result: { current: ReturnType<typeof useDeviceBoardGraph> }) {
  return result.current.scenarioMainNodes.filter(
    (node) => node.data !== null && typeof node.data === 'object' && 'blockKind' in node.data,
  );
}

describe('device-board navigation integration', () => {
  it('reverts dirty handler edits when switching sidebar branch (F7)', async () => {
    const { result } = renderGraph();

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBe('loading');
    });

    act(() => {
      result.current.setScenarioBranch('main');
    });

    await waitFor(() => {
      expect(result.current.scenarioBranch).toBe('main');
    });

    act(() => {
      result.current.addScenarioNodeToCurrentBranch('write-journal');
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    });

    act(() => {
      result.current.setScenarioBranch('alarm');
    });

    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
      expect(result.current.scenarioBranch).toBe('alarm');
    });
  });

  it('keeps function draft when switching between functions (keep-dirty)', async () => {
    const { result } = renderGraph();

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBe('loading');
    });

    act(() => {
      result.current.createUserFunction();
    });

    await waitFor(() => {
      expect(result.current.scenarioBranch).toBe('function');
    });

    const firstFunctionId = result.current.activeFunctionId;

    act(() => {
      result.current.updateActiveFunctionMeta({ name: 'Alpha draft' });
    });

    await waitFor(() => {
      expect(result.current.scenarioFunctionMeta.name).toBe('Alpha draft');
    });

    act(() => {
      result.current.createUserFunction();
    });

    const secondFunctionId = result.current.activeFunctionId;
    expect(secondFunctionId).not.toBe(firstFunctionId);

    act(() => {
      result.current.selectUserFunction(firstFunctionId);
    });

    await waitFor(() => {
      expect(result.current.scenarioFunctionMeta.name).toBe('Alpha draft');
      expect(
        result.current.scenarioFunctionDrafts.find((draft) => draft.id === firstFunctionId)?.name,
      ).toBe('Alpha draft');
    });
  });

  it('forgets pending undo when leaving function body to handler', async () => {
    const { result } = renderGraph();

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBe('loading');
    });

    act(() => {
      result.current.createUserFunction();
    });

    await waitFor(() => {
      expect(result.current.scenarioBranch).toBe('function');
    });

    act(() => {
      result.current.captureEditUndoSnapshot('add-function-pin', { side: 'input', kind: 'exec' });
    });

    expect(result.current.canUndoLastEdit).toBe(true);

    act(() => {
      result.current.setScenarioBranch('main');
    });

    await waitFor(() => {
      expect(result.current.canUndoLastEdit).toBe(false);
      expect(result.current.scenarioBranch).toBe('main');
    });
  });

  it('collapse to function opens function layer without F7 revert', async () => {
    const { result } = renderGraph();

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBe('loading');
    });

    act(() => {
      result.current.setScenarioBranch('main');
      result.current.addScenarioNodeToCurrentBranch('write-journal');
      result.current.addScenarioNodeToCurrentBranch('record-chunk');
    });

    await waitFor(() => {
      expect(userMainNodes(result).length).toBeGreaterThanOrEqual(2);
    });

    const added = userMainNodes(result).slice(-2);
    const draftCountBefore = result.current.scenarioFunctionDrafts.length;

    act(() => {
      const error = result.current.collapseMarqueeToFunction('main', added.map((node) => node.id));
      expect(error).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.scenarioBranch).toBe('function');
      expect(result.current.scenarioFunctionDrafts.length).toBe(draftCountBefore + 1);
    });
  });

  it('clears undo when leaving scenario layer (shell contract)', async () => {
    const { result } = renderGraph();

    await waitFor(() => {
      expect(result.current.syncStatus).not.toBe('loading');
    });

    act(() => {
      result.current.createUserFunction();
      result.current.captureEditUndoSnapshot('align-layout', { test: true });
    });

    await waitFor(() => {
      expect(result.current.canUndoLastEdit).toBe(true);
    });

    act(() => {
      result.current.forgetPendingEditUndo('leave-scenario-layer');
    });

    expect(result.current.canUndoLastEdit).toBe(false);
    expect(result.current.lastUndoableEditLabel).toBeNull();
  });
});
