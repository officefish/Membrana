/**
 * Зубы предиката `belongs` (§1 + §2 контракта заседания `workshop-wires`).
 *
 * Живёт в `scripts/*.test.mjs` намеренно: корневой прогон подхватывает этот путь (AGENTS.md).
 * Прогон: `node --test scripts/belongs.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BANNED_NAMESPACE_IDS,
  MEMBERSHIP_KINDS,
  ORPHAN_REASONS,
  belongs,
  checkRegistry,
  isTest,
  normalizePath,
  subjectOf,
  validateNamespace,
} from './lib/belongs.mjs';

/** Годная запись реестра — база, от которой тесты портят по одному полю. */
const ns = (over = {}) => ({
  id: 'ritual',
  title: 'Ритуальный контур',
  holder: { persona: 'angelina' },
  membership: { kind: 'namePrefix', value: 'ritual-' },
  ...over,
});

const existsIn = (set) => (p) => set.includes(normalizePath(p));

// ── Три исхода и порядок разрешения ───────────────────────────────────────────────────────

test('дом сильнее неймспейса: порядок §1 не переставляется', () => {
  const ctx = {
    homes: ['docs/audit/git'],
    namespaces: [ns({ id: 'branches', membership: { kind: 'pathGlob', value: 'docs/**' } })],
  };
  assert.deepEqual(belongs('docs/audit/git/tool.mjs', ctx), { kind: 'home', id: 'docs/audit/git' });
});

test('вложенные дома: побеждает длиннейший корень', () => {
  const ctx = { homes: ['docs', 'docs/audit/tasks'] };
  assert.deepEqual(belongs('docs/audit/tasks/x.mjs', ctx), { kind: 'home', id: 'docs/audit/tasks' });
  assert.deepEqual(belongs('docs/other/x.mjs', ctx), { kind: 'home', id: 'docs' });
});

test('дом по сегментам, а не по подстроке: docs-old не попадает в docs', () => {
  assert.deepEqual(
    belongs('docs-old/x.mjs', { homes: ['docs'] }),
    { kind: 'orphan', reason: ORPHAN_REASONS.NO_RULE },
  );
});

test('сирота — честный третий исход с названной причиной', () => {
  assert.deepEqual(belongs('scripts/lone.mjs', {}), { kind: 'orphan', reason: ORPHAN_REASONS.NO_RULE });
});

// ── Правила членства ──────────────────────────────────────────────────────────────────────

test('четыре вида членства — и ни одного пятого', () => {
  assert.deepEqual([...MEMBERSHIP_KINDS], ['pathPrefix', 'namePrefix', 'pathGlob', 'explicitList']);
  const p = 'scripts/ritual-evening.mjs';
  const by = (membership) => belongs(p, { namespaces: [ns({ membership })] }).kind;
  assert.equal(by({ kind: 'pathPrefix', value: 'scripts' }), 'namespace');
  assert.equal(by({ kind: 'namePrefix', value: 'ritual-' }), 'namespace');
  assert.equal(by({ kind: 'pathGlob', value: 'scripts/ritual-*.mjs' }), 'namespace');
  assert.equal(by({ kind: 'explicitList', value: [p] }), 'namespace');
  assert.equal(by({ kind: 'importGraph', value: '*' }), 'orphan', 'вид вне четырёх не матчит');
});

test('pathGlob: ** съедает и ноль сегментов, кривой синтаксис не роняет прогон', () => {
  const hit = (glob, p) => belongs(p, { namespaces: [ns({ membership: { kind: 'pathGlob', value: glob } })] }).kind;
  assert.equal(hit('docs/**/x.mjs', 'docs/x.mjs'), 'namespace', 'ноль сегментов');
  assert.equal(hit('docs/**/x.mjs', 'docs/a/b/x.mjs'), 'namespace');
  assert.equal(hit('scripts/*.mjs', 'scripts/lib/deep.mjs'), 'orphan', 'одна звезда сегмент не переходит');
  // Непонятый синтаксис — несовпадение, а не исключение: один кривой glob в реестре не
  // вправе уронить весь прогон прибора.
  assert.doesNotThrow(() => belongs('scripts/a.mjs', { namespaces: [ns({ membership: { kind: 'pathGlob', value: 'scripts/{a,b}.mjs' } })] }));
});

test('конфликт неймспейсов: длиннейший pathPrefix, иначе минимальный id', () => {
  const wide = ns({ id: 'wide', membership: { kind: 'pathPrefix', value: 'scripts' } });
  const deep = ns({ id: 'deep', membership: { kind: 'pathPrefix', value: 'scripts/lib' } });
  assert.equal(belongs('scripts/lib/x.mjs', { namespaces: [wide, deep] }).id, 'deep');
  // Порядок записей в файле вердикта менять не вправе — второй ключ сортировки не декоративен.
  const byName = [ns({ id: 'zeta', membership: { kind: 'namePrefix', value: 'x' } }), ns({ id: 'alpha', membership: { kind: 'namePrefix', value: 'x' } })];
  assert.equal(belongs('scripts/x1.mjs', { namespaces: byName }).id, 'alpha');
  assert.equal(belongs('scripts/x1.mjs', { namespaces: [...byName].reverse() }).id, 'alpha');
});

// ── §2: тест как спутник предмета ─────────────────────────────────────────────────────────

