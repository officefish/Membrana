#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  formatHeadroomTelemetryMarkdown,
  loadHeadroomTelemetryPayload,
  summarizeHeadroomTelemetry,
} from './lib/headroom-agent-telemetry.mjs';

function parseArgs(argv) {
  const out = { input: '', format: 'markdown' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') out.input = argv[++i] ?? '';
    else if (arg.startsWith('--input=')) out.input = arg.slice('--input='.length);
    else if (arg === '--format') out.format = argv[++i] ?? 'markdown';
    else if (arg.startsWith('--format=')) out.format = arg.slice('--format='.length);
    else if (arg === '--help' || arg === '-h') out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.input) {
  console.log(`Usage: node scripts/headroom-agent-report.mjs --input <json> [--format markdown|json]

Input may be:
- { "events": [...] } with explicit agent telemetry events
- a legacy headroom perf report with "headroom_perf"`);
  process.exit(args.help ? 0 : 1);
}

const payload = JSON.parse(readFileSync(resolve(process.cwd(), args.input), 'utf8'));
const events = loadHeadroomTelemetryPayload(payload);
const summary = summarizeHeadroomTelemetry(events, payload.operationalWork ?? payload.operational_work ?? []);

if (args.format === 'json') {
  console.log(JSON.stringify(summary, null, 2));
} else {
  process.stdout.write(formatHeadroomTelemetryMarkdown(summary));
}
