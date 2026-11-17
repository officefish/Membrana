// @vitest-environment jsdom
/**
 * Зубы презентационного окна (M5 (а)/(б), a11y DoD 7, #2310). Предмет — `OverflowWindow.tsx`.
 *
 * Порчи → красный: порядок кнопок не «вывоз → чистка → тариф» — красный; «Почистить» зовёт
 * что-то кроме запроса подтверждения — красный; Esc/крестик зовут что-то кроме onClose
 * (например, onResumeByHuman) — красный; кнопка тарифа включена при пустом списке переходов —
 * красный; нет role=dialog/aria-modal или фокус уходит за окно по Tab — красный.
 */
import { BUFFER_OVERFLOW_REASONS } from '@membrana/plugin-contracts';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import { OverflowWindow, type OverflowWindowProps } from './OverflowWindow';
import { TARIFF_NO_TRANSITIONS_TEXT } from './reasonTexts';
import { buildOverflowWindowViewModel, type TariffTransitionsKnowledge } from './viewModel';

const EPISODE: OverflowHoldEpisode = {
  overflowId: 'ovf-1',
  overflowAt: '2026-09-06T02:11:00.000Z',
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  policy: 'stop',
  source: 'server',
  buffer: { usedBytes: 1000, limitBytes: 1000 },
  userStorage: { usedBytes: 10, limitBytes: 1000 },
  enteredAtMs: 1,
  owner: { kind: 'membrane', membraneId: 'm-1', deviceId: 'dev-1' },
};

const LIVE_AXES = { buffer: EPISODE.buffer, userStorage: EPISODE.userStorage } as const;
/** #2538: свежее чтение предела с моментом — умолчание зубов, где возраст не предмет. */
const QUOTA_READ = { fresh: true, readAt: '2026-10-01T08:00:00.000Z' } as const;

function props(overrides: Partial<OverflowWindowProps> = {}, tariff: TariffTransitionsKnowledge = 'unknown') {
  return {
    open: true,
    vm: buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      tariffTransitions: tariff,
    }),
    refusedAttempt: null,
    bufferAtStop: { bufferSamples: 3, bufferBytes: 300, outsideSamples: 0 },
    sinceStop: { gone: 0, exported: 0, deleted: 0 },
    outcome: null,
    cleanPromise: { samples: 3, bytes: 300 },
    busy: false,
    onClose: vi.fn(),
    onExportToCollection: vi.fn(),
    onCleanRequest: vi.fn(),
    onChangeTariff: vi.fn(),
    onResumeByHuman: vi.fn(),
    ...overrides,
  } satisfies OverflowWindowProps;
}

afterEach(() => cleanup());

