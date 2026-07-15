import {
  DEFAULT_COMPETITION_TIMEOUT_SEC,
  type DeviceScenarioDocument,
  type DeviceScenarioMeta,
} from '@membrana/core';

export interface CompetitionExecutionPolicy {
  readonly isCompetitionTemplate: boolean;
  readonly executionPolicy: 'competition';
  readonly timeoutSec: number;
}

/** Resolved competition limits for scenario runtime. */
export interface CompetitionRunLimits {
  readonly timeoutMs: number;
}

/** Returns competition policy when document runs under competition restrictions. */
export function resolveCompetitionExecutionPolicy(
  meta: DeviceScenarioMeta | undefined,
): CompetitionExecutionPolicy | null {
  if (meta?.executionPolicy !== 'competition') {
    return null;
  }
  const timeoutSec = meta.competitionTimeoutSec ?? DEFAULT_COMPETITION_TIMEOUT_SEC;
  return {
    isCompetitionTemplate: meta.isCompetitionTemplate === true,
    executionPolicy: 'competition',
    timeoutSec: timeoutSec > 0 ? timeoutSec : DEFAULT_COMPETITION_TIMEOUT_SEC,
  };
}

export function isCompetitionDocument(document: DeviceScenarioDocument): boolean {
  return resolveCompetitionExecutionPolicy(document.meta) !== null;
}

export function resolveCompetitionRunLimits(
  document: DeviceScenarioDocument,
): CompetitionRunLimits | null {
  const policy = resolveCompetitionExecutionPolicy(document.meta);
  if (policy === null) {
    return null;
  }
  return { timeoutMs: policy.timeoutSec * 1000 };
}

/** Stamps competition meta on team-pack documents (idempotent). */
export function stampCompetitionDocumentMeta(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  if (document.meta?.executionPolicy === 'competition') {
    return document;
  }
  return {
    ...document,
    meta: {
      ...document.meta,
      isCompetitionTemplate: true,
      executionPolicy: 'competition',
      competitionTimeoutSec:
        document.meta?.competitionTimeoutSec ?? DEFAULT_COMPETITION_TIMEOUT_SEC,
    },
  };
}

/** Structure edits (delete, collapse, paste) blocked; parameters remain editable. */
export function isCompetitionStructureLocked(meta: DeviceScenarioMeta | undefined): boolean {
  return resolveCompetitionExecutionPolicy(meta) !== null;
}

/**
 * Removes competition meta from a document (idempotent) — inverse of
 * {@link stampCompetitionDocumentMeta}. FREE-tier шаблоны, дериватированные из
 * competition-форков (напр. combined-alarm из Beta), не должны наследовать
 * `executionPolicy: 'competition'`: это включило бы `isCompetitionStructureLocked`
 * и заблокировало правку структуры у бесплатного пользователя. Клонирует meta,
 * общий кэш документа-донора не мутирует.
 */
export function stripCompetitionDocumentMeta(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  if (document.meta?.executionPolicy !== 'competition') {
    return document;
  }
  const { isCompetitionTemplate, executionPolicy, competitionTimeoutSec, ...restMeta } =
    document.meta;
  void isCompetitionTemplate;
  void executionPolicy;
  void competitionTimeoutSec;
  return { ...document, meta: restMeta };
}
