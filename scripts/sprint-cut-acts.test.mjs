/**
 * Зуб ленты актов плана — вторая ось следа (долг `#sprint-cut-act-has-no-trace`, 30.07).
 *
 * ВЕЩДОК: план `mfcc-compare-sprint` v1 подписан `cutBy=tarasov` БЕЗ прогона контекста
 * тимлида. Поймал владелец («не вижу, что ты вызвал спринт через скилл»), не механизм.
 * Повтор 01.08 в прогоне `meeting-gates-teeth` — та же подпись рукой.
 *
 * Здесь проверяется ровно то, чего не хватало: что подпись резчика имеет носитель, а род
 * вне закрытого списка — ошибка входа, а не «прочее».
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ACT_KINDS,
  ACT_KIND_MOMENT,
  ACT_KIND_ORDER,
  E_ACT_KIND_UNKNOWN,
  cutterRanContext,
  isKnownActKind,
  parseAct,
} from './lib/sprint-cut/act-kinds.mjs';
import { TOOTH_IDS, cutterFindings } from './lib/sprint-cut/cut-plan.mjs';
import { readActsTrail } from './sprint-cut-check.mjs';

const act = (over = {}) => ({
  kind: ACT_KINDS.CUT_CONTEXT_RUN,
  sprintId: 'demo',
  subject: 'tarasov',
  at: '2026-08-01T10:00:00Z',
  ...over,
});

// ── закрытый список ────────────────────────────────────────────────────────────────

test('роды акта плана: ровно три, порядок канонический', () => {
  assert.deepEqual([...ACT_KIND_ORDER], ['cut_context_run', 'cut_act', 'recut_act']);
  assert.equal(ACT_KIND_ORDER.length, 3);
});

test('у каждого рода назван момент плана — зеркало не расходится с enum', () => {
  for (const kind of ACT_KIND_ORDER) {
    assert.equal(typeof ACT_KIND_MOMENT[kind], 'string');
    assert.notEqual(ACT_KIND_MOMENT[kind].trim(), '');
  }
  assert.equal(Object.keys(ACT_KIND_MOMENT).length, ACT_KIND_ORDER.length);
});

test('пятый род в TRACE_KINDS НЕ заводился: ось актов отдельная', async () => {
  const { TRACE_KIND_ORDER } = await import('./lib/execution-trace/trace-kinds.mjs');
  assert.equal(TRACE_KIND_ORDER.length, 4, 'роды исполнения закрыты по числу моментов окна');
  for (const k of ACT_KIND_ORDER) {
    assert.equal(TRACE_KIND_ORDER.includes(k), false, `${k} не должен просочиться в роды исполнения`);
  }
});

test('род вне списка — ошибка входа, а не «прочее»', () => {
  assert.equal(isKnownActKind('cut_review'), false);
  const r = parseAct(act({ kind: 'cut_review' }));
  assert.equal(r.ok, false);
  assert.equal(r.error, E_ACT_KIND_UNKNOWN);
  assert.match(r.reason, /вне закрытого списка/u);
});

// ── разбор записи ──────────────────────────────────────────────────────────────────

test('годная запись разбирается; ref и planDigest необязательны, но честно null', () => {
  const r = parseAct(act());
  assert.equal(r.ok, true);
  assert.equal(r.act.kind, ACT_KINDS.CUT_CONTEXT_RUN);
  assert.equal(r.act.ref, null);
  assert.equal(r.act.planDigest, null);
});

test('пустое несущее поле — отказ С ПРИЧИНОЙ, не молчаливый пропуск', () => {
  for (const [field, rx] of [
    ['sprintId', /sprintId/u],
    ['subject', /subject/u],
    ['at', /at/u],
  ]) {
    const r = parseAct(act({ [field]: '  ' }));
    assert.equal(r.ok, false, `${field}: пустое поле обязано быть отказом`);
    assert.match(r.reason, rx);
  }
});

test('не-объект отвергается целиком', () => {
  for (const raw of ['cut_act', 42, null, ['cut_act']]) {
    assert.equal(parseAct(raw).ok, false);
  }
});

// ── предикат прогона резчика ───────────────────────────────────────────────────────

test('прогон резчика найден — предикат истинен', () => {
  const acts = [{ kind: ACT_KINDS.CUT_CONTEXT_RUN, sprintId: 'demo', subject: 'tarasov' }];
  assert.equal(cutterRanContext(acts, { sprintId: 'demo', cutBy: 'tarasov' }), true);
});

test('чужой спринт или чужой субъект не засчитываются', () => {
  const plan = { sprintId: 'demo', cutBy: 'tarasov' };
  assert.equal(
    cutterRanContext([{ kind: ACT_KINDS.CUT_CONTEXT_RUN, sprintId: 'other', subject: 'tarasov' }], plan),
    false,
  );
  assert.equal(
    cutterRanContext([{ kind: ACT_KINDS.CUT_CONTEXT_RUN, sprintId: 'demo', subject: 'vesnin' }], plan),
    false,
  );
});

test('акт нарезки прогоном контекста не является — подпись не заменяет прогон', () => {
  const acts = [{ kind: ACT_KINDS.CUT_ACT, sprintId: 'demo', subject: 'tarasov' }];
  assert.equal(cutterRanContext(acts, { sprintId: 'demo', cutBy: 'tarasov' }), false);
});

// ── седьмой зуб ────────────────────────────────────────────────────────────────────

test('перечень находок стал из семи и остался закрытым', () => {
  assert.equal(TOOTH_IDS.length, 7);
  assert.equal(TOOTH_IDS.includes('cutter_context_missing'), true);
  assert.equal(Object.isFrozen(TOOTH_IDS), true);
});

test('ленты нет вовсе → проверка НЕ выполняется (чистое ядро не зеленеет молча)', () => {
  assert.deepEqual(cutterFindings({ sprintId: 'demo', cutBy: 'tarasov' }, undefined), []);
});

test('лента пуста → находка: отсутствие вещдока не есть вещдок наоборот', () => {
  const out = cutterFindings({ sprintId: 'demo', cutBy: 'tarasov' }, []);
  assert.equal(out.length, 1);
  assert.equal(out[0].toothId, 'cutter_context_missing');
  assert.equal(out[0].where, 'cutBy');
  assert.match(out[0].reason, /tarasov/u);
});

test('след прогона есть → находки нет', () => {
  const acts = [{ kind: ACT_KINDS.CUT_CONTEXT_RUN, sprintId: 'demo', subject: 'tarasov' }];
  assert.deepEqual(cutterFindings({ sprintId: 'demo', cutBy: 'tarasov' }, acts), []);
});

// ── Ссылки лент актов обязаны разрешаться (ответ на P1 ревью PR #1604) ───────────────
// Ревью заподозрило мёртвую ссылку в фикстуре: `ref` указывал на файл, которого нет в
// диффе. Проверено предложенной им же командой (`git ls-files`) — файл отслеживается и
// лежит в стволе, ссылка живая. Но класс реален: мёртвый `ref` в ленте даёт либо ложное
// зелёное, либо падение на чужом окружении. Закрыт зубом, а не словом.

test('каждый ref в лентах актов указывает на существующий файл', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let checked = 0;
  for (const dir of ['docs/sprint/cut/trail', 'docs/sprint/cut/fixtures/trail']) {
    const abs = resolve(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs).filter((f) => f.endsWith('.jsonl'))) {
      for (const line of readFileSync(resolve(abs, file), 'utf8').split('\n')) {
        const s = line.trim();
        if (!s || s.startsWith('#')) continue;
        const parsed = parseAct(JSON.parse(s));
        if (!parsed.ok || !parsed.act.ref) continue;
        checked += 1;
        assert.ok(
          existsSync(resolve(root, parsed.act.ref)),
          `${dir}/${file}: ref «${parsed.act.ref}» не разрешается — мёртвая ссылка в ленте`,
        );
      }
    }
  }
  assert.ok(checked > 0, 'проверять было нечего — зуб обязан иметь предмет, иначе он молчалив');
});

// ── Битая лента — ошибка входа, не молчаливый пропуск (ответ на P1 ревью #1604) ──────
// Прежняя версия делала `catch { continue }`: строка с опечаткой или родом вне закрытого
// списка исчезала бесследно. Это ровно тот молчаливый зелёный, который задача обязана
// закрыть, — и комментарий в коде утверждал обратное тому, что код делал.

const trailIo = (text) => ({ exists: () => true, read: () => text });

test('годная лента разбирается: ok, акты на месте', () => {
  const line = JSON.stringify({ kind: 'cut_act', sprintId: 'demo', subject: 'tarasov', at: '2026-08-01T10:00:00Z' });
  const res = readActsTrail('/x.jsonl', trailIo(line));
  assert.equal(res.ok, true);
  assert.equal(res.acts.length, 1);
});

test('битый JSON — ошибка входа с НОМЕРОМ строки, а не пропуск', () => {
  const res = readActsTrail('/x.jsonl', trailIo('{не json'));
  assert.equal(res.ok, false);
  assert.equal(res.problems.length, 1);
  assert.match(res.problems[0], /строка 1/u);
});

test('род вне закрытого списка роняет всю ленту: вердиктов по непонятой ленте нет', () => {
  const good = JSON.stringify({ kind: 'cut_act', sprintId: 'demo', subject: 'tarasov', at: '2026-08-01T10:00:00Z' });
  const bad = JSON.stringify({ kind: 'cut_review', sprintId: 'demo', subject: 'tarasov', at: '2026-08-01T10:00:00Z' });
  const res = readActsTrail('/x.jsonl', trailIo(`${good}\n${bad}`));
  assert.equal(res.ok, false, 'одна чужая строка обязана ронять ленту целиком');
  assert.match(res.problems[0], /строка 2/u);
  assert.match(res.problems[0], /вне закрытого списка/u);
});

test('комментарии и пустые строки законны — они не акты', () => {
  const line = JSON.stringify({ kind: 'cut_act', sprintId: 'demo', subject: 'tarasov', at: '2026-08-01T10:00:00Z' });
  const res = readActsTrail('/x.jsonl', trailIo(`# заголовок\n\n${line}\n`));
  assert.equal(res.ok, true);
  assert.equal(res.acts.length, 1);
});

test('файла нет → пустая лента, а не отказ: «ленты нет» = «прогона не было»', () => {
  const res = readActsTrail('/нет.jsonl', { exists: () => false, read: () => '' });
  assert.deepEqual(res, { ok: true, acts: [] });
});
