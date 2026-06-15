#!/usr/bin/env node
/**
 * Старт Night Build sprint → docs/NIGHT_BUILD_ACTIVE.md
 *
 * yarn night:open --id cabinet-mp4-hardening-night-build
 * yarn night:open --id <epic-id> --force
 * yarn night:open --id <epic-id> --continue
 */
import { openNightBuild } from './lib/night-build.mjs';

function parseArgs(argv) {
  let epicId = null;
  let force = false;
  let cont = false;
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') force = true;
    else if (a === '--continue') cont = true;
    else if (a === '--id' && argv[i + 1]) {
      epicId = argv[i + 1];
      i += 1;
    } else if (!a.startsWith('-') && !epicId) {
      epicId = a;
    }
  }
  return { epicId, force, continue: cont };
}

const { epicId, force, continue: cont } = parseArgs(process.argv);

if (!epicId) {
  console.error('Usage: yarn night:open --id <epic-id> [--force] [--continue]');
  process.exit(1);
}

try {
  const result = openNightBuild(epicId, { force, continue: cont });
  console.log('Night Build открыт:', result.epic.id);
  console.log('Ветка (рекомендуемая):', result.branch);
  console.log('Active:', result.activePath);
  console.log('Log:', result.logPath);
  console.log('');
  console.log('Дальше: checkout ветку, агент по epic-промпту, checkpoint каждые ~90 мин.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
