/**
 * Юнит-тесты адаптера Ангелины. io (git/fs) инъектируются фейками — без сети и диска.
 * Проверяем разбор провенанса, digest содержимого, сборку снимка и что дневной каскад
 * ацикличен (ядро не бросит).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseProvenance, contentDigest, buildSnapshot, gitFsIo, provenanceHeader, readEntry } from './lib/angelina-adapter.mjs';
import { orchestrateCascade, topoOrder } from './lib/angelina-cascade.mjs';
import { CASCADE_DAY } from './angelina.mjs';

const withProv = (author = 'vesnin', readAt = {}) =>
  `<!-- angelina {"author":"${author}","guard":"angelina","readAt":${JSON.stringify(readAt)}} -->\n# тело\n`;

test('parseProvenance: читает заголовок angelina', () => {
  const p = parseProvenance(withProv('ozhegov', { STRATEGY_DAY: { version: 'v1', digest: 'd1' } }));
  assert.equal(p.author, 'ozhegov');
  assert.equal(p.guard, 'angelina');
  assert.deepEqual(p.readAt.STRATEGY_DAY, { version: 'v1', digest: 'd1' });
});

test('parseProvenance: нет заголовка / битый JSON / нет author → null', () => {
  assert.equal(parseProvenance('# без провенанса'), null);
  assert.equal(parseProvenance('<!-- angelina {битый} -->'), null);
  assert.equal(parseProvenance('<!-- angelina {"guard":"angelina"} -->'), null, 'без author');
});

test('contentDigest: детерминирован, чувствителен к содержимому', () => {
  assert.equal(contentDigest('abc'), contentDigest('abc'));
  assert.notEqual(contentDigest('abc'), contentDigest('abd'));
});

test('buildSnapshot: файл отсутствует → version/digest null, провенанс null', () => {
  const io = { version: () => null, content: () => null };
  const snap = buildSnapshot({ nodes: [{ id: 'x', path: 'docs/x.md' }] }, io);
  assert.equal(snap.x.version, null);
  assert.equal(snap.x.digest, null);
  assert.equal(snap.x.provenance, null);
});

test('buildSnapshot: провенанс собран, digest узла добавлен из содержимого', () => {
  const content = withProv('vesnin', { STRATEGY_DAY: { version: 'v1', digest: 'd1' } });
  const io = { version: () => 'commitABC', content: () => content };
  const snap = buildSnapshot({ nodes: [{ id: 'MAIN_DAY_ISSUE', path: 'docs/MAIN_DAY_ISSUE.md' }] }, io);
  assert.equal(snap.MAIN_DAY_ISSUE.version, 'commitABC');
  assert.equal(snap.MAIN_DAY_ISSUE.provenance.author, 'vesnin');
  assert.equal(snap.MAIN_DAY_ISSUE.provenance.digest, contentDigest(content), 'digest узла = digest содержимого');
  assert.deepEqual(snap.MAIN_DAY_ISSUE.readAt.STRATEGY_DAY, { version: 'v1', digest: 'd1' });
});

test('интеграция: снимок с полным провенансом и свежим чтением → каскад чист', () => {
  const stratContent = withProv('dynin', {});
  const stratDigest = contentDigest(stratContent);
  const mainContent = withProv('vesnin', {
    STRATEGY_DAY: { version: 'vS', digest: stratDigest },
    DAILY_STANDUP: { version: 'vD', digest: null },
  });
  const files = {
    'docs/STRATEGY_DAY.md': { v: 'vS', c: stratContent },
    'docs/DAILY_STANDUP.md': { v: 'vD', c: withProv('vesnin', { STRATEGY_DAY: { version: 'vS', digest: stratDigest } }) },
    'docs/MAIN_DAY_ISSUE.md': { v: 'vM', c: mainContent },
  };
  const io = { version: (p) => files[p]?.v ?? null, content: (p) => files[p]?.c ?? null };
  // DAILY_STANDUP digest в readAt главного не совпадёт (null) → это отдельная проверка;
  // здесь проверяем, что STRATEGY_DAY→* свежи.
  const snap = buildSnapshot(CASCADE_DAY, io);
  const report = orchestrateCascade(CASCADE_DAY, snap);
  assert.equal(report.results.DAILY_STANDUP.edges.STRATEGY_DAY, 'fresh', 'стендап прочитал свежий горизонт');
});

test('дневной каскад ацикличен (ядро не бросит) и A-подобный порядок', () => {
  const order = topoOrder(CASCADE_DAY);
  assert.equal(order[0], 'STRATEGY_DAY', 'горизонт — корень');
  assert.equal(order[order.length - 1], 'MAIN_DAY_ISSUE', 'центральная задача — сток');
});

test('provenanceHeader ↔ parseProvenance: round-trip', () => {
  const readAt = { STRATEGY_DAY: { version: 'vS', digest: 'dS' } };
  const header = provenanceHeader({ author: 'vesnin', readAt });
  const parsed = parseProvenance(`${header}\n# тело`);
  assert.equal(parsed.author, 'vesnin');
  assert.equal(parsed.guard, 'angelina');
  assert.deepEqual(parsed.readAt, readAt);
});

test('provenanceHeader: guard по умолчанию angelina, readAt по умолчанию пуст', () => {
  const parsed = parseProvenance(`${provenanceHeader({ author: 'human' })}\n#`);
  assert.equal(parsed.guard, 'angelina');
  assert.deepEqual(parsed.readAt, {});
});

test('readEntry: version+digest из io (fake), digest содержимого', () => {
  const io = { version: () => 'commitX', content: () => 'привет' };
  const e = readEntry(io, 'docs/x.md');
  assert.equal(e.version, 'commitX');
  assert.equal(e.digest, contentDigest('привет'));
});

test('gitFsIo: version возвращает null на несуществующем git-вызове (не бросает)', () => {
  const io = gitFsIo('/nonexistent-repo-xyz', {
    execFileSync: () => { throw new Error('git fail'); },
    readFileSync: () => { throw new Error('fs fail'); },
    existsSync: () => false,
    join: (a, b) => `${a}/${b}`,
  });
  assert.equal(io.version('docs/x.md'), null);
  assert.equal(io.content('docs/x.md'), null);
});
