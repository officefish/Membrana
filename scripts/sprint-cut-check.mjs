#!/usr/bin/env node
/**
 * Зуб нарезки-как-контракта: `node scripts/sprint-cut-check.mjs --plan <path>`
 * (Block `cut-contract`, коворк `cowork-honest-sprint`, Phase 2).
 *
 * Правила — чистые предикаты в `scripts/lib/sprint-cut/**`; здесь ФС, вывод и
 * код возврата. Провод `yarn sprint:cut` в `package.json` НЕ вносится: общий
 * корневой файл в изолированной фазе не трогает никто, провода — на интеграции.
 *
 * Режимы:
 *   --plan <path>              вердикт по плану (печатается всегда)
 *   --voices <path>            реестр голосов (по умолчанию живой docs/virtual-team/voices.registry.json)
 *   --ratify --at <ISO>        записать отметку владельца ИНСТРУМЕНТОМ по его явному слову
 *                              (решение владельца 30.07, прецедент morning:gate magistral)
 *   --digest                   напечатать дайджест канонического тела плана
 *
 * Exit: 0 — вердикт `contract`; 1 — `findings` или `unreadable`; 2 — инструментальная ошибка.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cutDigestOf, cutVerdict, modeOf, parseAct, ratifyPlan } from './lib/sprint-cut/index.mjs';
import { actsTrailPath, readActsTrail } from './lib/sprint-cut/acts-trail-reader.mjs';
import {
  defaultTrailPath,
  findUnclosedRuns,
  openProcedureRun,
  readProcedureRunTrail,
} from './lib/procedure-run-journal.mjs';

export { readActsTrail };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_VOICES = resolve(repoRoot, 'docs/virtual-team/voices.registry.json');

function parseArgs(argv) {
  const out = { plan: null, voices: DEFAULT_VOICES, ratify: false, at: null, digest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--plan') out.plan = argv[++i];
    else if (a === '--voices') out.voices = argv[++i];
    else if (a === '--at') out.at = argv[++i];
    else if (a === '--ratify') out.ratify = true;
    else if (a === '--digest') out.digest = true;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  if (!out.plan) throw new Error('нужен --plan <path>');
  return out;
}

/** id голосов значением: ядро файлов не читает. */
export function voiceIdsFrom(registry) {
  return (registry?.voices ?? []).map((v) => v?.id).filter((id) => typeof id === 'string' && id !== '');
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * Прогон спринта в журнале процедур (блок sprint-producer, 03.08). Словарь ленты:
 * `procedureId = "membrana-local-sprint"` — имя уже в ленте 03.08, второй диалект не
 * заводится; `runId = sprintId` (DoD блока 2).
 */
export const SPRINT_PROCEDURE_ID = 'membrana-local-sprint';

/** Лента выводится из ратификации, не из часов процесса: open и close ищут один файл. */
export function sprintTrailRelPath(plan) {
  const at = plan?.ratification?.at;
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(at)) {
    throw new Error('план без читаемой ratification.at — журнальная лента не выводится');
  }
  return defaultTrailPath(at.slice(0, 10));
}

/**
 * Обеспечить open-запись прогона спринта. Идемпотентность — буква DoD: повторный вызов
 * находит открытую (или уже закрытую) и второй не плодит. `at` open-записи — время
 * ратификации ИЗ ПЛАНА: прогон спринта начинается словом владельца, не запуском CLI.
 *
 * @param {string} repoRoot
 * @param {object} plan ратифицированный план (schema sprint-cut/1)
 * @param {string} planRelPath путь плана от корня — вещдок open-записи (manifestRef)
 * @returns {{opened: boolean, reason: string, record?: object, orphansClosed?: object[]}}
 */
export function ensureSprintRunOpen(repoRoot, plan, planRelPath) {
  const sprintId = plan?.sprintId;
  if (typeof sprintId !== 'string' || sprintId.trim() === '') {
    throw new Error('план без sprintId — прогону нечем зваться');
  }
  const trailRel = sprintTrailRelPath(plan);
  const records = readProcedureRunTrail(repoRoot, trailRel);
  if (records.some((r) => r?.runPhase === 'close' && r.runId === sprintId)) {
    return { opened: false, reason: 'прогон уже закрыт — спринт прожит, запись стоит' };
  }
  if (findUnclosedRuns(records, SPRINT_PROCEDURE_ID).some((r) => r.runId === sprintId)) {
    return { opened: false, reason: 'open-запись уже в ленте — вторая была бы второй правдой' };
  }
  const { record, orphansClosed } = openProcedureRun(repoRoot, trailRel, {
    procedureId: SPRINT_PROCEDURE_ID,
    runId: sprintId,
    subject: `спринт ${sprintId}: ратифицирован владельцем (${plan.ratification.by}), блоков ${Array.isArray(plan.blocks) ? plan.blocks.length : 0}`,
    at: plan.ratification.at,
    evidence: [planRelPath],
  });
  return { opened: true, reason: 'open-запись создана инструментом', record, orphansClosed };
}

