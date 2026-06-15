#!/usr/bin/env node
/**
 * Закрытие Night Build → docs/archive/night-build/<date>/HANDOFF.md
 *
 * yarn night:close --id cabinet-mp4-hardening-night-build
 */
import { closeNightBuild } from './lib/night-build.mjs';

function parseEpicId(argv) {
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--id' && argv[i + 1]) return argv[i + 1];
    if (!argv[i].startsWith('-')) return argv[i];
  }
  return null;
}

const epicId = parseEpicId(process.argv);

if (!epicId) {
  console.error('Usage: yarn night:close --id <epic-id>');
  process.exit(1);
}

try {
  const { handoffPath, dateKey } = closeNightBuild(epicId);
  console.log('Night Build закрыт:', epicId);
  console.log('Handoff:', handoffPath);
  console.log('Утро: прочитать handoff → yarn ritual:day → merge PR');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
