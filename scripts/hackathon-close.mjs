#!/usr/bin/env node
/**
 * Close hackathon: verify CLOSURE.md exists, print summary.
 * Full closure is manual per docs/HACKATHON_REGULATION.md §6.
 *
 * Usage: yarn hackathon:close --id device-board-hackathon-1
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const idIdx = args.indexOf('--id');
const hackathonId = idIdx !== -1 ? args[idIdx + 1] : 'device-board-hackathon-1';

const activePath = resolve(root, 'docs/HACKATHON_ACTIVE.md');
const closurePath = resolve(root, 'docs/archive/hackathon/2026-06-17/CLOSURE.md');

if (!existsSync(activePath)) {
  console.error('Missing docs/HACKATHON_ACTIVE.md');
  process.exit(1);
}

const active = readFileSync(activePath, 'utf8');
if (!active.includes('status') || !active.includes('closed')) {
  console.error('HACKATHON_ACTIVE.md must have status: closed. See HACKATHON_REGULATION.md §6.');
  process.exit(1);
}

if (!existsSync(closurePath)) {
  console.error(`Missing ${closurePath}`);
  process.exit(1);
}

console.log(`Hackathon closed: ${hackathonId}`);
console.log(`CLOSURE: docs/archive/hackathon/2026-06-17/CLOSURE.md`);
console.log('Next: yarn ritual:day — work in epic format (docs/tasks/registry.json)');
