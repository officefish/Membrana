#!/usr/bin/env node
/**
 * yarn check:workshop-ownership — зуб принадлежности инструмента (Ф4).
 *
 * Собирает доменные инструменты всех мастерских, сверяет приписку и уникальность,
 * амнистирует по docs/audit/workshop-ownership-allowlist.json (#915 до создания
 * процедурной мастерской). Роняет прогон (exit 1) при неамнистированных нарушениях.
 *
 * Канон: docs/patterns/HOME_WORKSHOP.md (Ф4) · заседание home-workshop.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listWorkshopManifests, workshopHome } from './lib/validate-workshop.mjs';
import { checkOwnership, extractOwnedTools } from './lib/workshop-ownership.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const allowPath = join(repoRoot, 'docs', 'audit', 'workshop-ownership-allowlist.json');
let allowlist = [];
if (existsSync(allowPath)) {
  try {
    allowlist = JSON.parse(readFileSync(allowPath, 'utf8')).allow ?? [];
  } catch {
    console.error(`check:workshop-ownership: битый allowlist ${allowPath}`);
    process.exit(1);
  }
}

const records = [];
for (const path of listWorkshopManifests(repoRoot)) {
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    records.push(...extractOwnedTools(manifest, workshopHome(path)));
  } catch {
    console.error(`check:workshop-ownership: битый манифест ${path}`);
    process.exit(1);
  }
}

const { violations, amnestied, ok } = checkOwnership(records, allowlist);

console.log(`check:workshop-ownership · доменных инструментов: ${records.length}\n`);
for (const r of ok) console.log(`✓ ${r.name} → ${r.manifestWorksOn}`);
for (const a of amnestied) console.log(`⚠ ${a.name} — амнистия: ${a.allow.reason} (до: ${a.allow.expiresWhen})`);
for (const v of violations) console.log(`✗ ${v.message}`);

console.log('');
if (violations.length > 0) {
  console.error(`check:workshop-ownership: НАРУШЕНИЙ — ${violations.length} (мис-филинг/дубль).`);
  process.exit(1);
}
console.log(`check:workshop-ownership: OK — приписка и уникальность соблюдены; амнистий ${amnestied.length}.`);