describe('OverflowWindow — содержание (а)', () => {
  it('показывает причину словами, две шкалы, время факта, режим/фазу и счёт буфера — без строки «н/д» (#2552)', () => {
    render(<OverflowWindow {...props()} />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.getByTestId('overflow-reason').textContent).toContain('Буфер прибора полон');
    expect(screen.queryByTestId('overflow-reason-raw')).toBeNull();
    expect(screen.getByTestId('overflow-axis-buffer').textContent).toMatch(/занято .* \/ лимит .* \/ свободно 0 B/u);
    expect(screen.getByTestId('overflow-axis-userStorage').textContent).toMatch(/свободно 990 B/u);
    expect(screen.getByTestId('overflow-at').textContent?.length).toBeGreaterThan(5);
    expect(screen.getByTestId('overflow-mode').textContent).toContain('остановка');
    expect(screen.getByTestId('overflow-mode').textContent).toContain('подтверждено сервером');
    // #2552: строки «Записано до остановки» нет — у прибора нет её источника, «н/д» не показывается.
    expect(screen.queryByTestId('overflow-recorded')).toBeNull();
    expect(screen.queryByText('Записано до остановки')).toBeNull();
    expect(screen.getByTestId('overflow-buffer-at-stop').textContent).toBe('3 проб · 300 B');
    expect(screen.getByTestId('overflow-held').textContent).toContain('жив, не пишет');
  });

  it('#2533: место освобождено при неснятом удержании — заголовок о месте, плашка жёлтая, слово о слове человека', () => {
    const vm = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: { buffer: { usedBytes: 0, limitBytes: 1000 }, userStorage: EPISODE.userStorage },
      quotaRead: QUOTA_READ,
      held: true,
      tariffTransitions: 'unknown',
    });
    render(<OverflowWindow {...props({ vm })} />);
    expect(screen.getByRole('heading').textContent).toBe('Место освобождено — снимите удержание');
    const held = screen.getByTestId('overflow-held');
    expect(held.className).toContain('alert-warning');
    expect(held.className).not.toContain('alert-error');
    expect(held.textContent).toContain('место освобождено');
    expect(held.textContent).toContain('до вашего слова');
    // Удержание не снято: кнопка «Возобновить запись» на месте, «снято» не показано.
    expect(screen.getByTestId('overflow-resume')).toBeTruthy();
    expect(screen.queryByTestId('overflow-released')).toBeNull();
    // Снимок остановки остаётся рядом как вещдок.
    expect(screen.getByTestId('overflow-axis-buffer-at-stop').textContent).toContain('лимит 1000 B');
  });

  it('#2533: место занято — заголовок «Буфер полон», плашка красная', () => {
    render(<OverflowWindow {...props()} />);
    expect(screen.getByRole('heading').textContent).toBe('Буфер полон');
    const held = screen.getByTestId('overflow-held');
    expect(held.className).toContain('alert-error');
    expect(held.textContent).toContain('Само не возобновится');
  });

  it('неизвестный код: заголовок «Буфер полон», сырой код приглушённой строкой', () => {
    const vm = buildOverflowWindowViewModel({
      episode: { ...EPISODE, reason: 'weird_code' },
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: true,
      tariffTransitions: 'unknown',
    });
    render(<OverflowWindow {...props({ vm })} />);
    expect(screen.getByTestId('overflow-reason-raw').textContent).toBe('weird_code');
    expect(screen.getByRole('heading').textContent).toBe('Буфер полон');
  });
});

describe('OverflowWindow — дороги (б)', () => {
  it('три кнопки в порядке: вывезти → почистить → сменить тариф; счёт чистки виден до нажатия', () => {
    render(<OverflowWindow {...props()} />);
    const roads = screen.getByTestId('overflow-roads').querySelectorAll('button');
    expect(Array.from(roads).map((b) => b.getAttribute('data-testid'))).toEqual([
      'overflow-road-export',
      'overflow-road-clean',
      'overflow-road-tariff',
    ]);
    expect(screen.getByTestId('overflow-road-clean').textContent).toContain('уйдёт 3 проб · 300 B');
  });

  it('«Почистить» только просит подтверждение — сам ничего не удаляет и удержание не трогает', () => {
    const p = props();
    render(<OverflowWindow {...p} />);
    fireEvent.click(screen.getByTestId('overflow-road-clean'));
    expect(p.onCleanRequest).toHaveBeenCalledTimes(1);
    expect(p.onResumeByHuman).not.toHaveBeenCalled();
    expect(p.onExportToCollection).not.toHaveBeenCalled();
  });

  it('«Вывезти в набор» — первая и ведёт в вывоз, не в чистку', () => {
    const p = props();
    render(<OverflowWindow {...p} />);
    fireEvent.click(screen.getByTestId('overflow-road-export'));
    expect(p.onExportToCollection).toHaveBeenCalledTimes(1);
    expect(p.onCleanRequest).not.toHaveBeenCalled();
  });

  it('тариф: переходов нет → кнопка выключена + текст «доступных тарифов для перехода нет»', () => {
    const p = props({}, []);
    render(<OverflowWindow {...p} />);
    const btn = screen.getByTestId<HTMLButtonElement>('overflow-road-tariff');
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId('overflow-tariff-note').textContent).toBe(TARIFF_NO_TRANSITIONS_TEXT);
    fireEvent.click(btn);
    expect(p.onChangeTariff).not.toHaveBeenCalled();
  });

  it('тариф: источника нет → кнопка ведёт в кабинет', () => {
    const p = props();
    render(<OverflowWindow {...p} />);
    fireEvent.click(screen.getByTestId('overflow-road-tariff'));
    expect(p.onChangeTariff).toHaveBeenCalledTimes(1);
  });

  it('сводка после чистки: «Удалено: 0» при пустом — не успех; расхождение показано', () => {
    const { rerender } = render(
      <OverflowWindow
        {...props({
          outcome: { kind: 'cleaned', promised: { samples: 0, bytes: 0 }, removedSamples: 0, removedBytes: 0, mismatch: false },
        })}
      />,
    );
    expect(screen.getByTestId('overflow-outcome').textContent).toMatch(/Удалено: 0/u);
    rerender(
      <OverflowWindow
        {...props({
          outcome: { kind: 'cleaned', promised: { samples: 5, bytes: 500 }, removedSamples: 3, removedBytes: 300, mismatch: true },
        })}
      />,
    );
    expect(screen.getByTestId('overflow-outcome').textContent).toContain('Обещано 5, ушло 3');
    expect(screen.getByTestId('overflow-since-stop').textContent).toContain('вывезено 0 · удалено 0');
  });
});

