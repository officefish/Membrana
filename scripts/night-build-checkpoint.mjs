#!/usr/bin/env node
/**
 * Append checkpoint в docs/NIGHT_BUILD_LOG.md
 *
 * yarn night:checkpoint --phase NB0 --status pass --note "lint green"
 */
import { appendNightCheckpoint } from './lib/night-build.mjs';

function parseArgs(argv) {
  let phase = 'NB?';
  let status = 'pass';
  let note = '';
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--phase' && argv[i + 1]) {
      phase = argv[i + 1];
      i += 1;
    } else if (a === '--status' && argv[i + 1]) {
      status = argv[i + 1];
      i += 1;
    } else if (a === '--note' && argv[i + 1]) {
      note = argv[i + 1];
      i += 1;
    }
  }
  return { phase, status, note };
}

const { phase, status, note } = parseArgs(process.argv);

try {
  const path = appendNightCheckpoint({ phase, status, note });
  console.log('Checkpoint записан:', path);
  console.log(`  ${phase} → ${status}${note ? `: ${note}` : ''}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
