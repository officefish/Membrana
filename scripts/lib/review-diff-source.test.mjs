/**
 * Зубы источника диффа (блок b2, карточка review-diff-explicit-base, #1771).
 *
 * Ни сети, ни процессов: порты инжектируются фикстурами — требование исполнителя блока.
 * Главный зуб — регрессионный: если код вернётся к `gh pr diff`, отставший список файлов
 * снова отравит ревью, и тест обязан покраснеть раньше живого прогона.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  COMPARE_FILES_CAP,
  DIFF_SOURCES,
  filesToStat,
  looksTruncated,
  patchesToDiff,
  renderSourceProvenance,
  resolveReviewDiff,
} from './review-diff-source.mjs';

const HEAD = 'a'.repeat(40);
const MB = 'c'.repeat(40);

const file = (name, patch = `@@ -1 +1 @@\n-old\n+new`) => ({
  filename: name,
  status: 'modified',
  additions: 1,
  deletions: 1,
  changes: 2,
  patch,
});

/** Порты по умолчанию: compare отдаёт 13 актуальных файлов, локальный git — те же. */
const ports = ({ compareOk = true, files = [file('a.ts')], localHead = HEAD, gitOk = true } = {}) => ({
  ghJson: () => ({
    ok: true,
    value: { number: 1769, title: 'PR', body: '', state: 'OPEN', baseRefName: 'main', headRefName: 'feat/x', headRefOid: HEAD },
  }),
  ghApi: () =>
    compareOk
      ? { ok: true, value: { merge_base_commit: { sha: MB }, files } }
      : { ok: false, reason: '502' },
  git: (args) => {
    if (!gitOk) return { ok: false, reason: 'git недоступен' };
    if (args[0] === 'rev-parse') return { ok: true, value: `${localHead}\n` };
    if (args[0] === 'merge-base') return { ok: true, value: `${MB}\n` };
    if (args[0] === 'diff' && args[1] === '--stat') return { ok: true, value: ' a.ts | 2 +-' };
    if (args[0] === 'diff' && args[1] === '--name-only') return { ok: true, value: 'a.ts\n' };
    if (args[0] === 'diff') return { ok: true, value: 'diff --git a/a.ts b/a.ts' };
    return { ok: false, reason: `неожиданный вызов git ${args.join(' ')}` };
  },
});

test('ВЕЩДОК 07.08: дифф берётся из compare, отставший список gh pr diff в тракте не участвует', () => {
  // На #1769 `gh pr diff` дал 23 файла (кэш), `compare` — 13 актуальных. Порт `gh pr diff`
  // в модуле отсутствует по построению: если он вернётся, этот зуб покраснеет.
  const thirteen = Array.from({ length: 13 }, (_, i) => file(`real-${i}.ts`));
  const r = resolveReviewDiff({ pr: 1769, slug: 'o/r', ports: ports({ files: thirteen }) });
  assert.equal(r.ok, true);
  assert.equal(r.source, DIFF_SOURCES.COMPARE);
  assert.equal(r.files, 13);
  assert.equal(r.mergeBase, MB);
  assert.equal(r.diff.includes('real-0.ts'), true);
});

test('база и head приходят согласованно из одного ответа', () => {
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports() });
  assert.equal(r.mergeBase, MB);
  assert.equal(r.headSha, HEAD);
  assert.equal(r.headMatch, true);
  assert.equal(r.truncated, false);
});

test('потолок files[] читается как подозрение на обрез — падаем на локальный git', () => {
  const capped = Array.from({ length: COMPARE_FILES_CAP }, (_, i) => file(`f-${i}.ts`));
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports({ files: capped }) });
  assert.equal(r.source, DIFF_SOURCES.LOCAL_AFTER_TRUNCATION);
  assert.equal(r.truncated, true);
  assert.equal(r.mergeBase, MB);
});

test('файл с изменениями, но без патча — тоже обрез: «изменение без содержимого» не ревьюится', () => {
  const withBinary = [file('a.ts'), { filename: 'logo.png', status: 'modified', changes: 4 }];
  assert.equal(looksTruncated({ files: withBinary }), true);
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports({ files: withBinary }) });
  assert.equal(r.source, DIFF_SOURCES.LOCAL_AFTER_TRUNCATION);
});

test('удалённый файл без патча обрезом не считается — у него содержимого и не бывает', () => {
  assert.equal(looksTruncated({ files: [{ filename: 'gone.ts', status: 'removed', changes: 3 }] }), false);
});

test('отказ ручки → локальный источник с явной merge-base (канон pr-recreate)', () => {
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports({ compareOk: false }) });
  assert.equal(r.ok, true);
  assert.equal(r.source, DIFF_SOURCES.LOCAL);
  assert.equal(r.mergeBase, MB);
});

test('ручка отказала И локальный head не тот — честный отказ, а не ревью чужого состояния', () => {
  const r = resolveReviewDiff({
    pr: 1,
    slug: 'o/r',
    ports: ports({ compareOk: false, localHead: 'b'.repeat(40) }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.headMatch, false);
  assert.match(r.reason, /не совпадает с head PR/u);
});

test('расхождение локального head с head PR НАЗВАНО и при живой ручке — работа продолжается по head PR', () => {
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports({ localHead: 'b'.repeat(40) }) });
  assert.equal(r.ok, true);
  assert.equal(r.source, DIFF_SOURCES.COMPARE);
  assert.equal(r.headMatch, false, 'расхождение не проглочено');
  assert.equal(r.headSha, HEAD, 'ревьюится head PR, а не локальное состояние');
});

test('ни ручки, ни git — отказ с причиной, а не пустой дифф', () => {
  const r = resolveReviewDiff({ pr: 1, slug: 'o/r', ports: ports({ compareOk: false, gitOk: false }) });
  assert.equal(r.ok, false);
  assert.match(r.reason, /ни compare, ни локальный git/u);
});

test('gh pr view отказал — отказ называет ручку', () => {
  const r = resolveReviewDiff({
    pr: 1,
    slug: 'o/r',
    ports: { ...ports(), ghJson: () => ({ ok: false, reason: 'not found' }) },
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /gh pr view 1/u);
});

test('патчи собираются в привычную ревьюеру форму, stat считает итог', () => {
  const compare = { files: [file('a.ts'), file('b.ts')] };
  const diff = patchesToDiff(compare);
  assert.match(diff, /diff --git a\/a\.ts b\/a\.ts/u);
  assert.match(diff, /diff --git a\/b\.ts b\/b\.ts/u);
  assert.match(filesToStat(compare), /2 files changed, 2 insertions\(\+\), 2 deletions\(-\)/u);
});

test('провенанс — блок, и он называет источник, базу и совпадение head', () => {
  const md = renderSourceProvenance({
    source: DIFF_SOURCES.COMPARE,
    baseRef: 'main',
    mergeBase: MB,
    headSha: HEAD,
    headMatch: false,
    files: 13,
    truncated: false,
  });
  assert.match(md, /<!-- review-source/u);
  assert.match(md, /source: gh-compare/u);
  assert.match(md, new RegExp(`merge_base: ${MB}`, 'u'));
  assert.match(md, /head_match: false/u);
  assert.match(md, /files: 13/u);
  assert.ok(md.trimEnd().endsWith('-->'));
});

test('провенанс не врёт про неизвестное совпадение head', () => {
  assert.match(renderSourceProvenance({ headMatch: null }), /head_match: unknown/u);
});
