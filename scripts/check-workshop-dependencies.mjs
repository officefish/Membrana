#!/usr/bin/env node
/**
 * yarn check:workshop-dependencies — зуб иерархии primary/derivative (tasks-workshop V1).
 *
 * Exit: 0 чисто · 1 нарушение · 2 проверка не состоялась (нет/битый semantics).
 * Канон: docs/audit/workshop-semantics.json · EPIC V1 · seanse m1-adress.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listWorkshopManifests } from './lib/validate-workshop.mjs';
import { checkWorkshopDependencies, normalizeRepoPath } from './lib/workshop-dependencies.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const semanticsPath = join(repoRoot, 'docs', 'audit', 'workshop-semantics.json');

if (!existsSync(semanticsPath)) {
  console.error(`check:workshop-dependencies: нет ${relative(repoRoot, semanticsPath).replace(/\\/gu, '/')}`);
  process.exitCode = 2;
} else {
  let semantics;
  try {
    semantics = JSON.parse(readFileSync(semanticsPath, 'utf8'));
  } catch {
    console.error(`check:workshop-dependencies: битый JSON ${relative(repoRoot, semanticsPath).replace(/\\/gu, '/')}`);
    process.exitCode = 2;
    semantics = null;
  }

  if (semantics) {
    const entries = [];
    let loadFailed = false;
    for (const path of listWorkshopManifests(repoRoot)) {
      try {
        const manifest = JSON.parse(readFileSync(path, 'utf8'));
        const home = normalizeRepoPath(relative(repoRoot, dirname(path)));
        entries.push({ path, home, manifest });
      } catch {
        console.error(`check:workshop-dependencies: битый манифест ${relative(repoRoot, path).replace(/\\/gu, '/')}`);
        loadFailed = true;
      }
    }

    if (loadFailed) {
      process.exitCode = 2;
    } else {
      const { violations, warnings, ok } = checkWorkshopDependencies(entries, semantics);
      console.log(`check:workshop-dependencies · манифестов: ${entries.length} · rulesVersion=${semantics.rulesVersion ?? '?'}\n`);
      for (const w of warnings) console.log(`⚠ ${w.workshop}: ${w.issue}`);
      for (const v of violations) console.log(`✗ ${v.workshop}: ${v.issue}`);
      console.log('');
      if (!ok) {
        console.error(`check:workshop-dependencies: НАРУШЕНИЙ — ${violations.length}`);
        process.exitCode = 1;
      } else {
        console.log(
          `check:workshop-dependencies: OK — иерархия соблюдена; предупреждений ${warnings.length}`,
        );
        process.exitCode = 0;
      }
    }
  }
}
