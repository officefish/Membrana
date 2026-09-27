#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_REPEATS,
  DEFAULT_TRACE_SIZES,
  DEFAULT_WARMUP,
  runScenarioTraceTeardownBenchmark,
} from './lib/scenario-trace-teardown-measure.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');

function parseArgs(argv) {
  const options = {
    sizes: DEFAULT_TRACE_SIZES,
    repeats: DEFAULT_REPEATS,
    warmup: DEFAULT_WARMUP,
    subscribers: 1,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === '--sizes') {
      if (!value || value.startsWith('-')) throw new Error('--sizes requires comma-separated numbers');
      options.sizes = value.split(',').map((item) => Number.parseInt(item, 10));
      i += 1;
    } else if (arg === '--repeats') {
      if (!value || value.startsWith('-')) throw new Error('--repeats requires a number');
      options.repeats = Number.parseInt(value, 10);
      i += 1;
    } else if (arg === '--warmup') {
      if (!value || value.startsWith('-')) throw new Error('--warmup requires a number');
      options.warmup = Number.parseInt(value, 10);
      i += 1;
    } else if (arg === '--subscribers') {
      if (!value || value.startsWith('-')) throw new Error('--subscribers requires a number');
      options.subscribers = Number.parseInt(value, 10);
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (options.sizes.some((size) => !Number.isInteger(size) || size < 0)) {
    throw new Error('--sizes must contain non-negative integers');
  }
  for (const key of ['repeats', 'warmup', 'subscribers']) {
    if (!Number.isInteger(options[key]) || options[key] < 0) {
      throw new Error(`--${key} must be a non-negative integer`);
    }
  }
  if (options.repeats === 0) throw new Error('--repeats must be greater than zero');
  return options;
}

function readMaxTraceLines() {
  const sourcePath = join(REPO_ROOT, 'apps/client/src/modules/device-board/scenarioTraceBuffer.ts');
  const source = readFileSync(sourcePath, 'utf8');
  const match = source.match(/const\s+MAX_TRACE_LINES\s*=\s*([\d_]+)/);
  if (!match) throw new Error(`MAX_TRACE_LINES not found in ${sourcePath}`);
  return Number.parseInt(match[1].replaceAll('_', ''), 10);
}

function ms(value) {
  return value.toFixed(3);
}

function printTable(results) {
  console.log('| Строк | stop recording median/p95 ms | exit/unload persist median/p95 ms | clear median/p95 ms | snapshot median/p95 ms | persist bytes |');
  console.log('|------:|-----------------------------:|----------------------------------:|-------------------:|----------------------:|--------------:|');
  for (const row of results) {
    console.log(
      `| ${row.size} | ${ms(row.stopRecording.medianMs)} / ${ms(row.stopRecording.p95Ms)} | ` +
        `${ms(row.exitBoard.medianMs)} / ${ms(row.exitBoard.p95Ms)} | ` +
        `${ms(row.clear.medianMs)} / ${ms(row.clear.p95Ms)} | ` +
        `${ms(row.snapshot.medianMs)} / ${ms(row.snapshot.p95Ms)} | ` +
        `${row.exitBoard.sinkBytes} |`,
    );
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    const maxLines = readMaxTraceLines();
    const results = runScenarioTraceTeardownBenchmark({ ...options, maxLines });
    console.log(`# scenario trace teardown measurement`);
    console.log(`maxLines=${maxLines}; repeats=${options.repeats}; warmup=${options.warmup}; subscribers=${options.subscribers}`);
    console.log(`node=${process.version}; platform=${process.platform}/${process.arch}`);
    console.log('');
    printTable(results);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('measure-scenario-trace-teardown.mjs')) main();
