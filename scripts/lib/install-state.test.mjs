import assert from 'node:assert/strict';
import { test } from 'node:test';

import { INSTALL_STATES, isInside, judgeInstallState, refusalMessage } from './install-state.mjs';

test('нет каталога — absent с названной причиной', () => {
  const d = judgeInstallState({ modulesDir: false, stateFile: false });
  assert.equal(d.state, 'absent');
  assert.match(d.why, /каталога node_modules нет/u);
});

test('каталог есть, установка не завершена — absent, а не installed (наличие каталога ничего не значит)', () => {
  const d = judgeInstallState({ modulesDir: true, stateFile: false, treeRoot: 'C:/p/t', modulesRealRoot: 'C:/p/t' });
  assert.equal(d.state, 'absent');
  assert.match(d.why, /установка не завершена/u);
});

test('модули ведут в ЧУЖОЕ дерево — foreign: судья считал бы пакеты соседа (#725)', () => {
  const d = judgeInstallState({ modulesDir: true, stateFile: true, treeRoot: 'C:/p/Membrana-records', modulesRealRoot: 'C:/p/Membrana' });
  assert.equal(d.state, 'foreign');
  assert.match(d.why, /чужое дерево/u);
});

test('свои модули на месте — installed', () => {
  const d = judgeInstallState({ modulesDir: true, stateFile: true, treeRoot: 'C:/p/t', modulesRealRoot: 'C:/p/t' });
  assert.equal(d.state, 'installed');
});

test('isInside посегментно: Membrana не покрывает Membrana-tooling (префиксная ловушка 08.08)', () => {
  assert.equal(isInside('C:/p/Membrana/node_modules', 'C:/p/Membrana'), true);
  assert.equal(isInside('C:/p/Membrana-tooling/node_modules', 'C:/p/Membrana'), false);
  assert.equal(isInside('C:\\p\\Membrana\\x', 'C:/p/Membrana'), true, 'разделители Windows нормализуются');
});

test('отказ называет ОБА выхода и оговорку про EPERM — иначе лекарство упрётся в стену второй раз', () => {
  const msg = refusalMessage({ state: 'absent', why: 'каталога node_modules нет', verb: 'test', treeRoot: 'C:/p/t' });
  assert.match(msg, /yarn worktree:bootstrap/u, 'выход 1 назван');
  assert.match(msg, /EPERM/u, 'сказано, что install в песочнице может потребовать рук владельца');
  assert.match(msg, /дереве из канона, где модули уже есть/u, 'выход 2 назван');
  assert.match(msg, /ALLOW_NO_INSTALL=1/u, 'осознанный обход назван, а не спрятан');
});

test('для foreign отказ говорит про ЧУЖИЕ пакеты, а не про отсутствие установки', () => {
  const msg = refusalMessage({ state: 'foreign', why: 'node_modules ведёт в чужое дерево: C:/p/Membrana' });
  assert.match(msg, /ЧУЖИЕ/u);
  assert.doesNotMatch(msg, /без установки/u);
});

test('список состояний закрыт', () => {
  assert.deepEqual([...INSTALL_STATES], ['installed', 'absent', 'foreign']);
});
