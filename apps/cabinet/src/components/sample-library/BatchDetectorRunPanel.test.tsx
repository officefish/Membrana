import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CollectionDetectorBatchRunOutcome } from '@membrana/media-library-service';

import { BatchDetectorRunPanel } from './BatchDetectorRunPanel';

afterEach(cleanup);

const completed: CollectionDetectorBatchRunOutcome = {
  runId: 'run-1',
  status: 'completed',
  inputHash: 'hash-1',
  aggregate: {
    total: 2,
    ok: 1,
    failed: 1,
    skipped: 0,
    detected: 1,
    latencyP50Ms: 12,
    latencyP95Ms: 19,
  },
  results: [
    {
      sampleId: 'sample-1',
      title: 'Drone pass',
      status: 'ok',
      detected: true,
      confidence: 0.875,
      latencyMs: 12,
    },
    {
      sampleId: 'sample-2',
      title: 'Broken WAV',
      status: 'failed',
      reason: 'WAV decode failed',
    },
  ],
};

describe('BatchDetectorRunPanel', () => {
  it('shows the full-buffer warning but still allows the read-only run', () => {
    const onRun = vi.fn();
    render(
      <BatchDetectorRunPanel
        state="idle"
        outcome={null}
        error={null}
        bufferFull
        disabled={false}
        onRun={onRun}
      />,
    );

    expect(screen.getByText(/Буфер заполнен/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Запустить прогон' }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('names partial failures and renders aggregate latency', () => {
    render(
      <BatchDetectorRunPanel
        state="done"
        outcome={completed}
        error={null}
        bufferFull={false}
        disabled={false}
        onRun={() => undefined}
      />,
    );

    expect(screen.getByText('ошибки 1')).toBeTruthy();
    expect(screen.getByText('Broken WAV')).toBeTruthy();
    expect(screen.getByText('WAV decode failed')).toBeTruthy();
    expect(screen.getByText(/p50 12\.0 мс/u)).toBeTruthy();
  });

  it('surfaces a named batch rejection', () => {
    const rejected: CollectionDetectorBatchRunOutcome = {
      ...completed,
      status: 'rejected',
      aggregate: { ...completed.aggregate, total: 0, ok: 0, failed: 0, detected: 0 },
      results: [],
      rejection: { reason: 'detector-unavailable', detail: 'Детекторы недоступны' },
    };

    render(
      <BatchDetectorRunPanel
        state="done"
        outcome={rejected}
        error={null}
        bufferFull={false}
        disabled={false}
        onRun={() => undefined}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('Детекторы недоступны');
  });
});