test('§2: тест наследует принадлежность предмета, локус рядом', () => {
  const ctx = { homes: ['scripts/lib'], exists: existsIn(['scripts/lib/belongs.mjs']) };
  assert.ok(isTest('scripts/lib/belongs.test.mjs'));
  assert.deepEqual(belongs('scripts/lib/belongs.test.mjs', ctx), { kind: 'home', id: 'scripts/lib' });
});

test('§2: второй локус — scripts/lib/<stem>.mjs, порядок соблюдён', () => {
  const exists = existsIn(['scripts/lib/tooth.mjs']);
  assert.equal(subjectOf('scripts/tooth.test.mjs', exists), 'scripts/lib/tooth.mjs');
  // Локус 1 существует → второй не смотрим.
  const both = existsIn(['scripts/tooth.mjs', 'scripts/lib/tooth.mjs']);
  assert.equal(subjectOf('scripts/tooth.test.mjs', both), 'scripts/tooth.mjs');
});

test('§2: предмет не разрешён — сирота с причиной subject_unresolved, а не молча', () => {
  assert.deepEqual(
    belongs('scripts/ghost.test.mjs', { homes: ['scripts'], exists: () => false }),
    { kind: 'orphan', reason: ORPHAN_REASONS.SUBJECT_UNRESOLVED },
  );
});

test('§2: список локусов закрыт — соседний каталог предметом не становится', () => {
  assert.equal(subjectOf('scripts/a/x.test.mjs', existsIn(['scripts/b/x.mjs'])), null);
});

test('§2: тест наследует ДАЖЕ сиротство предмета — своего исхода у него нет', () => {
  assert.deepEqual(
    belongs('scripts/lone.test.mjs', { exists: existsIn(['scripts/lone.mjs']) }),
    { kind: 'orphan', reason: ORPHAN_REASONS.NO_RULE },
  );
});

// ── Записи реестра ────────────────────────────────────────────────────────────────────────

test('держатель — строгий XOR: ни пустого, ни двойного', () => {
  assert.deepEqual(validateNamespace(ns()), []);
  assert.match(validateNamespace(ns({ holder: {} }))[0], /holder пуст/u);
  assert.match(
    validateNamespace(ns({ holder: { persona: 'angelina', ownerRef: '#1467' } }))[0],
    /XOR нарушен/u,
    'два держателя — это не отвечает никто',
  );
  assert.deepEqual(validateNamespace(ns({ holder: { ownerRef: '#1467' } })), []);
});

test('поля дома в неймспейсе запрещены — все четыре', () => {
  for (const f of ['verbs', 'worksOn', 'kit', 'roots']) {
    const problems = validateNamespace(ns({ [f]: 'что угодно' }));
    assert.ok(problems.some((p) => p.includes(f)), `${f} обязано ловиться`);
  }
});

test('свалка под видом правила: запрещённые id названы поимённо', () => {
  for (const id of BANNED_NAMESPACE_IDS) {
    assert.match(validateNamespace(ns({ id }))[0], /свалка под видом правила/u, id);
  }
});

test('id, title, containerKind: форма проверяется, а не подразумевается', () => {
  assert.match(validateNamespace(ns({ id: 'Ritual' }))[0], /\[a-z\]/u);
  assert.match(validateNamespace(ns({ title: '  ' }))[0], /title пуст/u);
  assert.match(validateNamespace(ns({ containerKind: 'twoD' }))[0], /вне \{plain, bidi\}/u);
  assert.deepEqual(validateNamespace(ns({ containerKind: 'bidi' })), []);
});

test('конфликт explicitList — ОТКАЗ реестра, а не четвёртый исход предиката', () => {
  const a = ns({ id: 'alpha', membership: { kind: 'explicitList', value: ['scripts/x.mjs'] } });
  const b = ns({ id: 'beta', membership: { kind: 'explicitList', value: ['scripts/x.mjs'] } });
  const res = checkRegistry([a, b]);
  assert.equal(res.ok, false);
  assert.match(res.problems.join('\n'), /проверка реестра отказана/u);
  // Сам предикат список исходов не расширяет: три и только три.
  assert.ok(['home', 'namespace', 'orphan'].includes(belongs('scripts/x.mjs', { namespaces: [a, b] }).kind));
});

test('реестр целиком: дубль id и порча записи всплывают с адресом', () => {
  const res = checkRegistry([ns({ id: 'dup' }), ns({ id: 'dup' }), ns({ id: 'broken', holder: {} })]);
  assert.equal(res.ok, false);
  assert.match(res.problems.join('\n'), /dup: id не уникален/u);
  assert.match(res.problems.join('\n'), /broken: holder пуст/u);
  assert.deepEqual(checkRegistry([ns()]), { ok: true, problems: [] });
});

test('пустой реестр — годен, но это НЕ «всё припарковано»', () => {
  assert.deepEqual(checkRegistry([]), { ok: true, problems: [] });
  assert.equal(belongs('scripts/x.mjs', { namespaces: [] }).kind, 'orphan');
});

// ── Нормализация ──────────────────────────────────────────────────────────────────────────

test('пути сравнимы независимо от разделителя и ./', () => {
  assert.equal(normalizePath('scripts\\lib\\x.mjs'), 'scripts/lib/x.mjs');
  assert.equal(normalizePath('./scripts/lib/'), 'scripts/lib');
  assert.deepEqual(
    belongs('scripts\\lib\\x.mjs', { homes: ['scripts/lib'] }),
    { kind: 'home', id: 'scripts/lib' },
  );
});
