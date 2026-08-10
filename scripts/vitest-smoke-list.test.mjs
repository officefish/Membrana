import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDependents,
  computeSelection,
  expandWorkspaceGlobs,
  readWorkspacePackages,
  renderCatalog,
  selectSmoke,
  SMOKE_FANIN_THRESHOLD,
  transitiveFanIn,
} from './lib/vitest-workspace.mjs';

/** Дерево значением: io подменяем целиком, живой ФС в зубах не участвует. */
function fakeIo(files, dirs = {}) {
  return {
    exists: (rel) => Object.hasOwn(files, rel) || Object.hasOwn(dirs, rel),
    read: (rel) => {
      if (!Object.hasOwn(files, rel)) throw new Error(`нет файла ${rel}`);
      return files[rel];
    },
    readdir: (rel) => dirs[rel] ?? [],
  };
}

const pkg = (name, deps = [], hasTest = true) =>
  JSON.stringify({ name, dependencies: Object.fromEntries(deps.map((d) => [d, '*'])), scripts: hasTest ? { test: 'vitest run' } : {} });

test('порог назван константой и держит отбор', () => {
  const packages = [
    { name: 'a', dir: 'packages/a', hasTest: true, deps: [] },
    ...Array.from({ length: SMOKE_FANIN_THRESHOLD }, (_, i) => ({
      name: `d${i}`,
      dir: `packages/d${i}`,
      hasTest: true,
      deps: ['a'],
    })),
  ];
  assert.deepEqual(selectSmoke(packages).smoke, ['a'], 'ровно порог — уже внутри');

  const oneShort = packages.slice(0, SMOKE_FANIN_THRESHOLD);
  assert.deepEqual(selectSmoke(oneShort).smoke, [], 'на единицу ниже порога — снаружи');
});

test('обрыв в графе виден в ranking, а не принимается на веру', () => {
  const packages = [
    { name: 'core', dir: 'packages/core', hasTest: true, deps: [] },
    { name: 'mid', dir: 'packages/mid', hasTest: true, deps: ['core'] },
    { name: 'leaf', dir: 'packages/leaf', hasTest: true, deps: ['mid'] },
  ];
  const sel = selectSmoke(packages, 2);
  assert.deepEqual(sel.ranking, [{ name: 'core', fanIn: 2 }, { name: 'mid', fanIn: 1 }]);
  assert.deepEqual(sel.smoke, ['core']);
  assert.ok(!sel.ranking.some((r) => r.name === 'leaf'), 'нулевой фан-ин в ranking не попадает');
});

test('пакет выше порога БЕЗ скрипта test уходит в withoutTests под своим именем', () => {
  const packages = [
    { name: 'silent', dir: 'packages/silent', hasTest: false, deps: [] },
    { name: 'x', dir: 'packages/x', hasTest: true, deps: ['silent'] },
    { name: 'y', dir: 'packages/y', hasTest: true, deps: ['silent'] },
  ];
  const sel = selectSmoke(packages, 2);
  assert.deepEqual(sel.smoke, [], 'гонять нечего — в ярус не встаёт');
  assert.deepEqual(sel.withoutTests, ['silent'], 'но и не исчезает: системный пакет без тестов — новость');
  assert.ok(!sel.corpus.includes('silent'));
});

test('цикл в графе даёт конечный ответ, а не зависание', () => {
  const dependents = buildDependents([
    { name: 'a', dir: 'packages/a', hasTest: true, deps: ['b'] },
    { name: 'b', dir: 'packages/b', hasTest: true, deps: ['a'] },
  ]);
  assert.equal(transitiveFanIn(dependents, 'a'), 1);
  assert.equal(transitiveFanIn(dependents, 'b'), 1);
});

test('внешние зависимости фан-ин не надувают', () => {
  const dependents = buildDependents([
    { name: '@m/core', dir: 'packages/core', hasTest: true, deps: [] },
    { name: '@m/app', dir: 'apps/app', hasTest: true, deps: ['@m/core', 'react', 'vitest'] },
  ]);
  assert.deepEqual([...dependents.keys()], ['@m/core'], 'react и vitest в граф не встают');
});

test('devDependencies системности не создают', () => {
  const io = fakeIo({
    'packages/tool/package.json': JSON.stringify({ name: 'tool', scripts: { test: 'vitest run' } }),
    'packages/user/package.json': JSON.stringify({ name: 'user', devDependencies: { tool: '*' }, scripts: { test: 'vitest run' } }),
  });
  const { packages } = readWorkspacePackages(['packages/tool', 'packages/user'], io);
  assert.equal(transitiveFanIn(buildDependents(packages), 'tool'), 0);
});

test('открытие идёт по workspaces-глобам, вложенные генераты пакетами не считаются', () => {
  const io = fakeIo(
    {
      'packages/background-cabinet/package.json': pkg('@m/background-cabinet'),
      'packages/background-cabinet/generated/prisma/package.json': pkg('prisma-client-deadbeef'),
      'apps/client/package.json': pkg('@m/client', ['@m/background-cabinet']),
    },
    { packages: ['background-cabinet'], apps: ['client'] },
  );
  const { dirs } = expandWorkspaceGlobs(['packages/*', 'apps/*'], io);
  assert.deepEqual(dirs, ['apps/client', 'packages/background-cabinet']);
  const { packages } = readWorkspacePackages(dirs, io);
  assert.ok(!packages.some((p) => p.name.startsWith('prisma-client')), 'генерат Prisma в граф не попадает');
});

test('нераскрываемый глоб — заявленная проблема, а не тихо пропущенный каталог', () => {
  const { problems } = expandWorkspaceGlobs(['packages/**/deep', 'packages/{a,b}'], fakeIo({}));
  assert.equal(problems.length, 2);
  assert.match(problems[0], /не раскрывается/u);
});

test('битый package.json пакета — проблема входа, отбор не состоится', () => {
  const io = fakeIo({ 'package.json': JSON.stringify({ workspaces: ['packages/*'] }), 'packages/a/package.json': '{ сломано' }, { packages: ['a'] });
  const res = computeSelection('/fake', io);
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /не разбирается/u.test(p)));
});

test('корень без workspaces не молчит зелёным', () => {
  const res = computeSelection('/fake', fakeIo({ 'package.json': JSON.stringify({ name: 'root' }) }));
  assert.equal(res.ok, false);
  assert.match(res.problems[0], /workspaces/u);
});

test('каталог детерминирован: тот же граф — тот же байт', () => {
  const packages = [
    { name: 'b', dir: 'packages/b', hasTest: true, deps: ['a'] },
    { name: 'a', dir: 'packages/a', hasTest: true, deps: [] },
    { name: 'c', dir: 'packages/c', hasTest: true, deps: ['a'] },
  ];
  const first = JSON.stringify(renderCatalog(selectSmoke(packages, 2)));
  const shuffled = [packages[2], packages[0], packages[1]];
  assert.equal(JSON.stringify(renderCatalog(selectSmoke(shuffled, 2))), first);
});

test('живое дерево: каталог согласован с графом воркспейса', () => {
  const res = computeSelection(process.cwd());
  assert.equal(res.ok, true, res.ok ? '' : res.problems?.join('; '));
  const catalog = renderCatalog(res.selection);
  assert.ok(catalog.smoke.length > 0, 'ярус не может быть пустым');
  assert.ok(catalog.smoke.length < catalog.corpusSize / 2, 'ярус, не сужающий корпус вдвое, цели карточки не достигает');
});
