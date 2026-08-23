/**
 * Зубы трёх барьеров и штрафа свежести (блок b4 спринта `angelina-hostess-impl`).
 *
 * Барьеры проверяются на фикстурном кладбище: на своём дереве могил сегодня ноль, и зуб над
 * ним подтверждал бы лишь то, что пустое кладбище не пробито.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { recentVoidIds } from './lib/gc-void.mjs';
import { collectInsightsForWeeklyPlan, formatInsightsWeeklyBlock } from './lib/insight-ritual.mjs';
import { readVoidIndex } from './lib/void-index.mjs';
import { checkEpitaphs, checkIndex, checkNoLiveLinks, listGraves, verifyBarriers } from './verify-void-barriers.mjs';

const EPITAPH = [
  '---',
  'status: rejected',
  'verdict: docs/meeting/x/VERDICT.md',
  'rejectedReason: —',
  'rejectedAt: 2026-08-23',
  'rejectedBy: owner',
  'void: этот путь МЁРТВ — живым не является; не восстанавливать без нового вердикта',
  '---',
  '',
].join('\n');

function tree({ epitaph = true, index = true, liveLink = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'void-'));
  const write = (rel, body) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  };
  write('docs/void/README.md', index ? '# кладбище\n\n- insight-мёртвый\n' : '# кладбище\n');
  write('docs/void/insight-мёртвый/INSIGHT.md', (epitaph ? EPITAPH : '') + '# Мёртвая идея\n');
  write('docs/insights/insight-живой/INSIGHT.md', '# Живая идея\n');
  if (liveLink) write('docs/STRATEGY_DAY.md', 'см. docs/void/insight-мёртвый — оттуда возьмём подход\n');
  else write('docs/STRATEGY_DAY.md', 'горизонт дня\n');
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('могилы перечисляются, канон кладбища могилой не считается', () => {
  const { root, cleanup } = tree();
  try {
    const graves = listGraves(root);
    assert.deepEqual(graves.map((g) => g.id), ['insight-мёртвый']);
    assert.deepEqual(graves[0].files, ['INSIGHT.md']);
  } finally { cleanup(); }
});

test('все три барьера держат на здоровом кладбище', () => {
  const { root, cleanup } = tree();
  try {
    assert.deepEqual(verifyBarriers(root).breaches, []);
  } finally { cleanup(); }
});

test('барьер 1 КРАСНЫЙ: могила без эпитафии в начале файла', () => {
  const { root, cleanup } = tree({ epitaph: false });
  try {
    const breaches = checkEpitaphs(listGraves(root));
    assert.equal(breaches.length, 1);
    assert.match(breaches[0], /барьер 1/u);
  } finally { cleanup(); }
});

test('барьер 1 КРАСНЫЙ: эпитафия задвинута в конец — читатель прочтёт мёртвое как живое', () => {
  const { root, cleanup } = tree({ epitaph: false });
  try {
    writeFileSync(join(root, 'docs/void/insight-мёртвый/INSIGHT.md'), `# Мёртвая идея\n${EPITAPH}`, 'utf8');
    assert.equal(checkEpitaphs(listGraves(root)).length, 1, 'эпитафия обязана быть ПЕРВОЙ');
  } finally { cleanup(); }
});

test('барьер 2 КРАСНЫЙ: могила не названа в индексе кладбища', () => {
  const { root, cleanup } = tree({ index: false });
  try {
    const breaches = checkIndex(root, listGraves(root));
    assert.equal(breaches.length, 1);
    assert.match(breaches[0], /барьер 2/u);
  } finally { cleanup(); }
});

test('барьер 3 КРАСНЫЙ: живое дерево ссылается на могилу — кто-то зовёт покойника', () => {
  const { root, cleanup } = tree({ liveLink: true });
  try {
    const breaches = verifyBarriers(root).breaches;
    assert.equal(breaches.length, 1);
    assert.match(breaches[0], /барьер 3/u);
    assert.match(breaches[0], /STRATEGY_DAY/u, 'нарушитель назван поимённо');
  } finally { cleanup(); }
});

test('барьер 3: канон кладбища ссылается на него законно — он объясняет правило', () => {
  const { root, cleanup } = tree();
  try {
    writeFileSync(join(root, 'docs/void/LIFECYCLE.md'), 'о могиле docs/void/insight-мёртвый\n', 'utf8');
    assert.deepEqual(verifyBarriers(root).breaches, [], 'кладбище само себя не судит');
  } finally { cleanup(); }
});

test('барьеры независимы: один пробой не маскирует другие', () => {
  // «Один барьер обходится случайно, три — только намеренно»: если пробои складываются,
  // а не заменяют друг друга, обойти все три разом можно лишь нарочно.
  const { root, cleanup } = tree({ epitaph: false, index: false, liveLink: true });
  try {
    const breaches = verifyBarriers(root).breaches;
    assert.equal(breaches.length, 3);
    assert.equal(new Set(breaches.map((b) => b.slice(0, 8))).size, 3, 'все три названы по отдельности');
  } finally { cleanup(); }
});

test('пустое кладбище барьеров не нарушает', () => {
  const root = mkdtempSync(join(tmpdir(), 'void-empty-'));
  try {
    assert.deepEqual(verifyBarriers(root), { graves: [], breaches: [] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('нечитаемый файл ссылкой не объявляется', () => {
  assert.deepEqual(checkNoLiveLinks('/нет', [{ id: 'x' }], ['нет/такого.md']), []);
});

// ── штраф свежести ────────────────────────────────────────────────────────────

test('recent_void_penalty: свежеотвергнутый штрафуется, истёкший — отпускается', () => {
  const index = [
    { id: 'insight-свежий', rejectedAt: '2026-08-01' },
    { id: 'insight-старый', rejectedAt: '2026-01-01' },
  ];
  const recent = recentVoidIds(index, '2026-08-23');
  assert.equal(recent.has('insight-свежий'), true, 'приговор ещё не истёк — идея не всплывает');
  assert.equal(recent.has('insight-старый'), false, 'стареет штраф, не память');
});

test('recent_void_penalty ДЕЙСТВУЕТ в генераторе: приговорённая идея в план не попадает', () => {
  // Зуб на само правило, а не на его ядро: первая редакция проверяла только recentVoidIds,
  // и внесённая порча «штраф не применяется» осталась зелёной — предикат был, а покрытия
  // у него не было. Поймано порчей, закрыто здесь.
  const root = mkdtempSync(join(tmpdir(), 'void-gen-'));
  try {
    mkdirSync(join(root, 'docs/insights'), { recursive: true });
    writeFileSync(join(root, 'docs/insights/registry.json'), JSON.stringify({
      version: 1,
      updatedAt: null,
      insights: [
        { id: 'insight-живой', status: 'adopted', weight: 8, title: 'жив' },
        { id: 'insight-мёртвый', status: 'adopted', weight: 9, title: 'приговорён, но вес высокий' },
      ],
    }), 'utf8');

    const без = collectInsightsForWeeklyPlan(root, 6).map((i) => i.id);
    assert.deepEqual(без.sort(), ['insight-живой', 'insight-мёртвый'], 'без штрафа берутся оба');

    const со = collectInsightsForWeeklyPlan(root, 6, recentVoidIds([
      { id: 'insight-мёртвый', rejectedAt: '2026-08-01' },
    ], '2026-08-23')).map((i) => i.id);
    assert.deepEqual(со, ['insight-живой'], 'свежеотвергнутый не всплывает, даже с бо́льшим весом');

    const истёк = collectInsightsForWeeklyPlan(root, 6, recentVoidIds([
      { id: 'insight-мёртвый', rejectedAt: '2026-01-01' },
    ], '2026-08-23')).map((i) => i.id);
    assert.deepEqual(истёк.sort(), ['insight-живой', 'insight-мёртвый'], 'через 90 дней штраф отпускает');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ── индекс кладбища и ПРОВОДКА штрафа ─────────────────────────────────────────

test('индекс кладбища берёт дату приговора из эпитафии, а не угадывает', () => {
  const { root, cleanup } = tree();
  try {
    const { index, undated } = readVoidIndex(root);
    assert.deepEqual(index, [{ id: 'insight-мёртвый', rejectedAt: '2026-08-23' }]);
    assert.deepEqual(undated, [], 'дата читается — могила не в списке недатированных');
  } finally { cleanup(); }
});

test('могила без читаемой даты штрафуется БЕССРОЧНО — fail-closed, и названа вслух', () => {
  // Первая редакция этого зуба утверждала обратное («без даты не штрафуем») и покраснела:
  // ошибка была в зубе и в моей записи о поведении, а не в ядре. Приговор состоялся, срок
  // его истечения неизвестен — отпустить идею по незнанию значит вернуть в план отвергнутое.
  const { root, cleanup } = tree({ epitaph: false });
  try {
    const { index, undated } = readVoidIndex(root);
    assert.equal(index[0].rejectedAt, null, 'дата не выдумана');
    assert.deepEqual(undated, ['insight-мёртвый'], 'пропуск виден вызывающему — дату надо дописать');
    assert.equal(recentVoidIds(index, '2026-08-23').has('insight-мёртвый'), true, 'штраф держится');
    assert.equal(recentVoidIds(index, '2030-01-01').has('insight-мёртвый'), true, 'и не истекает сам собой');
  } finally { cleanup(); }
});

test('ПРОВОДКА: обёртка недельного блока пробрасывает штраф в отбор', () => {
  // Дефект, найденный ревью #2091: параметр у отбора был, а живой вызов шёл через обёртку,
  // которая его не пробрасывала — механизм был украшением. Зуб держит именно ПУТЬ вызова.
  const root = mkdtempSync(join(tmpdir(), 'void-wire-'));
  try {
    mkdirSync(join(root, 'docs/insights'), { recursive: true });
    writeFileSync(join(root, 'docs/insights/registry.json'), JSON.stringify({
      version: 1,
      updatedAt: null,
      insights: [
        { id: 'insight-живой', status: 'adopted', weight: 8, title: 'жив' },
        { id: 'insight-мёртвый', status: 'adopted', weight: 9, title: 'приговорён' },
      ],
    }), 'utf8');

    const без = formatInsightsWeeklyBlock(root, 6);
    assert.match(без, /insight-мёртвый/u, 'без штрафа приговорённый в блоке есть');

    const со = formatInsightsWeeklyBlock(root, 6, recentVoidIds([
      { id: 'insight-мёртвый', rejectedAt: '2026-08-01' },
    ], '2026-08-23'));
    assert.doesNotMatch(со, /insight-мёртвый/u, 'штраф доходит до блока через обёртку');
    assert.match(со, /insight-живой/u, 'живой на месте');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('барьер 3 смотрит и в код: ссылка на могилу из packages/ ловится', () => {
  const { root, cleanup } = tree();
  try {
    mkdirSync(join(root, 'packages/детектор/src'), { recursive: true });
    writeFileSync(join(root, 'packages/детектор/src/index.ts'), "// подход из docs/void/insight-мёртвый\n", 'utf8');
    const breaches = verifyBarriers(root).breaches;
    assert.equal(breaches.length, 1, 'ссылка из кода живее ссылки из доки — её зовут при сборке');
    assert.match(breaches[0], /packages/u);
  } finally { cleanup(); }
});
