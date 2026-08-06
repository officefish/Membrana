/**
 * Зубы чистого ядра выравнивания (блок `align-plan-core`, спринт `worktrees-align`, #1738).
 *
 * ЦЕННОСТЬ ЭТИХ ЗУБОВ — в отказах, а не в успехах. План кормит мутацию ЧУЖИХ деревьев,
 * поэтому проверяется прежде всего то, что живое и непонятное НЕ попадает под автомат:
 * дерево в MERGING, detached HEAD, неснятое состояние, дерево без карточки.
 *
 * Фикстуры, а не живые деревья — сознательно: из трёх грязных деревьев рабочего места одно
 * держит незакоммиченную правку трёх красных детекторов, разбор которой отложен владельцем
 * (HANDOFF 06.08). Ядро, проверяемое только записью в чужое дерево, не проверялось бы вовсе.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ALIGN_ACTIONS,
  ALIGN_ACTION_ORDER,
  SKIP_REASONS,
  formatAlignReport,
  hasInProgressOp,
  hasTrackedDeletions,
  hasMergeHead,
  isBehind,
  isDirty,
  isDiverged,
  isFastForward,
  isWorktreeClean,
  needsHuman,
  planAlign,
  planTree,
  recordConflict,
  recordSnapshot,
} from './align-plan.mjs';

const sprintCard = { kind: 'sprint' };

/** Дерево, которое отстало и чисто — базовый «здоровый» случай. */
const base = Object.freeze({
  tree: 'C:/w/Membrana-x',
  branch: 'feat/x',
  card: sprintCard,
  behind: 12,
  ahead: 0,
  dirtyCount: 0,
  dirtyFiles: [],
});

// ─── предикаты состояния: живут в ядре, не у исполнителей ────────────────────────

test('предикаты читают состояние, а не догадываются о нём', () => {
  assert.equal(isDirty({ dirtyCount: 3 }), true);
  assert.equal(isDirty({ dirtyCount: 0 }), false);
  assert.equal(isDirty({}), false, 'нет замера — не «грязно»');

  assert.equal(hasMergeHead({ mergeHead: true }), true);
  assert.equal(hasMergeHead({ mergeHead: false }), false);
  assert.equal(hasMergeHead({}), false);

  assert.equal(isBehind({ behind: 1 }), true);
  assert.equal(isBehind({ behind: 0 }), false);

  assert.equal(isDiverged({ behind: 5, ahead: 2 }), true);
  assert.equal(isDiverged({ behind: 5, ahead: 0 }), false, 'только отставание — не расхождение');
  assert.equal(isDiverged({ behind: 0, ahead: 2 }), false, 'только своё впереди — выравнивать нечего');
});

test('словарь действий закрыт и упорядочен', () => {
  assert.equal(ALIGN_ACTION_ORDER.length, Object.keys(ALIGN_ACTIONS).length);
  for (const a of Object.values(ALIGN_ACTIONS)) assert.ok(ALIGN_ACTION_ORDER.includes(a));
  assert.throws(() => {
    'use strict';
    ALIGN_ACTIONS.NEW_ONE = 'sneak';
  }, 'словарь обязан быть заморожен — иначе действие вне списка пролезет молча');
});

// ─── отказы: что автомат НЕ трогает ──────────────────────────────────────────────

test('дерево в MERGING не трогается — автомат не добивает чужой полусмердженный стейт', () => {
  const p = planTree({ ...base, mergeHead: true, dirtyCount: 9 });
  assert.equal(p.skip, SKIP_REASONS.ALREADY_MERGING);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
  assert.ok(!p.actions.includes(ALIGN_ACTIONS.MERGE_FROM_ORIGIN));
  assert.ok(!p.actions.includes(ALIGN_ACTIONS.WIP_SNAPSHOT), 'даже грязь не оправдывает снимок поверх MERGING');
});

// Кейсы ниже названы Дыниным при прогоне контекста блока: дерево в rebase неотличимо от
// грязного по одному счётчику, и проверка только на MERGE_HEAD пропустила бы его под мутацию.

test('дерево в rebase не трогается, хотя MERGE_HEAD там нет', () => {
  const p = planTree({ ...base, inProgressHeads: ['REBASE_HEAD'], dirtyCount: 0 });
  assert.equal(p.skip, SKIP_REASONS.IN_PROGRESS_OP);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
  assert.match(p.reasons.join(' '), /REBASE_HEAD/);
});

test('чистое дерево в rebase — самый коварный случай: счётчик грязи молчит', () => {
  const p = planTree({ ...base, inProgressHeads: ['REBASE_HEAD'], dirtyCount: 0, behind: 40 });
  assert.equal(p.skip, SKIP_REASONS.IN_PROGRESS_OP);
  assert.ok(!p.actions.includes(ALIGN_ACTIONS.MERGE_FROM_ORIGIN));
});

