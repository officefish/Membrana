/**
 * Зубы шва C: петля опыта читает ЖИВЫЕ файлы спринта, а не только фикстуры.
 *
 * Прогон: `node --test scripts/sprint-experience-seam.test.mjs`
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(repoRoot, 'scripts', 'sprint-experience.mjs');
const PLAN = 'docs/sprint/cut/workshop-wires-implementation.json';
const TRACES = 'docs/sprint/trail/workshop-wires-implementation.jsonl';
const SEGMENTS = 'docs/sprint/experience/segments-workshop-wires-implementation.json';

/** Прогон CLI. Возвращает { status, out } — падение не роняет тест, оно и есть предмет. */
function run(args) {
  try {
    return { status: 0, out: execFileSync(process.execPath, [CLI, ...args], { cwd: repoRoot, encoding: 'utf8' }) };
  } catch (e) {
    return { status: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

test('запись рода собирается из живых плана, ленты и замера', () => {
  const r = run(['--plan', PLAN, '--traces', TRACES, '--segments', SEGMENTS, '--now', '2026-07-31T10:15:00Z', '--dry-run']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /собрана из ЖИВЫХ файлов/u);
  assert.match(r.out, /точность нарезки: \d/u, 'метрика посчитана, а не «не определена»');
  assert.match(r.out, /--dry-run: журнал не тронут/u);
});

test('живые числа дают живой промах — метрика перестала быть выдуманной', () => {
  const r = run(['--plan', PLAN, '--traces', TRACES, '--segments', SEGMENTS, '--now', '2026-07-31T10:15:00Z', '--dry-run']);
  // Два блока транша перевалили порог 400 при прогнозе ниже него. Мерка обязана это видеть:
  // ради этого шов и делался — до него петля не знала ни одного настоящего предсказания.
  assert.match(r.out, /missOverflow=2/u);
  assert.match(r.out, /unattributed=0/u, 'все семь блоков привязаны к замеру');
});

test('без исхода запись не собирается — предсказание без исхода записью не является', () => {
  const r = run(['--plan', PLAN, '--now', '2026-07-31T10:15:00Z', '--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.out, /без --traces/u);
});

test('чужая схема плана отвергается с причиной, а не читается наугад', () => {
  const root = mkdtempSync(join(tmpdir(), 'exp-seam-'));
  const bogus = join(root, 'plan.json');
  writeFileSync(bogus, JSON.stringify({ planId: 'hand-made', blocks: [] }), 'utf8');
  const r = run(['--plan', bogus, '--traces', TRACES, '--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.out, /schema=\(нет\)/u);
});

test('отсутствие файла названо адресом, а не «что-то пошло не так»', () => {
  const r = run(['--plan', 'docs/sprint/cut/нет-такого.json', '--traces', TRACES, '--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.out, /файла нет — docs\/sprint\/cut\/нет-такого\.json/u);
});

test('без замера объёма исход НЕ наблюдён — это не «уложился»', () => {
  const r = run(['--plan', PLAN, '--traces', TRACES, '--now', '2026-07-31T10:15:00Z', '--dry-run']);
  assert.equal(r.status, 0, r.out);
  // Гейт объёма не считает вовсе, и подставить ноль значило бы объявить всех уложившимися.
  assert.match(r.out, /без замера объёма:/u);
  assert.match(r.out, /в мерку не входят/u);
});

test('стабы не сломаны — старый вход продолжает работать', () => {
  const r = run(['--record', 'cut-exact', '--dry-run']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Записей рода/u);
});