describe('OverflowWindow — закрытие и a11y (DoD 7)', () => {
  it('Esc и крестик зовут только onClose — не снятие удержания', () => {
    const p = props();
    render(<OverflowWindow {...p} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Закрыть окно/u }));
    expect(p.onClose).toHaveBeenCalledTimes(2);
    expect(p.onResumeByHuman).not.toHaveBeenCalled();
  });

  it('«Возобновить запись» — отдельное явное действие, зовёт onResumeByHuman; без удержания кнопки нет', () => {
    const p = props();
    const { rerender } = render(<OverflowWindow {...p} />);
    fireEvent.click(screen.getByTestId('overflow-resume'));
    expect(p.onResumeByHuman).toHaveBeenCalledTimes(1);
    const released = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: QUOTA_READ,
      held: false,
      tariffTransitions: 'unknown',
    });
    rerender(<OverflowWindow {...p} vm={released} />);
    expect(screen.queryByTestId('overflow-resume')).toBeNull();
    expect(screen.getByTestId('overflow-released')).toBeTruthy();
  });

  it('фокус: первый элемент в фокусе при открытии; Tab с последнего возвращает на первый', () => {
    render(<OverflowWindow {...props()} />);
    const dialog = screen.getByRole('dialog');
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    expect(document.activeElement).toBe(buttons[0]);
    buttons[buttons.length - 1]?.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0]?.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('пока поверх открыто подтверждение (suspended) — Esc окна не срабатывает', () => {
    const p = props({ suspended: true });
    render(<OverflowWindow {...p} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it('отбитый старт назван в окне (T5)', () => {
    render(<OverflowWindow {...props({ refusedAttempt: { source: 'mic', what: 'запись в буфер' } })} />);
    expect(screen.getByTestId('overflow-refused-attempt').textContent).toContain('запись в буфер');
  });
});

describe('#2538 — строка момента чтения предела под живыми шкалами', () => {
  it('свежее чтение — приглушённая строка с временем; отказ — предупреждение «снимок от», числа остаются', () => {
    render(<OverflowWindow {...props()} />);
    const fresh = screen.getByTestId('overflow-quota-read');
    expect(fresh.getAttribute('data-quota-fresh')).toBe('true');
    expect(fresh.textContent).toContain('предел сервера прочитан');
    expect(fresh.textContent).toMatch(/\d{1,2}:\d{2}/u);
    cleanup();

    const stale = buildOverflowWindowViewModel({
      episode: EPISODE,
      liveAxes: LIVE_AXES,
      quotaRead: { fresh: false, readAt: '2026-10-01T05:00:00.000Z' },
      held: true,
      tariffTransitions: 'unknown',
    });
    render(<OverflowWindow {...props({ vm: stale })} />);
    const line = screen.getByTestId('overflow-quota-read');
    expect(line.getAttribute('data-quota-fresh')).toBe('false');
    expect(line.textContent).toContain('предел не прочитан — показан снимок от');
    expect(line.className).toContain('text-warning');
    // Числа не спрятаны (развилка 4).
    expect(screen.getByTestId('overflow-axis-buffer').textContent).toMatch(/лимит 1000 B/u);
  });
});
