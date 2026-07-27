#!/usr/bin/env node
/**
 * yarn case:register — единственная точка записи + валидатор + пересбор снимка (#1298).
 *
 *   yarn case:register --new <slug> --mechanism <key> [--home bridge] [--date YYYY-MM-DD]
 *   yarn case:register --validate     # audit: подвалы полны, evidence-ссылки живы
 *   yarn case:register --rebuild      # пересобрать производный снимок registry/CASES.md
 *
 * Exit: 0 — чисто/записано; 1 — находки валидации; 2 — инструментальная ошибка.
 * Каркас --new создаётся с легальными «нет» там, где значения ещё нет, — честная
 * заготовка вместо заглушек (зверь «Заглушка» #1219).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listCases, loadMechanismKeys, renderSnapshot } from './lib/case-store.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const casesDir = join(repoRoot, 'docs', 'cases');

function parseArgs(argv) {
  const o = { new: null, mechanism: null, home: null, date: null, validate: false, rebuild: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--new') o.new = argv[(i += 1)];
    else if (a === '--mechanism') o.mechanism = argv[(i += 1)];
    else if (a === '--home') o.home = argv[(i += 1)];
    else if (a === '--date') o.date = argv[(i += 1)];
    else if (a === '--validate') o.validate = true;
    else if (a === '--rebuild') o.rebuild = true;
    else {
      console.error(`case:register — неизвестный аргумент «${a}»`);
      return null;
    }
  }
  return o;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function scaffold(id, { mechanism, home, date }) {
  const meta = {
    id,
    date: date ?? todayISO(),
    home: home ?? { none: 'дом эпизода не указан при регистрации — уточнить' },
    span: { none: 'архив не отдаёт адресуемый отрезок (session-archive-must-yield-addressable-span, #1229)' },
    actors: { none: 'участники не перечислены при регистрации — уточнить' },
    evidence: { none: 'вещдок-изъятие от архивариуса ещё не создан (#1229)' },
    mechanism,
    repeatable: 'conditional',
    cost: { none: 'цена не измерялась в момент эпизода' },
    proofs: { none: 'доказательства не перечислены при регистрации — уточнить' },
    firmness: { none: 'шкала твёрдости не размечалась в эпизоде' },
    links: ['issue:#1298'],
  };
  return `<!-- case-meta\n${JSON.stringify(meta, null, 2)}\n-->\n\n# ${id}\n\n_Что происходило · чем ценно · чего не хватает, чтобы повторить._\n`;
}

function rebuild() {
  const cases = listCases(repoRoot);
  const regDir = join(casesDir, 'registry');
  mkdirSync(regDir, { recursive: true });
  writeFileSync(join(regDir, 'CASES.md'), renderSnapshot(cases, { date: todayISO() }), 'utf8');
  console.log(`case:register — снимок пересобран (${cases.length} кейс(ов)) → docs/cases/registry/CASES.md`);
  return cases;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o) return 2;
  try {
    if (o.new) {
      const keys = loadMechanismKeys(repoRoot);
      if (!o.mechanism || !keys.has(o.mechanism)) {
        console.error(`case:register — --mechanism обязателен и из закрытого перечня (${[...keys].join(', ')})`);
        return 2;
      }
      const id = `${o.date ?? todayISO()}-${o.new}`;
      const file = join(casesDir, `${id}.md`);
      if (existsSync(file)) {
        console.error(`case:register — ${id}.md уже существует (реестр append-only: поправка — новой записью)`);
        return 2;
      }
      writeFileSync(file, scaffold(id, o), 'utf8');
      console.log(`case:register — каркас создан: docs/cases/${id}.md (легальные «нет» — заполнить или оставить с причиной)`);
      rebuild();
      return 0;
    }
    if (o.rebuild) {
      rebuild();
      return 0;
    }
    // --validate (и поведение по умолчанию): зуб полноты подвалов и живости ссылок.
    const cases = listCases(repoRoot);
    let findings = 0;
    for (const c of cases) {
      for (const p of c.problems) {
        console.error(`  ✗ ${c.id}: ${p}`);
        findings += 1;
      }
    }
    const snapPath = join(casesDir, 'registry', 'CASES.md');
    if (existsSync(snapPath)) {
      const fresh = renderSnapshot(cases, { date: 'q' }).replace(/Пересобран: q ·/u, '');
      const disk = readFileSync(snapPath, 'utf8').replace(/Пересобран: [^·]*·/u, '');
      if (fresh !== disk) {
        console.error('  ✗ снимок registry/CASES.md отстал от файлов — yarn case:register --rebuild');
        findings += 1;
      }
    }
    if (findings > 0) {
      console.error(`case:register --validate — находок: ${findings}`);
      return 1;
    }
    console.log(`case:register --validate — OK: ${cases.length} кейс(ов), подвалы полны, ссылки живы`);
    return 0;
  } catch (e) {
    console.error(`case:register — инструментальная ошибка: ${e.message}`);
    return 2;
  }
}

if (process.argv[1]?.endsWith('case-register.mjs')) process.exit(main());
