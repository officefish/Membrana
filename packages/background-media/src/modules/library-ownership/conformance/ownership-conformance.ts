/**
 * Исполняемый набор случаев для ЛЮБОЙ реализации «разрешителя владения».
 *
 * Зачем он вообще нужен. Вердикт M1 запрещает выводить владельца из `deviceId` или
 * `collectionId`. Это утверждение ОБ ОТСУТСТВИИ кода, а отсутствие обычным тестом не
 * показывается: тест на честной реализации зелен и тогда, когда он не умеет отличить честную
 * от испорченной. Поэтому набор вынесен отдельно и прогоняется дважды — по честной реализации
 * (ожидается ноль провалов) и по каждой намеренно испорченной (ожидаются поимённо названные
 * провалы). Красным становится не только неверный код, но и ослабевший зуб.
 *
 * Контекст пробы ШИРЕ, чем узкая проекция прибора, — и это существенно. На реальном вызове
 * `/v1/devices/:deviceId/collections/:collectionId/samples` оба соблазна лежат под рукой;
 * набор обязан ловить их ровно там, где они доступны, а не там, где их и так нет.
 */

import {
  OWNERSHIP_AXIS_PROVENANCE,
  resolveDeviceOwnership,
  type DeviceOwnershipRow,
  type OwnershipAxis,
} from '../ownership-axis';

export interface OwnershipProbeContext {
  readonly device: DeviceOwnershipRow;
  /** Группировка из пути. Владельцем не служит; лежит здесь затем, чтобы порча была возможна. */
  readonly collectionId?: string;
}

export type OwnershipResolverUnderTest = (ctx: OwnershipProbeContext) => OwnershipAxis;

export const OWNERSHIP_CONFORMANCE_CASES = [
  'owned-device-yields-its-membrane',
  'unowned-device-yields-absent',
  'unowned-device-with-collection-context-yields-absent',
  'membrane-never-equals-device-id',
  'membrane-never-equals-collection-id',
  'blank-membrane-is-absent',
  'two-devices-one-membrane-share-owner',
  'axis-provenance-is-device-membrane-id',
] as const;

export type OwnershipConformanceCase = (typeof OWNERSHIP_CONFORMANCE_CASES)[number];

export interface ConformanceFailure {
  readonly case: OwnershipConformanceCase;
  readonly detail: string;
}

/**
 * Приборы подобраны так, чтобы каждая величина отличалась от каждой: id прибора не совпадает
 * с мембраной, две мембраны различны, идентификатор набора не совпадает ни с чем. Совпади они
 * случайно — порча прошла бы набор, и он перестал бы что-либо удостоверять.
 */
export const OWNERSHIP_PROBE_FIXTURES = {
  ownedA: { id: 'device-1', membraneId: 'membrane-A' },
  ownedAtwin: { id: 'device-2', membraneId: 'membrane-A' },
  unowned: { id: 'device-3', membraneId: null },
  blankMembrane: { id: 'device-4', membraneId: '   ' },
} as const satisfies Record<string, DeviceOwnershipRow>;

export const OWNERSHIP_PROBE_COLLECTION_ID = 'collection-9';

/** Честная реализация: читает только `membraneId`, весь остальной контекст игнорирует. */
export const HONEST_OWNERSHIP_RESOLVER: OwnershipResolverUnderTest = (ctx) =>
  resolveDeviceOwnership(ctx.device);

function membraneIdOf(axis: OwnershipAxis): string | null {
  return axis.kind === 'membrane' ? axis.membraneId : null;
}

export function runOwnershipConformance(
  resolve: OwnershipResolverUnderTest,
): readonly ConformanceFailure[] {
  const failures: ConformanceFailure[] = [];
  const fail = (name: OwnershipConformanceCase, detail: string): void => {
    failures.push({ case: name, detail });
  };

  /** Реализация вправе бросить; для набора это такой же провал, а не крушение прогона. */
  const probe = (
    name: OwnershipConformanceCase,
    ctx: OwnershipProbeContext,
    check: (axis: OwnershipAxis) => string | null,
  ): void => {
    let axis: OwnershipAxis;
    try {
      axis = resolve(ctx);
    } catch (error) {
      fail(name, `resolver threw: ${String(error)}`);
      return;
    }
    const detail = check(axis);
    if (detail !== null) fail(name, detail);
  };

  const f = OWNERSHIP_PROBE_FIXTURES;
  const collectionId = OWNERSHIP_PROBE_COLLECTION_ID;

  // 1. Прибор с мембраной → владелец есть, и это ровно та мембрана, что записана в приборе.
  probe('owned-device-yields-its-membrane', { device: f.ownedA }, (axis) =>
    axis.kind === 'membrane' && axis.membraneId === f.ownedA.membraneId
      ? null
      : `expected membrane ${f.ownedA.membraneId}, got ${JSON.stringify(axis)}`,
  );

  // 2. Прибор без мембраны → владельца нет. Это состояние, а не отказ.
  probe('unowned-device-yields-absent', { device: f.unowned }, (axis) =>
    axis.kind === 'absent' ? null : `expected absent owner, got ${JSON.stringify(axis)}`,
  );

  // 3. Тот же прибор, но в контексте набора: наличие `collectionId` владельца не создаёт.
  probe(
    'unowned-device-with-collection-context-yields-absent',
    { device: f.unowned, collectionId },
    (axis) =>
      axis.kind === 'absent'
        ? null
        : `collectionId ${collectionId} must not produce an owner, got ${JSON.stringify(axis)}`,
  );

  // 4. Ни при каком приборе владелец не равен его же адресу.
  for (const device of Object.values(f)) {
    probe('membrane-never-equals-device-id', { device, collectionId }, (axis) => {
      const membraneId = membraneIdOf(axis);
      return membraneId !== null && membraneId === device.id
        ? `owner derived from deviceId ${device.id}`
        : null;
    });
  }

  // 5. Ни при каком приборе владелец не равен идентификатору набора.
  for (const device of Object.values(f)) {
    probe('membrane-never-equals-collection-id', { device, collectionId }, (axis) => {
      const membraneId = membraneIdOf(axis);
      return membraneId !== null && membraneId === collectionId
        ? `owner derived from collectionId ${collectionId}`
        : null;
    });
  }

  // 6. Пробельная мембрана — отсутствие владельца, а не владелец с именем из пробелов.
  probe('blank-membrane-is-absent', { device: f.blankMembrane }, (axis) =>
    axis.kind === 'absent'
      ? null
      : `blank membraneId must normalize to absent, got ${JSON.stringify(axis)}`,
  );

  // 7. Владение мембранное, а не приборное: два прибора одной мембраны дают одного владельца.
  probe('two-devices-one-membrane-share-owner', { device: f.ownedA }, (first) => {
    let second: OwnershipAxis;
    try {
      second = resolve({ device: f.ownedAtwin });
    } catch (error) {
      return `resolver threw on twin device: ${String(error)}`;
    }
    const a = membraneIdOf(first);
    const b = membraneIdOf(second);
    return a !== null && a === b
      ? null
      : `devices of one membrane must share the owner, got ${String(a)} vs ${String(b)}`;
  });

  // 8. Ось называет своё происхождение, и оно единственно допустимое.
  probe('axis-provenance-is-device-membrane-id', { device: f.ownedA, collectionId }, (axis) =>
    axis.kind === 'membrane' && axis.derivedFrom === OWNERSHIP_AXIS_PROVENANCE
      ? null
      : `expected provenance ${OWNERSHIP_AXIS_PROVENANCE}, got ${JSON.stringify(axis)}`,
  );

  return failures;
}