test('cherry-pick, revert и bisect закрыты тем же предикатом', () => {
  for (const head of ['CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG']) {
    const p = planTree({ ...base, inProgressHeads: [head], dirtyCount: 3 });
    assert.equal(p.skip, SKIP_REASONS.IN_PROGRESS_OP, `${head} обязан останавливать план`);
    assert.ok(!p.actions.includes(ALIGN_ACTIONS.WIP_SNAPSHOT), `${head}: снимок посреди операции запрещён`);
  }
});

test('hasInProgressOp шире hasMergeHead и не путает их', () => {
  assert.equal(hasInProgressOp({ inProgressHeads: ['REBASE_HEAD'] }), true);
  assert.equal(hasMergeHead({ inProgressHeads: ['REBASE_HEAD'] }), false, 'rebase — не merge');
  assert.equal(hasInProgressOp({ mergeHead: true }), true, 'merge тоже незавершённая операция');
  assert.equal(hasInProgressOp({ inProgressHeads: ['НЕЧТО'] }), false, 'голова вне закрытого списка не считается');
  assert.equal(hasInProgressOp({}), false);
});

test('detached с отставанием — report, а не «выровняем»', () => {
  const p = planTree({ ...base, branch: null, behind: 50 });
  assert.equal(p.skip, SKIP_REASONS.DETACHED);
  assert.match(p.reasons.join(' '), /сравнивать не с чем/);
});

// Отказ ниже заведён по инциденту 06.08: пакетный worktree remove снёс 2152 из 7825
// отслеживаемых файлов в canon-дереве, и первый же сухой прогон предложил снять с него
// снимок на 2165 путях — то есть закоммитить поломку и сделать её невозвратной.

test('отсутствуют отслеживаемые файлы — стоп, снимок увековечил бы поломку', () => {
  const p = planTree({ ...base, deletedCount: 2152, dirtyCount: 2165 });
  assert.equal(p.skip, SKIP_REASONS.TRACKED_DELETIONS);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
  assert.ok(!p.actions.includes(ALIGN_ACTIONS.WIP_SNAPSHOT), 'снимок с поломанного дерева запрещён');
  assert.match(p.reasons.join(' '), /2152/);
  assert.match(p.reasons.join(' '), /checkout -- \./, 'отказ обязан назвать лечение, а не только диагноз');
});

test('порога нет: одно удаление останавливает так же, как две тысячи', () => {
  const p = planTree({ ...base, deletedCount: 1, dirtyCount: 1 });
  assert.equal(p.skip, SKIP_REASONS.TRACKED_DELETIONS, 'решение владельца 06.08 — без порога доли');
});

test('удалений нет — отказ не срабатывает', () => {
  assert.equal(hasTrackedDeletions({ deletedCount: 0 }), false);
  assert.equal(hasTrackedDeletions({}), false, 'нет замера — не «удалено»');
  assert.equal(planTree({ ...base, deletedCount: 0, dirtyCount: 3 }).skip, null);
});

test('незавершённая операция сильнее удалений — порядок проверок несущий', () => {
  const p = planTree({ ...base, deletedCount: 5, inProgressHeads: ['REBASE_HEAD'] });
  assert.equal(p.skip, SKIP_REASONS.IN_PROGRESS_OP);
});

test('неснятое состояние — fail-closed, а не «наверное чисто»', () => {
  const p = planTree({ ...base, stateUnknown: true });
  assert.equal(p.skip, SKIP_REASONS.STATE_UNKNOWN);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
});

test('detached HEAD не выравнивается', () => {
  const p = planTree({ ...base, branch: null });
  assert.equal(p.skip, SKIP_REASONS.DETACHED);
});

test('дерево без карточки не мутируется никогда — разбор человеку', () => {
  const p = planTree({ ...base, card: null, dirtyCount: 4 });
  assert.equal(p.skip, SKIP_REASONS.UNREGISTERED);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
});

test('не отстало — трогать нечего, даже если грязно', () => {
  const p = planTree({ ...base, behind: 0, dirtyCount: 7 });
  assert.equal(p.skip, SKIP_REASONS.NOT_BEHIND);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.REPORT]);
});

test('MERGING побеждает все прочие причины — проверка идёт первой', () => {
  const p = planTree({ ...base, mergeHead: true, branch: null, card: null, stateUnknown: true });
  assert.equal(p.skip, SKIP_REASONS.ALREADY_MERGING);
});

// ─── действия: порядок снимка и merge ────────────────────────────────────────────

test('чистое отставшее дерево — только merge', () => {
  const p = planTree(base);
  assert.equal(p.skip, null);
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.MERGE_FROM_ORIGIN]);
  assert.match(p.reasons.join(' '), /fast-forward/);
});

test('грязное дерево — снимок СТРОГО перед merge, иначе слияние затрёт незакоммиченное', () => {
  const p = planTree({ ...base, dirtyCount: 5, dirtyFiles: ['a.md', 'b.mjs'] });
  assert.deepEqual(p.actions, [ALIGN_ACTIONS.WIP_SNAPSHOT, ALIGN_ACTIONS.MERGE_FROM_ORIGIN]);
  assert.ok(
    p.actions.indexOf(ALIGN_ACTIONS.WIP_SNAPSHOT) < p.actions.indexOf(ALIGN_ACTIONS.MERGE_FROM_ORIGIN),
  );
});

