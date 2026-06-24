#!/usr/bin/env node
/**
 * Exports competition team device-scenario JSON into background-media templates.
 *
 * Usage: node scripts/export-competition-templates.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'packages/background-media/templates/competition');

const TEAMS = ['alpha', 'beta', 'gamma'];

async function loadTeamDocuments() {
  const yarnCmd = 'yarn';
  const build = spawnSync(yarnCmd, ['workspace', '@membrana/device-board', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (build.status !== 0) {
    throw new Error('device-board build failed before template export');
  }

  const loaders = {
    alpha: 'getDefaultMvpMicrophoneAlphaDocument',
    beta: 'getDefaultMvpMicrophoneBetaDocument',
    gamma: 'getDefaultMvpMicrophoneGammaDocument',
  };

  /** @type {Record<string, unknown>} */
  const documents = {};

  for (const team of TEAMS) {
    const mod = await import(
      pathToFileURL(
        join(root, `packages/device-board/dist/graph/default-usercase-mvp-microphone-${team}.js`),
      ).href
    );
    const fn = mod[loaders[team]];
    if (typeof fn !== 'function') {
      throw new Error(`Missing loader ${loaders[team]} for team ${team}`);
    }
    documents[team] = fn();
  }

  return documents;
}

try {
  const documents = await loadTeamDocuments();
  mkdirSync(outRoot, { recursive: true });

  const index = {
    version: 1,
    sprint: 'comp-mvp-packaging-2026-06-21',
    teams: TEAMS.map((team) => ({
      id: team,
      userCaseId: `usercase-mvp-microphone-${team}`,
      documentPath: `${team}/device-scenario.json`,
      executionPolicy: 'competition',
      isCompetitionTemplate: true,
      competitionTimeoutSec: documents[team]?.meta?.competitionTimeoutSec ?? 600,
    })),
  };

  writeFileSync(join(outRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  for (const team of TEAMS) {
    const teamDir = join(outRoot, team);
    mkdirSync(teamDir, { recursive: true });
    writeFileSync(
      join(teamDir, 'device-scenario.json'),
      `${JSON.stringify(documents[team], null, 2)}\n`,
      'utf8',
    );
  }

  console.log(`Exported competition templates → ${outRoot}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
