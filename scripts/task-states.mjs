#!/usr/bin/env node
/**
 * yarn task:states <N…> — состояния issue/PR СПИСКОМ одним вызовом (#1322).
 *
 * Норма мастерской (tw-state-batch-norm): поштучный `gh issue view` в цикле запрещён —
 * 26.07 тринадцать номеров встали на пятиминутном таймауте. Канон: docs/tasks/STATES_BATCH.md.
 *
 *   yarn task:states 1310 1316 1318
 *   yarn task:states 1310 --json
 *
 * Exit: 0 — состояния получены (missing — не провал: назван по имени);
 *       1 — usage; 2 — honest unknown (сеть/прокси: состояния НЕ известны).
 */
import { fetchStatesBatch } from './lib/task-states-batch.mjs';

function main(argv) {
  const json = argv.includes('--json');
  const numbers = argv.filter((a) => a !== '--json');
  if (numbers.length === 0) {
    console.error('Usage: yarn task:states <номер…> [--json]');
    return 1;
  }
  const r = fetchStatesBatch(numbers);
  if (r.unknown) {
    console.error(`task:states — unknown: ${r.reason}`);
    return 2;
  }
  if (json) {
    console.log(JSON.stringify(r));
    return 0;
  }
  for (const [n, state] of Object.entries(r.states)) console.log(`#${n}\t${state}`);
  for (const n of r.missing) console.log(`#${n}\tНЕ НАЙДЕН`);
  return 0;
}

if (process.argv[1]?.endsWith('task-states.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