test('разошедшееся дерево названо расхождением, а не отставанием', () => {
  const p = planTree({ ...base, behind: 181, ahead: 7 });
  assert.equal(p.skip, null);
  assert.match(p.reasons.join(' '), /разошлась \(−181\/\+7\)/);
});

test('план детерминирован: один вход — один выход', () => {
  const input = { ...base, dirtyCount: 2, dirtyFiles: ['x'] };
  assert.deepEqual(planTree(input), planTree(input));
});

// ─── лемма чистоты: пришла находкой Ожегова из блока merge-abort-guard ───────────

test('чисто ⇔ выполнены ВСЕ условия сразу, а не одно', () => {
  const clean = { porcelainEmpty: true, unmergedPaths: [], head: 'p1' };
  assert.deepEqual(isWorktreeClean(clean, { parentSha: 'p1' }), { clean: true, residual: [] });
});

test('MERGE_HEAD исчез, но unmerged-индекс остался — дерево НЕ чисто', () => {
  const r = isWorktreeClean({ porcelainEmpty: false, unmergedPaths: ['docs/tasks/registry.json'], head: 'p1' }, { parentSha: 'p1' });
  assert.equal(r.clean, false);
  assert.match(r.residual.join(' '), /unmerged-файлов 1/);
  assert.match(r.residual.join(' '), /porcelain/);
});

test('HEAD сверяется ИМЕННО с parentSha квитанции, а не с «каким-нибудь»', () => {
  const r = isWorktreeClean({ porcelainEmpty: true, unmergedPaths: [], head: 'другой' }, { parentSha: 'p1' });
  assert.equal(r.clean, false);
  assert.match(r.residual.join(' '), /HEAD другой ≠ ожидаемый p1/);
});

test('незавершённая операция после отката — тоже остаток', () => {
  const r = isWorktreeClean({ porcelainEmpty: true, unmergedPaths: [], inProgressHeads: ['REBASE_HEAD'] });
  assert.equal(r.clean, false);
  assert.match(r.residual.join(' '), /REBASE_HEAD/);
});

test('ff отличает ядро, а не исполнитель', () => {
  assert.equal(isFastForward({ behind: 5, ahead: 0 }), true);
  assert.equal(isFastForward({ behind: 5, ahead: 2 }), false, 'разошлось — обычный merge');
  assert.equal(isFastForward({ behind: 0, ahead: 0 }), false, 'сливать нечего — не ff');
});

// ─── отчёт как доменное состояние ────────────────────────────────────────────────

test('planAlign разделяет план и пропуски, конфликты и снимки пусты до исполнения', () => {
  const r = planAlign([base, { ...base, tree: 'C:/w/Membrana-y', card: null }]);
  assert.equal(r.trees.length, 2);
  assert.equal(r.planned.length, 1);
  assert.equal(r.skipped.length, 1);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual(r.snapshots, []);
});

test('запись конфликта не мутирует прежний отчёт', () => {
  const r0 = planAlign([base]);
  const r1 = recordConflict(r0, { tree: base.tree, files: ['docs/tasks/registry.json'], reason: 'union не сошёлся' });
  assert.equal(r0.conflicts.length, 0, 'вход обязан остаться нетронутым — прогон пересказуем по шагам');
  assert.equal(r1.conflicts.length, 1);
  assert.equal(needsHuman(r0), false);
  assert.equal(needsHuman(r1), true, 'конфликт — стоп, а не предупреждение');
});

test('снимок записывается поимённо — иначе он необратим на практике', () => {
  const r = recordSnapshot(planAlign([base]), {
    tree: base.tree,
    files: ['docs/A.md', 'scripts/b.mjs'],
    commit: 'abc1234',
  });
  assert.deepEqual(r.snapshots[0].files, ['docs/A.md', 'scripts/b.mjs']);
  assert.equal(r.snapshots[0].commit, 'abc1234');
});

test('отчёт не молчит о пропущенных: «ничего не вывел» ≠ «всё выровнено»', () => {
  const r = planAlign([{ ...base, card: null }]);
  const out = formatAlignReport(r).join('\n');
  assert.match(out, /пропуск \(unregistered\)/);
  assert.match(out, /разбор человеку/);
});

test('пустой вход честно называет себя, а не притворяется успехом', () => {
  assert.deepEqual(formatAlignReport(planAlign([])), ['деревьев на входе нет — выравнивать нечего']);
});

test('конфликт в отчёте несёт файлы и слово про откат merge', () => {
  const r = recordConflict(planAlign([base]), { tree: base.tree, files: ['package.json'], reason: null });
  const out = formatAlignReport(r).join('\n');
  assert.match(out, /конфликт/);
  assert.match(out, /merge откачен/);
  assert.match(out, /package\.json/);
});
