/**
 * @vitest-environment jsdom
 *
 * Зубы бейджа и строки статуса «буфер полон» на доске (M5 (в), T8, #2310). Предмет —
 * `board-overflow-hold-badge.tsx`, `board-runtime-status.tsx`.
 *
 * Порчи → красный: бейдж со своими словами о причине (не из view) — красный; клик по бейджу
 * не зовёт `onOpenWindow` (второе окно / ничего) — красный; строка статуса без фазы, причины
 * или «жив, не пишет» — красный; статус скрыт при idle-рантайме, хотя удержание есть — красный.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScenarioRuntimeState } from '../runtime/index.js';

import { BoardOverflowHoldBadge } from './board-overflow-hold-badge.js';
import type { BoardOverflowHoldView } from './board-overflow-hold.js';
import { BoardRuntimeStatus } from './board-runtime-status.js';

const IDLE: ScenarioRuntimeState = {
  phase: 'idle',
  isRunning: false,
  isPaused: false,
  mode: 'normal',
  activeBranch: null,
  activeNodeId: null,
  activeBlockKind: null,
  mainLoopIteration: 0,
  alarmLoopIteration: 0,
  lastStopReason: null,
  lastError: null,
  runStartedAtMs: null,
  printOutputs: {},
};

function view(onOpenWindow?: () => void): BoardOverflowHoldView {
  return {
    overflowKey: 'ovf-1',
    reasonText: 'Причина из таблицы клиента',
    phaseText: 'удержание · подтверждено сервером',
    remainingText: 'свободно 0 B из 1.0 MB',
    aliveText: 'жив, не пишет',
    title: 'подсказка',
    onOpenWindow,
  };
}

afterEach(() => cleanup());

describe('BoardOverflowHoldBadge', () => {
  it('без удержания — ничего', () => {
    const { container } = render(<BoardOverflowHoldBadge hold={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('несёт факт словами из view и открывает то же окно по клику', () => {
    const open = vi.fn();
    render(<BoardOverflowHoldBadge hold={view(open)} />);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toBe('Буфер полон · Причина из таблицы клиента');
    expect(btn.getAttribute('data-overflow-key')).toBe('ovf-1');
    expect(btn.getAttribute('aria-label')).toContain('свободно 0 B из 1.0 MB');
    fireEvent.click(btn);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('без обработчика — только показ (status), не кнопка', () => {
    render(<BoardOverflowHoldBadge hold={view()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Буфер полон');
  });
});

describe('BoardRuntimeStatus + удержание', () => {
  it('idle без удержания — строки нет; idle с удержанием — фаза · причина · «жив, не пишет»', () => {
    const { container, rerender } = render(<BoardRuntimeStatus state={IDLE} />);
    expect(container.innerHTML).toBe('');
    rerender(<BoardRuntimeStatus state={IDLE} overflowHold={view()} />);
    const line = screen.getByTestId('board-overflow-hold-status');
    expect(line.textContent).toBe('удержание · подтверждено сервером · Причина из таблицы клиента · жив, не пишет');
    expect(line.getAttribute('data-overflow-key')).toBe('ovf-1');
  });

  it('удержание ортогонально фазе рантайма: строка живёт рядом с бегущим main', () => {
    render(
      <BoardRuntimeStatus
        state={{ ...IDLE, phase: 'main' as ScenarioRuntimeState['phase'], isRunning: true, mainLoopIteration: 3 }}
        overflowHold={view()}
      />,
    );
    expect(screen.getByText(/phase: main/u)).toBeTruthy();
    expect(screen.getByTestId('board-overflow-hold-status')).toBeTruthy();
  });
});
