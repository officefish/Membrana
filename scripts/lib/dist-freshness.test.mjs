import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { FRESHNESS, hashSourceText, isRed, judgeDistFreshness, manifestSources } from './dist-freshness.mjs';

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

test('hashSourceText: sha256 текста; BOM снимается, CRLF остаётся', () => {
  assert.equal(hashSourceText('export const a = 1;\n'), sha('export const a = 1;\n'));
  assert.equal(hashSourceText('﻿export const a = 1;\n'), sha('export const a = 1;\n'));
  assert.notEqual(hashSourceText('a\r\nb'), hashSourceText('a\nb'));
});

test('manifestSources: берёт ./src/** c версиями, пропускает node_modules и чужие каталоги', () => {
  const buildInfo = {
    fileNames: ['../../node_modules/typescript/lib/lib.es5.d.ts', './src/index.ts', './src/a/b.ts', './test/x.ts'],
    fileInfos: [{ version: 'lib' }, { version: 'v-index', signature: 's' }, 'v-b', { version: 'v-test' }],
  };
  assert.deepEqual(manifestSources(buildInfo), [
    { name: './src/index.ts', version: 'v-index' },
    { name: './src/a/b.ts', version: 'v-b' },
  ]);
});

test('manifestSources: иной rootDir, обратные слэши, пустой/битый манифест', () => {
  assert.deepEqual(manifestSources({ fileNames: ['.\\lib\\x.ts'], fileInfos: [{ version: 'v' }] }, { rootDir: './lib' }), [
    { name: './lib/x.ts', version: 'v' },
  ]);
  assert.deepEqual(manifestSources({}), []);
  assert.deepEqual(manifestSources(null), []);
  assert.deepEqual(manifestSources({ fileNames: ['./src/a.ts'], fileInfos: [{}] }), []);
});

const manifest = [
  { name: './src/index.ts', version: sha('index') },
  { name: './src/util.ts', version: sha('util') },
];

test('judgeDistFreshness: манифест и диск совпадают, dist есть → fresh', () => {
  const current = new Map([
    ['./src/index.ts', sha('index')],
    ['./src/util.ts', sha('util')],
  ]);
  assert.deepEqual(judgeDistFreshness({ manifest, current, distPresent: true }), { state: FRESHNESS.FRESH, files: [] });
});

test('judgeDistFreshness: исходник изменён (E5.1-состояние) → stale с именем файла', () => {
  const current = { './src/index.ts': sha('index + новый экспорт'), './src/util.ts': sha('util') };
  const res = judgeDistFreshness({ manifest, current, distPresent: true });
  assert.equal(res.state, FRESHNESS.STALE);
  assert.deepEqual(
    res.files.map((f) => f.name),
    ['./src/index.ts'],
  );
});

test('judgeDistFreshness: исходник удалён или хеш не подан → stale, причина названа', () => {
  const res = judgeDistFreshness({
    manifest,
    current: new Map([['./src/index.ts', sha('index')]]).set('./src/util.ts', null),
    distPresent: true,
  });
  assert.equal(res.state, FRESHNESS.STALE);
  assert.match(res.files[0].reason, /удалён/u);
  const res2 = judgeDistFreshness({ manifest, current: { './src/index.ts': sha('index') }, distPresent: true });
  assert.equal(res2.state, FRESHNESS.STALE);
  assert.match(res2.files[0].reason, /не подан/u);
});

test('judgeDistFreshness: манифест свежий, а dist нет (E7-состояние) → dist_missing, не fresh', () => {
  const current = { './src/index.ts': sha('index'), './src/util.ts': sha('util') };
  assert.equal(judgeDistFreshness({ manifest, current, distPresent: false }).state, FRESHNESS.DIST_MISSING);
});

test('judgeDistFreshness: манифеста нет → absent (не fresh и не stale)', () => {
  assert.equal(judgeDistFreshness({ manifest: null, current: {}, distPresent: true }).state, FRESHNESS.ABSENT);
  assert.equal(judgeDistFreshness({ manifest: undefined, current: {}, distPresent: false }).state, FRESHNESS.ABSENT);
});

test('isRed: красны только stale и dist_missing', () => {
  assert.equal(isRed(FRESHNESS.STALE), true);
  assert.equal(isRed(FRESHNESS.DIST_MISSING), true);
  assert.equal(isRed(FRESHNESS.FRESH), false);
  assert.equal(isRed(FRESHNESS.ABSENT), false);
});
