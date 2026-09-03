/**
 * СТАБ-ПОРЧА. Шесть намеренно испорченных «разрешителей владения».
 *
 * Это не мёртвый код и не шутка: ими проверяется, что набор случаев способен ОТЛИЧИТЬ честную
 * реализацию от неправильной. Без них зуб на честной реализации зелен даже тогда, когда он не
 * проверяет ничего.
 *
 * Порчи подобраны не по фантазии, а по правдоподобию. Самая опасная — не «всегда брать
 * `deviceId`» (такое видно глазом), а `device-id-as-fallback`: честный код с одной запасной
 * веткой «ну хоть что-то вернём». Она и есть то, что вердикт M1 называет угадыванием.
 *
 * В производственный граф не входит; к интеграции — удалить или исключить из сборки.
 */

import { OWNERSHIP_AXIS_PROVENANCE, type OwnershipAxis } from '../ownership-axis';
import {
  HONEST_OWNERSHIP_RESOLVER,
  type OwnershipConformanceCase,
  type OwnershipProbeContext,
  type OwnershipResolverUnderTest,
} from './ownership-conformance';

function membraneAxis(deviceId: string, membraneId: string): OwnershipAxis {
  return { kind: 'membrane', membraneId, deviceId, derivedFrom: OWNERSHIP_AXIS_PROVENANCE };
}

function trimmed(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

export interface CorruptResolver {
  readonly name: string;
  /** Чем именно испорчен — человеческим языком, для читаемого красного. */
  readonly lie: string;
  readonly resolve: OwnershipResolverUnderTest;
  /** Случаи, которые эта порча ОБЯЗАНА уронить. Меньше — значит набор ослаб. */
  readonly mustFail: readonly OwnershipConformanceCase[];
}

export const OWNERSHIP_CORRUPT_RESOLVERS: readonly CorruptResolver[] = [
  {
    name: 'owner-always-from-device-id',
    lie: 'адресация объявлена владением: владелец всегда равен deviceId',
    resolve: (ctx: OwnershipProbeContext) => membraneAxis(ctx.device.id, ctx.device.id),
    mustFail: [
      'owned-device-yields-its-membrane',
      'unowned-device-yields-absent',
      'membrane-never-equals-device-id',
      'two-devices-one-membrane-share-owner',
    ],
  },
  {
    name: 'device-id-as-fallback',
    lie: 'честно, пока мембрана есть; без мембраны подставляется deviceId — «хоть что-то вернём»',
    resolve: (ctx: OwnershipProbeContext) => {
      const membraneId = trimmed(ctx.device.membraneId);
      return membraneAxis(ctx.device.id, membraneId ?? ctx.device.id);
    },
    mustFail: [
      'unowned-device-yields-absent',
      'membrane-never-equals-device-id',
      'blank-membrane-is-absent',
    ],
  },
  {
    name: 'owner-always-from-collection-id',
    lie: 'группировка объявлена владением: при наличии collectionId владелец берётся из него',
    resolve: (ctx: OwnershipProbeContext) =>
      ctx.collectionId !== undefined
        ? membraneAxis(ctx.device.id, ctx.collectionId)
        : HONEST_OWNERSHIP_RESOLVER(ctx),
    mustFail: [
      'unowned-device-with-collection-context-yields-absent',
      'membrane-never-equals-collection-id',
    ],
  },
  {
    name: 'collection-id-as-fallback',
    lie: 'честно, пока мембрана есть; без мембраны владелец берётся из collectionId',
    resolve: (ctx: OwnershipProbeContext) => {
      const membraneId = trimmed(ctx.device.membraneId);
      if (membraneId !== null) return membraneAxis(ctx.device.id, membraneId);
      return ctx.collectionId !== undefined
        ? membraneAxis(ctx.device.id, ctx.collectionId)
        : { kind: 'absent', deviceId: ctx.device.id };
    },
    mustFail: [
      'unowned-device-with-collection-context-yields-absent',
      'membrane-never-equals-collection-id',
    ],
  },
  {
    name: 'blank-membrane-passthrough',
    lie: 'мембрана из пробелов считается владельцем: нормализация пустоты не fail-closed',
    resolve: (ctx: OwnershipProbeContext) =>
      typeof ctx.device.membraneId === 'string'
        ? membraneAxis(ctx.device.id, ctx.device.membraneId)
        : { kind: 'absent', deviceId: ctx.device.id },
    mustFail: ['blank-membrane-is-absent'],
  },
  {
    name: 'provenance-forged',
    lie: 'ответ верный, но происхождение названо чужое — ось собрана мимо resolveDeviceOwnership',
    resolve: (ctx: OwnershipProbeContext) => {
      const membraneId = trimmed(ctx.device.membraneId);
      if (membraneId === null) return { kind: 'absent', deviceId: ctx.device.id };
      return {
        kind: 'membrane',
        membraneId,
        deviceId: ctx.device.id,
        derivedFrom: 'device.deviceId',
      } as unknown as OwnershipAxis;
    },
    mustFail: ['axis-provenance-is-device-membrane-id'],
  },
];
