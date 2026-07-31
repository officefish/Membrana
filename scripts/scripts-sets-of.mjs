#!/usr/bin/env node
/**
 * `yarn scripts:sets-of <path>` — обратный поиск: в каких наборах лежит файл.
 *
 * Глагол `inspectElement` мастерской: рассмотрение ОДНОГО элемента вглубь. Набором считается
 * только кит (§4) — не неймспейс и не дом.
 *
 * Три молчания различаются и печатаются словами: набор пуст ≠ набора нет ≠ файл ни в одном
 * наборе. С флагом `--set <id>` спрашивают про набор, без него — про файл.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SETS_OF_OUTCOMES, SILENCES, inspectSet, setsOf } from './lib/scripts-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const OUTCOME_WORDS = Object.freeze({
  [SETS_OF_OUTCOMES.FOUND]: 'состоит в одном наборе',
  [SETS_OF_OUTCOMES.FOUND_MULTI]: 'состоит в нескольких наборах — это факт, не ошибка',
  [SETS_OF_OUTCOMES.NOT_IN_ANY_SET]: 'файл проверен, ни в одном наборе не состоит',
  [SETS_OF_OUTCOMES.UNKNOWN_PATH]: 'такого пути в дереве нет — это НЕ «ни в одном наборе»',
});

const SILENCE_WORDS = Object.freeze({
  [SILENCES.NOT_DECLARED]: 'набора с таким id не объявлено',
  [SILENCES.SET_EMPTY]: 'набор объявлен, членов ноль',
});

function main(argv) {
  const asJson = argv.includes('--json');
  const setFlag = argv.indexOf('--set');
  const rest = argv.filter((a) => !a.startsWith('--'));

  if (setFlag !== -1) {
    const id = argv[setFlag + 1] ?? '';
    const res = inspectSet(repoRoot, id);
    if (asJson) {
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
    } else {
      const head = res.silence === null ? `членов ${res.members.length}` : SILENCE_WORDS[res.silence];
      process.stdout.write(`scripts:sets-of --set ${id} · ${head}\n${res.members.map((m) => `    ${m}`).join('\n')}\n`);
    }
    return res.silence === SILENCES.NOT_DECLARED ? 1 : 0;
  }

  if (rest.length === 0) {
    process.stderr.write('scripts:sets-of <path> | --set <id> [--json]\n');
    return 2;
  }

  const res = setsOf(repoRoot, rest[0]);
  if (asJson) {
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
    return res.outcome === SETS_OF_OUTCOMES.UNKNOWN_PATH ? 2 : 0;
  }
  const lines = [`scripts:sets-of ${res.path} · ${OUTCOME_WORDS[res.outcome]}`];
  for (const s of res.sets) lines.push(`    кит ${s.id}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return res.outcome === SETS_OF_OUTCOMES.UNKNOWN_PATH ? 2 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scripts-sets-of.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
