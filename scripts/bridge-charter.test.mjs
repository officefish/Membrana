/**
 * Зуб weave P4–P5 (M4, #1353): двусторонний провенанс кейсы ↔ устав.
 *
 * Красное в ЛЮБУЮ сторону:
 *  - bearing-кейс каталога без derivedInstructionId;
 *  - derivedInstructionId кейса не находит инструкцию в CHARTER;
 *  - derivedFrom устава указывает на несуществующий или не-bearing кейс
 *    (кейсы со status ≠ bearing не вшиваются);
 *  - манифест фреймов потерял указатель charter.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CASES_DIR = join(repoRoot, 'docs/meeting/bridge-command-post/cases');
const CHARTER = readFileSync(join(repoRoot, 'docs/bridge/CHARTER.md'), 'utf8');

function readCases() {
  const out = [];
  for (const name of readdirSync(CASES_DIR).sort()) {
    if (!name.endsWith('.md')) continue;
    const md = readFileSync(join(CASES_DIR, name), 'utf8');
    const status = md.match(/^- status: (.+)$/mu)?.[1]?.trim() ?? null;
    const instr = md.match(/^- derivedInstructionId: (.+)$/mu)?.[1]?.trim() ?? null;
    const id = md.match(/^- id: (.+)$/mu)?.[1]?.trim() ?? name.slice(0, -3);
    out.push({ id, status, instr: instr === 'null' ? null : instr });
  }
  return out;
}

const cases = readCases();
const bearing = cases.filter((c) => c.status === 'bearing');
const weaveMarks = [...CHARTER.matchAll(/<!-- derivedFrom: case:(\S+) instruction:(\S+) -->/gu)]
  .map((m) => ({ caseId: m[1], instr: m[2] }));

test('каталог кейсов не пуст и несёт bearing-печати (иначе зуб сверяет пустоту)', () => {
  assert.ok(bearing.length >= 1, 'ни одного bearing-кейса — weave не с чего');
});

test('каждый bearing-кейс несёт derivedInstructionId (P5: обратная ссылка заполнена)', () => {
  for (const c of bearing) {
    assert.ok(c.instr, `bearing-кейс «${c.id}» без derivedInstructionId — weave не завершён`);
  }
});

test('derivedInstructionId каждого bearing-кейса находит свою инструкцию в CHARTER', () => {
  for (const c of bearing) {
    const mark = weaveMarks.find((w) => w.caseId === c.id);
    assert.ok(mark, `в CHARTER нет derivedFrom для «${c.id}»`);
    assert.equal(mark.instr, c.instr, `«${c.id}»: подвал говорит ${c.instr}, устав — ${mark.instr}`);
    assert.ok(CHARTER.includes(`## ${c.instr}`), `инструкция «${c.instr}» без собственного раздела в уставе`);
  }
});

test('каждый derivedFrom устава указывает на существующий bearing-кейс (не-bearing не вшивается)', () => {
  for (const w of weaveMarks) {
    const c = cases.find((x) => x.id === w.caseId);
    assert.ok(c, `устав ссылается на несуществующий кейс «${w.caseId}»`);
    assert.equal(c.status, 'bearing', `устав вшил «${w.caseId}» со status=${c.status} — вшиваются только bearing`);
  }
});

test('видимая человеку ссылка стоит рядом с машинной у каждой инструкции', () => {
  for (const w of weaveMarks) {
    assert.ok(CHARTER.includes(`(../meeting/bridge-command-post/cases/${w.caseId}.md)`), `у «${w.instr}» нет видимой ссылки на кейс`);
  }
});

test('манифест фреймов несёт указатель charter (полем верхнего уровня, не фреймом)', () => {
  const m = JSON.parse(readFileSync(join(repoRoot, 'docs/bridge/frames.manifest.json'), 'utf8'));
  assert.equal(m.charter, 'docs/bridge/CHARTER.md');
  assert.ok(!(m.frames ?? []).some((f) => String(f.id ?? '').includes('charter')), 'charter не должен быть фреймом');
});
