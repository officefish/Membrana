/**
 * Зубы порта кладбища (блок b3 спринта `angelina-hostess-impl`).
 *
 * Проход гоняется на ФИКСТУРНОМ дереве, а не на своём репозитории: в своём стор цикла не
 * заведён, и зуб над ним проверял бы ровно одну ветку — «перенести нечего». Настоящий
 * перенос надо увидеть, иначе слова «GC работает» ничем не подтверждены.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { planVoidMove } from './lib/gc-void.mjs';
import { presentGc, readProjection, runGc } from './gc.mjs';

const EVIDENCE = 'at=2026-08-23;by=owner;ref=docs/meeting/angelina-hostess/M5_VERDICT.md';

/** Фикстурное дерево: инсайт, стор цикла с приговором, кладбище. */
function tree({ evidence = EVIDENCE, value = 'rejected', withInsight = true, store = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gc-'));
  const write = (rel, body) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  };
  if (withInsight) {
    write('docs/insights/insight-старый-сценарий/INSIGHT.md', '# Старый сценарий\n\nтело\n');
    write('docs/insights/insight-старый-сценарий/meta.json', '{"id":"insight-старый-сценарий"}\n');
  }
  if (store) {
    write('docs/insights/_lifecycle/base-context.json', JSON.stringify({
      contextId: 'fx', schemaVersion: 1,
      insightRevisions: [{ id: 'rev-1', insightId: 'insight-старый-сценарий' }],
      mandates: [{ id: 'mandate-1', insightRevisionRef: 'rev-1' }],
      slices: [], representations: [], transcriptionRelations: [],
    }));
    write('docs/insights/_lifecycle/views/current.json', JSON.stringify({
      currentAssessments: {
        'D:mandate-1': {
          kind: 'Some',
          assertion: { assertionId: 'a1', axis: 'D', subjectRef: 'mandate-1', value, evidenceRef: evidence },
        },
      },
    }));
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

// ── план переноса (ядро) ──────────────────────────────────────────────────────

test('план переноса: родитель и внешние производные — ОДНОЙ операцией', () => {
  const plan = planVoidMove(
    { subjectRef: 'x' },
    { parent: 'docs/insights/x', derivatives: ['docs/seanses/x-прогон.md'] },
  );
  assert.equal(plan.ok, true);
  assert.equal(plan.moves.length, 2, 'разорванный перенос оставил бы полуживой путь');
  assert.deepEqual(plan.moves[0], { from: 'docs/insights/x', to: 'docs/void/x', role: 'родитель' });
  assert.equal(plan.moves[1].role, 'производная');
});

test('план переноса: производная ВНУТРИ родителя отдельным ходом не считается', () => {
  const plan = planVoidMove(
    { subjectRef: 'x' },
    { parent: 'docs/insights/x', derivatives: ['docs/insights/x/RESEARCH.md'] },
  );
  assert.equal(plan.moves.length, 1, 'она едет вместе с каталогом');
});

test('план переноса КРАСНОЕ: приговорён, а пути в дереве нет — перенос без предмета', () => {
  const plan = planVoidMove({ subjectRef: 'x' }, { parent: null });
  assert.equal(plan.ok, false);
  assert.match(plan.reason, /путь в дереве не найден/u);
});

test('план переноса КРАСНОЕ: у следа нет имени', () => {
  assert.equal(planVoidMove({}, { parent: 'p' }).ok, false);
});

// ── проход над деревом ────────────────────────────────────────────────────────

test('приговорённый след переносится на кладбище с эпитафией — это и есть предмет блока', () => {
  const { root, cleanup } = tree();
  try {
    const r = runGc(root, { today: '2026-08-23' });
    assert.equal(r.moved.length, 1, 'до моста и порта этот перенос был невозможен');
    assert.equal(existsSync(join(root, 'docs/insights/insight-старый-сценарий')), false, 'живой путь убран');
    const moved = join(root, 'docs/void/mandate-1/INSIGHT.md');
    assert.equal(existsSync(moved), true, 'след лёг на кладбище');

    const body = readFileSync(moved, 'utf8');
    assert.match(body, /^---\nstatus: rejected/u, 'эпитафия — ПЕРВОЕ, что видит читатель (барьер №1)');
    assert.match(body, /rejectedAt: 2026-08-23/u);
    assert.match(body, /rejectedBy: owner/u);
    assert.match(body, /не восстанавливать без нового вердикта/u);
    assert.match(body, /# Старый сценарий/u, 'история не убита — убита читаемость мёртвого пути');
  } finally { cleanup(); }
});

test('сухой прогон ничего не двигает, но говорит то же самое', () => {
  const { root, cleanup } = tree();
  try {
    const r = runGc(root, { dry: true, today: '2026-08-23' });
    assert.equal(r.moved.length, 1);
    assert.equal(existsSync(join(root, 'docs/insights/insight-старый-сценарий')), true, 'дерево не тронуто');
    assert.match(presentGc(r), /сухой прогон/u);
  } finally { cleanup(); }
});

test('принятое не трогается: GC исполняет приговор, а не судит', () => {
  const { root, cleanup } = tree({ value: 'accepted' });
  try {
    const r = runGc(root, { today: '2026-08-23' });
    assert.equal(r.moved.length, 0);
    assert.equal(r.held.length, 0);
    assert.equal(existsSync(join(root, 'docs/insights/insight-старый-сценарий')), true);
  } finally { cleanup(); }
});

test('приговорён, но эпитафия неполна — НЕ едет и НЕ молчит', () => {
  const { root, cleanup } = tree({ evidence: 'docs/meeting/x/VERDICT.md' });
  try {
    const r = runGc(root, { today: '2026-08-23' });
    assert.equal(r.moved.length, 0, 'эпитафия без даты — барьер №1 не поставить');
    assert.equal(r.held.length, 1);
    assert.match(presentGc(r), /приговорён, но не перенесён/u);
    assert.match(presentGc(r), /дата приговора/u, 'названо, чего именно не хватает');
    assert.equal(existsSync(join(root, 'docs/insights/insight-старый-сценарий')), true);
  } finally { cleanup(); }
});

test('приговорён, а пути нет — задержан с причиной, а не пропущен молча', () => {
  const { root, cleanup } = tree({ withInsight: false });
  try {
    const r = runGc(root, { today: '2026-08-23' });
    assert.equal(r.moved.length, 0);
    assert.equal(r.held.length, 1);
    assert.match(r.held[0].gaps.join(' '), /путь в дереве не найден/u);
  } finally { cleanup(); }
});

test('стора нет — «перенесено 0» печатается ВМЕСТЕ С ПРИЧИНОЙ, не пустым отчётом', () => {
  // Ровно эта ветка отделяет честный ноль от станка нуля: молчаливый сборщик неотличим
  // от сломанного, и вердикт M5 требует шумности прямо.
  const { root, cleanup } = tree({ store: false });
  try {
    const r = runGc(root, { today: '2026-08-23' });
    const text = presentGc(r);
    assert.match(text, /перенесено 0/u);
    assert.match(text, /причина: .*не заведён/u);
    assert.equal(r.unreadable, false, 'ненаписанный стор — не поломка');
  } finally { cleanup(); }
});

test('нечитаемая проекция — красное: неизвестно, что осталось живым', () => {
  const { root, cleanup } = tree();
  try {
    writeFileSync(join(root, 'docs/insights/_lifecycle/views/current.json'), '{битый', 'utf8');
    const r = runGc(root, { today: '2026-08-23' });
    assert.equal(r.unreadable, true);
    assert.match(readProjection(root).reason, /нечитаема/u);
  } finally { cleanup(); }
});

test('кладбище растёт монотонно: удаления проход не делает', () => {
  const { root, cleanup } = tree();
  try {
    runGc(root, { today: '2026-08-23' });
    const body = readFileSync(join(root, 'docs/void/mandate-1/INSIGHT.md'), 'utf8');
    assert.match(body, /тело/u, 'содержимое перенесено целиком, а не стёрто');
    assert.equal(existsSync(join(root, 'docs/void/mandate-1/meta.json')), true, 'не-markdown тоже переехал');
  } finally { cleanup(); }
});
