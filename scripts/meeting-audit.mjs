#!/usr/bin/env node
/**
 * yarn meeting:audit --id <slug> — пять проверок аудитора заседания.
 *
 * Регламент `docs/MEETING_REGULATION.md` § «Реестр и команды» объявлял эту команду,
 * файла не существовало (дефект Db заседания `meeting-evening-auditor`).
 *
 * Ненулевой код = процедура нарушена. «НЕЧЕМ» кодом не валит: отсутствие зубов у
 * проверки — не то же самое, что нарушение, и выдавать одно за другое значило бы
 * повторить ровно тот дефект, против которого этот аудит и написан.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMeetingAudit } from './lib/meeting-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const argv = process.argv.slice(2);
  const idFlag = argv.indexOf('--id');
  const id = idFlag !== -1 ? argv[idFlag + 1] : argv.find((a) => !a.startsWith('--'));

  if (!id || argv.includes('--help') || argv.includes('-h')) {
    console.log(`yarn meeting:audit --id <slug>

  Пять проверок аудитора заседания (docs/MEETING_REGULATION.md § Аудитор).
  Ненулевой код возврата = процедура нарушена.

  Читает: docs/meeting/<slug>/{M*-topic,M*_AGENDA,AGENDA_M*}.md, docs/seanses/<slug>-*.md`);
    process.exitCode = id ? 0 : 1;
    return;
  }

  const { topics, protocols, checks, violations } = runMeetingAudit(repoRoot, id);

  if (topics.length === 0 && protocols.length === 0) {
    console.error(`Заседание не найдено: docs/meeting/${id}/ (повесток 0, протоколов 0)`);
    process.exitCode = 1;
    return;
  }

  console.log(`meeting:audit — ${id} (повесток: ${topics.length}, протоколов: ${protocols.length})\n`);
  const mark = { PASS: '✓', FAIL: '✖', 'НЕЧЕМ': '?' };
  for (const c of checks) {
    console.log(`  ${mark[c.status] ?? '·'} [${c.n}] ${c.subject}\n      ${c.note}`);
  }

  console.log(
    `\nНарушений: ${violations}. ` +
      'Пустой результат = структурных нарушений нет, НЕ «процедура чиста»: ' +
      'семантическую колонизацию и спрятанную посылку машина не судит.',
  );
  if (violations > 0) process.exitCode = 2;
}

// Гард запуска: без него импорт из теста прогонял бы аудит.
if (process.argv[1]?.endsWith('meeting-audit.mjs')) main();
