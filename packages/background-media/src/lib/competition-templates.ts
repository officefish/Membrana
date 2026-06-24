import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseDeviceScenarioDocument, type DeviceScenarioDocument } from '@membrana/core';

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
export function loadCompetitionTemplateDocument(teamId: string): DeviceScenarioDocument {
  const index = readCompetitionTemplateIndex();
  const entry = index.teams.find((team) => team.id === teamId);
  if (entry === undefined) {
    throw new Error(`Unknown competition team template: ${teamId}`);
  }
  const raw = readFileSync(join(competitionTemplatesRoot(), entry.documentPath), 'utf8');
  const parsed = parseDeviceScenarioDocument(JSON.parse(raw));
  if (!parsed.ok) {
    throw new Error(`Invalid competition template ${teamId}: ${parsed.error.message}`);
  }
  return parsed.value;
}
