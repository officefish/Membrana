import { describe, expect, it } from 'vitest';

import {
  OWNERSHIP_AXIS_FIELD,
  OWNERSHIP_AXIS_PROVENANCE,
  assertOwnershipProvenance,
  isOwned,
  resolveDeviceOwnership,
  type OwnershipAxis,
} from './ownership-axis';
import { OWNERSHIP_PROVENANCE_VIOLATION } from './ownership-errors';

describe('resolveDeviceOwnership', () => {
  it('единица владения — membraneId, и это зафиксировано именем поля', () => {
    expect(OWNERSHIP_AXIS_FIELD).toBe('membraneId');
    expect(OWNERSHIP_AXIS_PROVENANCE).toBe('device.membraneId');
  });

  it('прибор с мембраной даёт владельца — ровно ту мембрану, что записана в приборе', () => {
    const axis = resolveDeviceOwnership({ id: 'device-1', membraneId: 'membrane-A' });
    expect(axis).toEqual({
      kind: 'membrane',
      membraneId: 'membrane-A',
      deviceId: 'device-1',
      derivedFrom: 'device.membraneId',
    });
    expect(isOwned(axis)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['пустая строка', ''],
    ['строка из пробелов', '   '],
    ['таб и перевод строки', '\t\n'],
  ])('%s в membraneId — отсутствие владельца, а не владелец (fail-closed)', (_name, raw) => {
    const axis = resolveDeviceOwnership({ id: 'device-3', membraneId: raw as string | null });
    expect(axis).toEqual({ kind: 'absent', deviceId: 'device-3' });
    expect(isOwned(axis)).toBe(false);
  });

  it('обрамляющие пробелы срезаются, владелец от этого не меняется', () => {
    const axis = resolveDeviceOwnership({ id: 'device-1', membraneId: '  membrane-A  ' });
    expect(axis).toMatchObject({ kind: 'membrane', membraneId: 'membrane-A' });
  });

  it('два прибора одной мембраны дают ОДНОГО владельца: владение мембранное, не приборное', () => {
    const first = resolveDeviceOwnership({ id: 'device-1', membraneId: 'membrane-A' });
    const second = resolveDeviceOwnership({ id: 'device-2', membraneId: 'membrane-A' });
    expect(isOwned(first) && isOwned(second)).toBe(true);
    expect((first as { membraneId: string }).membraneId).toBe(
      (second as { membraneId: string }).membraneId,
    );
  });

  it('ось заморожена: вызывающий не подменит владельца задним числом', () => {
    const axis = resolveDeviceOwnership({ id: 'device-1', membraneId: 'membrane-A' });
    expect(Object.isFrozen(axis)).toBe(true);
    expect(() => {
      (axis as { membraneId: string }).membraneId = 'membrane-B';
    }).toThrow();
  });
});

describe('assertOwnershipProvenance', () => {
  it('пропускает ось, собранную resolveDeviceOwnership', () => {
    const axis = resolveDeviceOwnership({ id: 'device-1', membraneId: 'membrane-A' });
    expect(() => assertOwnershipProvenance(axis)).not.toThrow();
  });

  it('пропускает отсутствие владельца — провенанс там нечему называть', () => {
    const axis = resolveDeviceOwnership({ id: 'device-3', membraneId: null });
    expect(() => assertOwnershipProvenance(axis)).not.toThrow();
  });

  it('роняет ось с чужим происхождением — собранную мимо резолвера', () => {
    const forged = {
      kind: 'membrane',
      membraneId: 'device-1',
      deviceId: 'device-1',
      derivedFrom: 'device.deviceId',
    } as unknown as OwnershipAxis;
    expect(() => assertOwnershipProvenance(forged)).toThrowError(
      /device\.membraneId/,
    );
    try {
      assertOwnershipProvenance(forged);
      expect.unreachable('provenance violation must throw');
    } catch (error) {
      expect((error as { code: string }).code).toBe(OWNERSHIP_PROVENANCE_VIOLATION);
    }
  });
});
