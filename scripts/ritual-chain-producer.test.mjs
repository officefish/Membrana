/**
 * Зубы блока ritual-wiring (спринт run-journal-producer, 03.08): цепочки ritual:day
 * и ritual:evening несут open в начале и close в конце — записи прогонов рождаются
 * ВЫЗОВОМ процедуры, не рукой. Болезнь-вещдок: 47 версий документа дня, ноль
 * записей в журнале.
 *
 * Сверка идёт ПО ФАКТУ package.json (прецедент prepush-env-guard: «проверка идёт
 * по факту, а не по догадке») — отдельный конфиг мог бы разъехаться с глаголом.
 * Обрыв цепочки здесь не проверяется: его ловит ленивое закрытие со следующего
 * утра — зубы кросс-файлового закрытия живут в procedure-run-record.test.mjs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts;

const OPEN = (procedure) => `node scripts/procedure-run-record.mjs open --procedure ${procedure}`;
const CLOSE = (procedure) => `node scripts/procedure-run-record.mjs close --procedure ${procedure} --status pass`;

for (const [verb, procedure, lastStep] of [
  ['ritual:day', 'ritual-day', 'scripts/ritual-deliver-to-main.mjs'],
  ['ritual:evening', 'ritual-evening', 'scripts/ritual-evening-run.mjs'],
]) {
  test(`${verb}: open — первый шаг цепочки, до всякой работы`, () => {
    const chain = scripts[verb];
    assert.ok(chain, `глагол ${verb} существует`);
    assert.ok(chain.startsWith(OPEN(procedure)), `цепочка начинается с open --procedure ${procedure}`);
  });

  test(`${verb}: close — после ${lastStep}, статус pass законен только доведённой цепочке`, () => {
    const chain = scripts[verb];
    const closeAt = chain.indexOf(CLOSE(procedure));
    assert.ok(closeAt > -1, `close --procedure ${procedure} --status pass в цепочке есть`);
    assert.ok(
      closeAt > chain.indexOf(lastStep),
      `close стоит ПОСЛЕ ${lastStep} — запись о доставленном, не о начатом`,
    );
    assert.equal(
      chain.split('procedure-run-record.mjs close').length - 1,
      1,
      'close один — вторая запись была бы второй правдой',
    );
  });

  test(`${verb}: сторожа не глушат — open и close без || true`, () => {
    const chain = scripts[verb];
    for (const call of [OPEN(procedure), CLOSE(procedure)]) {
      const idx = chain.indexOf(call);
      const tail = chain.slice(idx, chain.indexOf('&&', idx) === -1 ? chain.length : chain.indexOf('&&', idx));
      assert.ok(!tail.includes('|| true'), `«${call.slice(0, 50)}…» не глушится: глушёный open ломает пару, молчаливый пропуск записи — болезнь спринта`);
    }
  });

  test(`${verb}: вещдоки open и close названы существующими носителями`, () => {
    const chain = scripts[verb];
    const openSeg = chain.slice(0, chain.indexOf('&&'));
    assert.match(openSeg, /--evidence \S+/u, 'open несёт --evidence');
    const closeSeg = chain.slice(chain.indexOf(CLOSE(procedure)));
    assert.match(closeSeg, /--evidence \S+/u, 'close несёт --evidence');
  });
}

test('процедуры двух цепочек различимы: ritual-day ≠ ritual-evening', () => {
  assert.ok(!scripts['ritual:day'].includes('--procedure ritual-evening'));
  assert.ok(!scripts['ritual:evening'].includes('--procedure ritual-day'));
});
