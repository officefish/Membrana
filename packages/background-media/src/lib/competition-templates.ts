import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { validateDeviceScenarioDocument } from './device-scenario-assert';
import { getPackageRootDir } from './paths';

export interface CompetitionTemplateIndexEntry {
  readonly id: string;
  readonly userCaseId: string;
  readonly documentPath: string;
  readonly executionPolicy: 'competition';
  readonly isCompetitionTemplate: boolean;
  readonly competitionTimeoutSec: number;
}

export interface CompetitionTemplateIndex {
  readonly version: number;
  readonly sprint: string;
  readonly teams: readonly CompetitionTemplateIndexEntry[];
}

function competitionTemplatesRoot(): string {
  return join(getPackageRootDir(), 'templates', 'competition');
}

/** Reads bundled competition template index (static JSON, no DB). */
export function readCompetitionTemplateIndex(): CompetitionTemplateIndex {
  const raw = readFileSync(join(competitionTemplatesRoot(), 'index.json'), 'utf8');
  return JSON.parse(raw) as CompetitionTemplateIndex;
}

/** Loads a team device-scenario template from `templates/competition/<team>/`. */
export function loadCompetitionTemplateDocument(teamId: string): Record<string, unknown> {
  const index = readCompetitionTemplateIndex();
  const entry = index.teams.find((team) => team.id === teamId);
  if (entry === undefined) {
    throw new Error(`Unknown competition team template: ${teamId}`);
  }
  const raw = readFileSync(join(competitionTemplatesRoot(), entry.documentPath), 'utf8');
  const document = JSON.parse(raw) as Record<string, unknown>;
  const validationError = validateDeviceScenarioDocument(document);
  if (validationError !== null) {
    throw new Error(`Invalid competition template ${teamId}: ${validationError}`);
  }
  return document;
}
