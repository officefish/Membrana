/**
 * Именованные отказы оси владения.
 *
 * Вердикт M1: операции, требующие владельца, на приборе без мембраны дают ЯВНУЮ ошибку.
 * Явную — значит не `null`, не `undefined` и не молчаливо пустой результат: молчание вызывающий
 * примет за «ничего не нашлось» и поедет дальше, а это ровно тот исход, которого вердикт
 * запрещает.
 *
 * Отказы здесь доменные, не HTTP. Отображение в статус — предмет двери (M2), и своё
 * одностороннее предложение блок держит в EXPECTATIONS, а не в коде.
 */

/** Прибор законно существует, но владельца у него нет — третье состояние, не 404 и не 403. */
export const OWNERSHIP_MEMBRANE_ABSENT = 'OWNERSHIP_MEMBRANE_ABSENT' as const;

/** Оси владения подсунули чужое происхождение: собрана мимо `resolveDeviceOwnership`. */
export const OWNERSHIP_PROVENANCE_VIOLATION = 'OWNERSHIP_PROVENANCE_VIOLATION' as const;

export class MembraneOwnerRequiredError extends Error {
  readonly code = OWNERSHIP_MEMBRANE_ABSENT;

  constructor(
    readonly deviceId: string,
    /** Имя операции едет в отказе, чтобы он был читаем на стороне вызывающего. */
    readonly operation: string,
  ) {
    super(
      `Operation "${operation}" requires a library owner, but device ${deviceId} has no membrane. ` +
        'Ownership is never inferred from deviceId or collectionId.',
    );
    this.name = 'MembraneOwnerRequiredError';
  }
}

export class OwnershipProvenanceViolationError extends Error {
  readonly code = OWNERSHIP_PROVENANCE_VIOLATION;

  constructor(readonly derivedFrom: unknown) {
    super(
      `Ownership axis carries provenance ${JSON.stringify(derivedFrom)}; ` +
        'the only admissible source of ownership is device.membraneId.',
    );
    this.name = 'OwnershipProvenanceViolationError';
  }
}
