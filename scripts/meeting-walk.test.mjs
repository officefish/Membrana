// Обход дорожной карты заседания: структура, проходимость, конец.
// Регламент: docs/MEETING_REGULATION.md
import { strict as assert } from 'node:assert';
import test from 'node:test';

import { computeMeetingWalk, isStalled, roadmapProblems } from './lib/meeting-walk.mjs';

const LINE = [
  { id: 'M1', label: 'фундамент', dependsOn: [] },
  { id: 'M2', label: 'второй', dependsOn: ['M1'] },
  { id: 'M3', label: 'третий', dependsOn: ['M2'] },
];

test('в начале созывать можно только фундамент', () => {
  const w = computeMeetingWalk({ nodes: LINE, closed: [] });
  assert.deepEqual(w.ready, ['M1']);
  assert.deepEqual(
    w.blocked.map((b) => b.id),
    ['M2', 'M3'],
  );
  assert.equal(w.progress, '0/3');
  assert.equal(w.complete, false);
});

test('закрыли фундамент — открылся следующий, но не через один', () => {
  const w = computeMeetingWalk({ nodes: LINE, closed: ['M1'] });
  assert.deepEqual(w.ready, ['M2']);
  assert.deepEqual(w.blocked, [{ id: 'M3', waitingFor: ['M2'] }]);
  assert.equal(w.progress, '1/3');
});

test('все закрыты — заседание дошло до конца', () => {
  const w = computeMeetingWalk({ nodes: LINE, closed: ['M1', 'M2', 'M3'] });
  assert.equal(w.complete, true);
  assert.equal(w.progress, '3/3');
  assert.deepEqual(w.ready, []);
});

test('параллельная ветвь: два узла готовы разом (слой 1 вердикта M0)', () => {
  const nodes = [
    { id: 'M1', dependsOn: [] },
    { id: 'M2', dependsOn: ['M1'] },
    { id: 'M3', dependsOn: ['M1'] },
  ];
  const w = computeMeetingWalk({ nodes, closed: ['M1'] });
  assert.deepEqual(w.ready.sort(), ['M2', 'M3']);
});

test('цикл виден ДО прогонов, а не после сожжённого кредита', () => {
  const nodes = [
    { id: 'A', dependsOn: ['B'] },
    { id: 'B', dependsOn: ['A'] },
  ];
  const w = computeMeetingWalk({ nodes });
  assert.equal(w.problems.length > 0, true);
  assert.match(w.problems.join(' '), /цикл/u);
});

test('карта с циклом НЕ бывает пройденной, даже если все узлы закрыты', () => {
  // Иначе «дошли до конца» напечаталось бы поверх неисполнимой карты.
  const nodes = [
    { id: 'A', dependsOn: ['B'] },
    { id: 'B', dependsOn: ['A'] },
  ];
  const w = computeMeetingWalk({ nodes, closed: ['A', 'B'] });
  assert.equal(w.complete, false);
});

test('зависимость от несуществующего узла — дефект карты', () => {
  const p = roadmapProblems([{ id: 'A', dependsOn: ['ПРИЗРАК'] }]);
  assert.match(p.join(' '), /несуществующего/u);
});

test('дубль id — дефект карты', () => {
  assert.match(roadmapProblems([{ id: 'A' }, { id: 'A' }]).join(' '), /[Дд]убль/u);
});

test('тупик виден: не пройдено, а созывать нечего', () => {
  // Ровно то, что рукописный ACTIVE скрыл бы молчанием.
  const nodes = [
    { id: 'A', dependsOn: ['B'] },
    { id: 'B', dependsOn: ['A'] },
  ];
  assert.equal(isStalled(computeMeetingWalk({ nodes })), true);
  assert.equal(isStalled(computeMeetingWalk({ nodes: LINE })), false);
});

test('пустая карта — не «пройдена»', () => {
  const w = computeMeetingWalk({ nodes: [] });
  assert.equal(w.complete, false);
  assert.equal(w.progress, '0/0');
});

test('мусор на входе не роняет ядро', () => {
  assert.equal(computeMeetingWalk().complete, false);
  assert.equal(computeMeetingWalk({ nodes: null }).progress, '0/0');
});
