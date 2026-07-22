#!/usr/bin/env node
/**
 * yarn precedent:register — единственная точка записи контейнера прецедентов.
 *
 *   --new <slug> --class <c> [--title "…"] [--symptom "…"] [--cause "…"] [--fix "…"]
 *       каркас записи по схеме (валидируя class по enum) + пересбор снимка
 *   --validate            проверить все записи схемой (зуб; exit 1 при дефектах)
 *   --rebuild             пересобрать снимок-реестр registry/PRECEDENTS.md
 *
 * Источник истины — файлы прецедентов; реестр производный. Класс — из classes.json.
 * Канон: docs/precedents/README.md · спринт precedent-container.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listPrecedents, loadClassKeys, renderSnapshot } from './lib/precedent-store.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const precedentsDir = join(repoRoot, 'docs', 'precedents');

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? '') : null;
}
const has = (name) => process.argv.includes(`--${name}`);

function today() {
  return new Date().toISOString().slice(0, 10);
}
function headSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot }).toString().trim();
  } catch {
    return 'no-git';
  }
}

/** Пересобрать снимок-реестр. @returns {number} число дефектных записей */
function rebuild() {
  const precedents = listPrecedents(repoRoot);
  const dir = join(precedentsDir, 'registry');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const snap = renderSnapshot(precedents, { date: today(), sha: headSha() });
  writeFileSync(join(dir, 'PRECEDENTS.md'), `${snap}\n`);
  const bad = precedents.filter((p) => p.problems.length).length;
  console.log(`precedent:register --rebuild → снимок пересобран (${precedents.length} записей, дефектных ${bad}).`);
  return bad;
}

/** Проверить все записи. @returns {number} число дефектных */
function validate() {
  const precedents = listPrecedents(repoRoot);
  let bad = 0;
  console.log(`precedent:register --validate · записей: ${precedents.length}\n`);
  for (const p of precedents) {
    const mark = p.problems.length ? '✗' : '✓';
    console.log(`${mark} ${p.file}${p.meta?.class ? `  [${p.meta.class}]` : ''}`);
    for (const pr of p.problems) console.log(`    ✗ ${pr}`);
    if (p.problems.length) bad += 1;
  }
  console.log('');
  if (bad > 0) console.error(`precedent:register: НАРУШЕНИЙ — ${bad} из ${precedents.length} записей не прошли схему.`);
  else console.log(`precedent:register: OK — все ${precedents.length} записей валидны.`);
  return bad;
}

function scaffoldNew(slug) {
  const classKeys = loadClassKeys(repoRoot);
  const klass = flag('class');
  if (!klass) { console.error('precedent:register --new требует --class <c> (см. classes.json)'); process.exit(2); }
  if (classKeys.size > 0 && !classKeys.has(klass)) {
    console.error(`precedent:register: class «${klass}» вне classes.json (${[...classKeys].join(', ')})`); process.exit(2);
  }
  const date = today();
  const id = /^\d{4}-\d{2}-\d{2}-/u.test(slug) ? slug : `${date}-${slug}`;
  const file = join(precedentsDir, `${id}.md`);
  if (existsSync(file)) { console.error(`precedent:register: ${id}.md уже есть`); process.exit(2); }
  const title = flag('title') || slug;
  const meta = {
    id,
    date,
    class: klass,
    symptom: flag('symptom') || 'TODO: короткий симптом',
    rootCause: flag('cause') || 'TODO: системная причина',
    fix: flag('fix') || 'TODO: что сделали/делаем',
    canonicalCause: flag('cause') || 'TODO: нормализованная причина',
    prevention: 'TODO: профилактика',
    actionItems: [],
    related: [],
  };
  const body = `# Прецедент ${date}: ${title}\n\n<!-- precedent-meta\n${JSON.stringify(meta, null, 2)}\n-->\n\n## Что случилось\n\nTODO\n\n## Корень\n\nTODO\n\n## Фикс\n\nTODO\n\n## Профилактика\n\nTODO\n`;
  writeFileSync(file, body);
  console.log(`precedent:register --new → создан docs/precedents/${id}.md (заполни прозу и TODO-поля).`);
}

// --- маршрутизация ---
if (has('new')) {
  const slug = flag('new');
  if (!slug) { console.error('precedent:register --new требует <slug>'); process.exit(2); }
  scaffoldNew(slug);
  rebuild();
  process.exit(0);
}
if (has('rebuild')) { process.exit(rebuild() > 0 ? 1 : 0); }
// по умолчанию — validate (зуб)
process.exit(validate() > 0 ? 1 : 0);