// Читатель ленты актов ПЕРЕЕХАЛ в lib/sprint-cut/acts-trail-reader.mjs (разбор Ожегова
// 03.08, #1638): второй скрипт-потребитель сделал бы связь скрипт-к-скрипту «тайным API».
// Реэкспорт сохранён — зубы sprint-cut-acts.test.mjs импортируют отсюда.
function main(argv) {
  const args = parseArgs(argv);
  const planPath = resolve(process.cwd(), args.plan);
  const plan = readJson(planPath);

  if (args.digest) {
    console.log(cutDigestOf(plan));
    return 0;
  }

  if (args.ratify) {
    // Повторный --ratify отметку владельца НЕ переписывает: перештамповка at
    // инструментом — подделка слова владельца. Идемпотентность живёт ниже, в журнале.
    let ratified = plan;
    if (plan?.ratification?.at) {
      console.log(`sprint:cut — ратификация уже стоит (at=${plan.ratification.at}), не переписана`);
    } else {
      const res = ratifyPlan(plan, { at: args.at });
      if (!res.ok) {
        console.error(`sprint:cut — ратификация не записана: ${res.reason}`);
        return 2;
      }
      writeFileSync(planPath, `${JSON.stringify(res.plan, null, 2)}\n`, 'utf8');
      console.log(`sprint:cut — отметка владельца записана инструментом: at=${res.plan.ratification.at}`);
      console.log(`  дайджест тела: ${res.plan.ratification.digest}`);
      ratified = res.plan;
    }
    // Ратификация открывает прогон спринта в журнале процедур (блок sprint-producer,
    // 03.08): запись создаётся инструментом, не рукой — болезнь one-shot-recut.
    const planRel = relative(repoRoot, planPath).split('\\').join('/');
    const run = ensureSprintRunOpen(repoRoot, ratified, planRel);
    console.log(`  журнал: ${run.reason}${run.opened ? ` (${sprintTrailRelPath(ratified)})` : ''}`);
    for (const o of run.orphansClosed ?? []) {
      console.log(`  журнал: сирота закрыта лениво — ${o.runId} (fail/orphaned)`);
    }
    return 0;
  }

  const voices = voiceIdsFrom(readJson(resolve(process.cwd(), args.voices)));
  // Лента актов плана (седьмой зуб, 01.08). Читается ВСЕГДА, и отсутствие файла даёт
  // пустой массив, а не `undefined`: «ленты нет» и «прогона не было» — для CLI одно и то
  // же утверждение, и молчаливая зелёнка здесь как раз и была болезнью. Ядро различает
  // эти случаи (undefined = не проверяем), но живой путь обязан проверять всегда.
  const trail = readActsTrail(actsTrailPath(planPath, plan));
  if (!trail.ok) {
    console.error(
      '\nsprint:cut — лента актов плана нечитаема, вердикт НЕ выносится:\n' +
        trail.problems.map((p) => `  ✖ ${p}`).join('\n') +
        '\n  Род вне закрытого списка и битая строка — ошибка входа, а не «прочее»:\n' +
        '  молча пропустить их значило бы вынести вердикт по ленте, которой не понимаешь.\n' +
        '  Перечень родов: docs/sprint/cut/ACT_KINDS.md\n',
    );
    return 2;
  }
  const { verdict, findings } = cutVerdict(plan, { voices, acts: trail.acts });

  const blocks = Array.isArray(plan?.blocks) ? plan.blocks.length : 0;
  console.log(
    `sprint:cut — план ${plan?.sprintId ?? '(без sprintId)'} · режим ${modeOf(plan)} · блоков ${blocks} · ` +
      `вердикт ${verdict}`,
  );

  if (verdict === 'contract') {
    console.log('sprint:cut — нарезка читается как контракт: объём, исполнитель, контекст, зоны и ратификация на месте');
    return 0;
  }

  const stream = console.error;
  stream(
    verdict === 'unreadable'
      ? '\nsprint:cut — форма плана сломана, остальные проверки НЕ выполнялись (ноль находок на мусоре зелёным не бывает):'
      : `\nsprint:cut — находок: ${findings.length}`,
  );
  for (const f of findings) stream(`  ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
  return 1;
}

if (process.argv[1]?.endsWith('sprint-cut-check.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(`sprint:cut — инструментальная ошибка: ${e.message}`);
    process.exit(2);
  }
}

export { main, parseArgs };
