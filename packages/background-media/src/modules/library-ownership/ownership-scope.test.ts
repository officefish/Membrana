import { describe, expect, it } from 'vitest';

import { resolveDeviceOwnership } from './ownership-axis';
import { selectionForAxis } from './ownership-scope';

const owned = resolveDeviceOwnership({ id: 'device-1', membraneId: 'membrane-A' });
const unowned = resolveDeviceOwnership({ id: 'device-3', membraneId: null });

describe('selectionForAxis', () => {
  it('владелец есть → фильтр по мембране', () => {
    expect(selectionForAxis(owned)).toEqual({
      kind: 'query',
      filter: { membraneId: 'membrane-A' },
    });
  });

  it('владельца нет → отдельный разряд none, а НЕ пустой фильтр', () => {
    const selection = selectionForAxis(unowned);
    expect(selection).toEqual({ kind: 'none', reason: 'device-has-no-membrane' });
    // Пустой фильтр в любом хранилище раскрылся бы в «всё» — этого разряда здесь нет вовсе.
    expect(selection).not.toHaveProperty('filter');
  });

  it('фильтр не несёт ни deviceId, ни collectionId: это адресация и группировка, не владение', () => {
    const selection = selectionForAxis(owned);
    expect(selection.kind).toBe('query');
    const keys = Object.keys((selection as { filter: object }).filter);
    expect(keys).toEqual(['membraneId']);
  });

  it('окно дат едет в фильтр как есть — потолка ширины окна M4 не даёт', () => {
    const createdFrom = new Date('2026-08-01T00:00:00.000Z');
    const createdTo = new Date('2026-08-02T00:00:00.000Z');
    expect(selectionForAxis(owned, { createdFrom, createdTo })).toEqual({
      kind: 'query',
      filter: { membraneId: 'membrane-A', createdFrom, createdTo },
    });
  });

  it('окно дат бесхозного прибора не превращает none в выборку', () => {
    const selection = selectionForAxis(unowned, { createdFrom: new Date('2026-08-01') });
    expect(selection.kind).toBe('none');
  });

  it('область заморожена вместе с фильтром', () => {
    const selection = selectionForAxis(owned);
    expect(Object.isFrozen(selection)).toBe(true);
    expect(Object.isFrozen((selection as { filter: object }).filter)).toBe(true);
  });
});
