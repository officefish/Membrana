import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  forkNamed,
  isStarted,
  closeTriggered,
  isClosed,
  isOpen,
  isNotStarted,
  lifecycleStatus,
} from './lib/storm-lifecycle.mjs';

/** Полностью открытый шторм (начат, без триггера закрытия). */
const OPEN = {
  dirExists: true,
  topic: 'формат шторма',
  topicByOwner: true,
  pora: false,
  sevenBreaths: false,
  fork: null,
};

test('forkNamed: «никуда» — валидная развилка, пустота — нет', () => {
  assert.equal(forkNamed({ fork: 'заседание' }), true);
  assert.equal(forkNamed({ fork: 'никуда' }), true, '«никуда» — явное слово владельца');
  assert.equal(forkNamed({ fork: '' }), false);
  assert.equal(forkNamed({ fork: '   ' }), false);
  assert.equal(forkNamed({ fork: null }), false);
});

test('isStarted: дом + непустой предмет + назван владельцем', () => {
  assert.equal(isStarted(OPEN), true);
  assert.equal(isStarted({ ...OPEN, dirExists: false }), false, 'нет дома');
  assert.equal(isStarted({ ...OPEN, topic: '' }), false, 'пустой предмет');
  assert.equal(isStarted({ ...OPEN, topic: null }), false, 'нет предмета');
  assert.equal(isStarted({ ...OPEN, topicByOwner: false }), false, 'предмет не владельца');
});

test('closeTriggered: пол «пора» ИЛИ потолок семь вдохов', () => {
  assert.equal(closeTriggered({ pora: false, sevenBreaths: false }), false);
  assert.equal(closeTriggered({ pora: true, sevenBreaths: false }), true, 'пол');
  assert.equal(closeTriggered({ pora: false, sevenBreaths: true }), true, 'потолок');
});

test('isClosed: начат ∧ триггер ∧ развилка', () => {
  const closedByPora = { ...OPEN, pora: true, fork: 'заседание' };
  const closedBySeven = { ...OPEN, sevenBreaths: true, fork: 'никуда' };
  assert.equal(isClosed(closedByPora), true, 'пора + развилка');
  assert.equal(isClosed(closedBySeven), true, 'семь вдохов + «никуда»');
});

test('isClosed: триггер БЕЗ развилки — НЕ закрыт (анти-паразит, молчаливое закрытие)', () => {
  assert.equal(isClosed({ ...OPEN, pora: true, fork: null }), false);
  assert.equal(isClosed({ ...OPEN, sevenBreaths: true, fork: '' }), false);
  // и он остаётся открытым, а не «повис»
  assert.equal(isOpen({ ...OPEN, pora: true, fork: null }), true);
});

test('isOpen: пустой/безымянный дом — НЕ открыт (анти-паразит)', () => {
  assert.equal(isOpen(OPEN), true);
  assert.equal(isOpen({ ...OPEN, topic: '' }), false, 'безымянный не открыт');
  assert.equal(isOpen({ ...OPEN, dirExists: false }), false, 'пустой не открыт');
  assert.equal(isOpen({ ...OPEN, pora: true, fork: 'заседание' }), false, 'закрытый не открыт');
});

test('РАТИФИЦИРОВАННЫЙ ИНВАРИАНТ: ровно один из open/closed/not-started для любого state', () => {
  const bools = [true, false];
  let checked = 0;
  for (const dirExists of bools)
    for (const topicByOwner of bools)
      for (const pora of bools)
        for (const sevenBreaths of bools)
          for (const topic of ['', 'X'])
            for (const fork of [null, '', 'никуда', 'спринт']) {
              const s = { dirExists, topic, topicByOwner, pora, sevenBreaths, fork };
              const flags = [isOpen(s), isClosed(s), isNotStarted(s)];
              const trueCount = flags.filter(Boolean).length;
              assert.equal(trueCount, 1, `ровно один статус для ${JSON.stringify(s)}`);
              // и lifecycleStatus согласован с предикатами
              const st = lifecycleStatus(s);
              assert.equal(
                { open: isOpen(s), closed: isClosed(s), 'not-started': isNotStarted(s) }[st],
                true,
                `lifecycleStatus=${st} согласован`,
              );
              checked += 1;
            }
  assert.ok(checked >= 128, `перебрано состояний: ${checked}`);
});
