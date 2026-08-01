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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cutDigestOf, cutVerdict, modeOf, parseAct, ratifyPlan } from './lib/sprint-cut/index.mjs';

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

/** Носитель ленты актов плана: рядом с планом, `trail/<sprintId>.jsonl`. */
function actsTrailPath(planPath, plan) {
  const id = typeof plan?.sprintId === 'string' && plan.sprintId.trim() ? plan.sprintId : null;
  return id ? resolve(dirname(planPath), 'trail', `${id}.jsonl`) : null;
}

/**
 * Прочитать ленту актов. Файла нет → пустая лента (не «не проверяем»).
 * Битая строка — НЕ молчаливый пропуск: она не попадает в акты, и зуб отработает так,
 * будто следа нет; открытый список родов означал бы обход проверки новым словом.
 */
function readActsTrail(path) {
  if (!path || !existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let raw;
    try {
      raw = JSON.parse(s);
    } catch {
      continue;
    }
    const parsed = parseAct(raw);
    if (parsed.ok) out.push(parsed.act);
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  const planPath = resolve(process.cwd(), args.plan);
  const plan = readJson(planPath);

  if (args.digest) {
    console.log(cutDigestOf(plan));
    return 0;
  }

  if (args.ratify) {
    const res = ratifyPlan(plan, { at: args.at });
    if (!res.ok) {
      console.error(`sprint:cut — ратификация не записана: ${res.reason}`);
      return 2;
    }
    writeFileSync(planPath, `${JSON.stringify(res.plan, null, 2)}\n`, 'utf8');
    console.log(`sprint:cut — отметка владельца записана инструментом: at=${res.plan.ratification.at}`);
    console.log(`  дайджест тела: ${res.plan.ratification.digest}`);
    return 0;
  }

  const voices = voiceIdsFrom(readJson(resolve(process.cwd(), args.voices)));
  // Лента актов плана (седьмой зуб, 01.08). Читается ВСЕГДА, и отсутствие файла даёт
  // пустой массив, а не `undefined`: «ленты нет» и «прогона не было» — для CLI одно и то
  // же утверждение, и молчаливая зелёнка здесь как раз и была болезнью. Ядро различает
  // эти случаи (undefined = не проверяем), но живой путь обязан проверять всегда.
  const acts = readActsTrail(actsTrailPath(planPath, plan));
  const { verdict, findings } = cutVerdict(plan, { voices, acts });

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
