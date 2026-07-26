#!/usr/bin/env node
/**
 * yarn strategic-docs:tools — таблица инструментов мастерской strategic-docs.
 *
 *   yarn strategic-docs:tools
 *   yarn strategic-docs:tools --json
 *   yarn strategic-docs:tools --zone workshop
 *   yarn strategic-docs:tools --doc publish
 *
 * Канон: docs/containers/strategic-docs/WORKSHOP.md
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inventoryWorkshopTools, readToolDoc } from './lib/strategic-docs-tools.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let json = false;
  let zone = null;
  let doc = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--zone') zone = argv[++i] ?? null;
    else if (a.startsWith('--zone=')) zone = a.slice('--zone='.length);
    else if (a === '--doc') doc = argv[++i] ?? null;
    else if (a.startsWith('--doc=')) doc = a.slice('--doc='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: yarn strategic-docs:tools [--json] [--zone workshop|contract|neighbor] [--doc <id>]`);
      process.exitCode = 0;
      return null;
    }
  }
  return { json, zone, doc };
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  /* help */
} else if (args.doc) {
  const res = readToolDoc(repoRoot, args.doc);
  if (!res.ok) {
    console.error(`strategic-docs:tools --doc: ${res.error}`);
    process.exitCode = 1;
  } else if (args.json) {
    console.log(JSON.stringify({ id: res.tool.id, path: res.path, excerpt: res.excerpt }, null, 2));
  } else {
    console.log(`# ${res.tool.id} · ${res.tool.yarn}`);
    console.log(`doc: ${res.path}`);
    console.log('');
    console.log(res.excerpt);
    if (!res.excerpt.endsWith('\n')) console.log('');
  }
} else {
  const inv = inventoryWorkshopTools(repoRoot, { zone: args.zone ?? undefined });
  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok: inv.ok,
          kit: inv.kit,
          tools: inv.tools,
          problems: inv.problems,
          warnings: inv.warnings,
        },
        null,
        2,
      ),
    );
  } else {
    if (inv.kit) console.log(`kit: ${inv.kit}`);
    process.stdout.write(inv.table);
    for (const w of inv.warnings) console.error(`⚠ ${w}`);
    for (const p of inv.problems) console.error(`✖ ${p}`);
  }
  process.exitCode = inv.ok ? 0 : 1;
}
