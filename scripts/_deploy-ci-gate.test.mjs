/**
 * Зубы гейта CI перед выкаткой.
 *
 * Главная ценность — предмет запроса. 24.09 выкатка кабинета встала на ложном
 * красном: гейт листал ленту ветки (`run list --branch main --limit 50`) и искал
 * коммит среди последних пятидесяти прогонов. Три одинаковых запроса подряд дали
 * верхом то сегодняшние прогоны, то страницу трёхнедельной давности — и в
 * последнем случае гейт доложил «workflow не запускался» о зелёном CI. Ложный
 * красный тут хуже лишней строки: он учит обходить гейт флагом --allow-red-ci.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertCiGreen, isAllowRedCi } from './_deploy-ci-gate.mjs';

const SHA = '27fce605e0097cd517447ae63ea31b925a7ae8f1';

function run(overrides = {}) {
  return {
    databaseId: 1,
    headSha: SHA,
    status: 'completed',
    conclusion: 'success',
    workflowName: 'CI',
    event: 'push',
    url: 'https://github.test/run/1',
    ...overrides,
  };
}

/** Подменный `gh`: запоминает запрос и отдаёт заготовленный ответ. */
function fakeGh(runs) {
  const calls = [];
  const runGh = (args) => {
    calls.push(args);
    return JSON.stringify(runs);
  };
  return { calls, runGh };
}

test('спрашивает про коммит, а не листает ленту ветки', () => {
  const { calls, runGh } = fakeGh([run()]);
  assertCiGreen({ branch: 'main', sha: SHA, runGh });

  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes(`--commit ${SHA}`), `запрос должен быть по коммиту: ${calls[0]}`);
  assert.ok(!calls[0].includes('--branch'), `лента ветки — не предмет запроса: ${calls[0]}`);
});

test('зелёный обязательный workflow → green', () => {
  const { runGh } = fakeGh([run()]);
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: SHA, runGh }), { green: true });
});

test('красный workflow → не green (обход включён, чтобы не звать exit)', () => {
  const { runGh } = fakeGh([run({ conclusion: 'failure' })]);
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: SHA, allowRedCi: true, runGh }), {
    green: false,
  });
});

test('ещё выполняется → не green', () => {
  const { runGh } = fakeGh([run({ status: 'in_progress', conclusion: null })]);
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: SHA, allowRedCi: true, runGh }), {
    green: false,
  });
});

test('прогонов на коммите нет → не green', () => {
  const { runGh } = fakeGh([]);
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: SHA, allowRedCi: true, runGh }), {
    green: false,
  });
});

test('чужой коммит в ответе не засчитывается за свой', () => {
  const { runGh } = fakeGh([run({ headSha: 'deadbeef'.repeat(5) })]);
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: SHA, allowRedCi: true, runGh }), {
    green: false,
  });
});

test('без SHA проверка пропускается, но зелёной не объявляется', () => {
  assert.deepEqual(assertCiGreen({ branch: 'main', sha: null }), { green: false });
});

test('isAllowRedCi читает флаг и переменную', () => {
  assert.equal(isAllowRedCi(['--allow-red-ci']), true);
  assert.equal(isAllowRedCi([]), false);
});
