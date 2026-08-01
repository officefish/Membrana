/**
 * Зубы обнаружения домов для атласа (§3 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/atlas-discovery.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  NOT_HOMES_SELF,
  NOT_HOMES_SUBTREE,
  RECORD_KINDS,
  discoverHomes,
  invisibleBefore,
  underRootPolicy,
} from './lib/atlas-discovery.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Дерево-макет: список путей, у каждого README; манифест — если путь в `withManifest`. */
function fixture(paths, withManifest = []) {
  const root = mkdtempSync(join(tmpdir(), 'atlas-disc-'));
  for (const p of paths) {
    mkdirSync(join(root, p), { recursive: true });
    writeFileSync(join(root, p, 'README.md'), `# ${p}`, 'utf8');
    if (withManifest.includes(p)) {
      writeFileSync(join(root, p, 'workshop.manifest.json'), JSON.stringify({ name: p, verbs: {} }), 'utf8');
    }
  }
  return root;
}

// ── Обещание §3, проверенное поимённо ─────────────────────────────────────────────────────

test('§3 назвал четыре дома поимённо — все четыре в индексе', () => {
  const homes = discoverHomes(repoRoot).map((h) => h.home);
  // «минимум обязан покрывать прямые docs/* с README и де-факто дома вроде docs/procedures/*,
  // docs/seanses/night-hunt — так, чтобы docs/network попал в D_home»
  for (const named of ['docs/network', 'docs/seanses/night-hunt', 'docs/procedures/ritual-day', 'scripts', 'tests']) {
    assert.ok(homes.includes(named), `${named} назван контрактом и обязан быть в индексе`);
  }
});

test('обещание «невидимки становятся видны без 33 манифестов» проверяется счётом', () => {
  const homes = discoverHomes(repoRoot);
  const workshops = homes.filter((h) => h.kind === RECORD_KINDS.WORKSHOP);
  assert.equal(workshops.length, 14, '14 живых манифестов имеют README-дверь; ни одного не заведено «для зелени»');
  assert.ok(invisibleBefore(homes).length >= 25, `домов без мастерской ${invisibleBefore(homes).length}`);
});

// ── Три вида записи ───────────────────────────────────────────────────────────────────────

test('дом без мастерской — законная запись, а не дефект', () => {
  const root = fixture(['docs/alpha', 'docs/beta'], ['docs/beta']);
  const homes = discoverHomes(root);
  assert.deepEqual(homes.map((h) => [h.home, h.kind]), [
    ['docs/alpha', RECORD_KINDS.HOME],
    ['docs/beta', RECORD_KINDS.WORKSHOP],
  ]);
  // Выбросить дом без манифеста значило бы требовать 33 манифеста «для зелени» — запрет §3.
  assert.equal(homes.length, 2);
});

test('видов записи ровно два, третьего нет', () => {
  assert.deepEqual(Object.values(RECORD_KINDS), ['workshop', 'home']);
});

// ── RootPolicy ────────────────────────────────────────────────────────────────────────────

test('README без RootPolicy домом не делает', () => {
  // «любая папка с README домом не становится» — §3 прямым текстом.
  const root = fixture(['docs/a/b/c/deep', 'packages/thing', 'случайная-папка']);
  assert.deepEqual(discoverHomes(root), []);
});

test('служебный .cache не участвует в обнаружении домов', () => {
  const root = fixture(['docs/.cache', 'docs/.cache/nested']);
  assert.deepEqual(discoverHomes(root), []);
});

test('глубина под docs: первый и второй уровень — дом, третий — нет', () => {
  assert.equal(underRootPolicy('docs/network'), true);
  assert.equal(underRootPolicy('docs/audit/git'), true);
  assert.equal(underRootPolicy('docs/audit/bestiary/specimens'), false, 'иначе домом станет любой подкаталог');
});

test('корневой контейнер — только из allowlist', () => {
  assert.equal(underRootPolicy('scripts'), true);
  assert.equal(underRootPolicy('tests'), true);
  assert.equal(underRootPolicy('packages'), false);
  assert.equal(underRootPolicy('apps'), false);
});

// ── Два списка исключений, и разница между ними несущая ───────────────────────────────────

test('поддерево режется целиком: архив и свалка', () => {
  for (const x of NOT_HOMES_SUBTREE) {
    assert.equal(underRootPolicy(x), false, x);
    assert.equal(underRootPolicy(`${x}/что-угодно`), false, `${x}/*`);
  }
});

test('узел режется, дети — нет: иначе теряется дом, названный контрактом', () => {
  for (const x of NOT_HOMES_SELF) assert.equal(underRootPolicy(x), false, x);
  // Схлопнуть два списка в один значило бы вырезать docs/seanses/night-hunt вместе с
  // родителем — а §3 называет его де-факто домом поимённо.
  assert.equal(underRootPolicy('docs/seanses/night-hunt'), true);
  assert.equal(underRootPolicy('docs/discussions/что-то'), true);
});

// ── Устойчивость ──────────────────────────────────────────────────────────────────────────

test('порядок домов устойчив — дрейф ловит содержание, не перестановку', () => {
  const root = fixture(['docs/zeta', 'docs/alpha', 'scripts']);
  const once = discoverHomes(root).map((h) => h.home);
  assert.deepEqual(once, [...once].sort());
  assert.deepEqual(discoverHomes(root).map((h) => h.home), once, 'повторный обход тождествен');
});

test('пустое дерево — честная пустота, не исключение', () => {
  assert.deepEqual(discoverHomes(fixture([])), []);
  assert.deepEqual(discoverHomes(join(tmpdir(), 'нет-такого-дерева')), []);
});
