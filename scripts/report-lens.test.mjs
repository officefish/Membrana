/**
 * Юнит-тесты доклада наружу (R, вердикт M4). Чистые функции — без сети/моков.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  structuralSkeleton, structuralHash, structuralIsomorphic,
  protectedTokens, protectedTokensKept,
  classifyLinkStatus, canPublish, LINK_STATUS,
} from './lib/report-lens.mjs';

const plan = '# План\n\n## Магистраль\n- задача #592 статус OPEN\n- метрика 55/60\n';
const rephrased = '# План\n\n## Главная задача\n- работа #592 статус OPEN\n- показатель 55/60\n';
const structBroken = '# План\n\n## Магистраль\n- задача #592 статус OPEN\n'; // потерян узел

test('structuralSkeleton: типы строк без содержания', () => {
  assert.equal(structuralSkeleton('# A\n\n- x\n| a |'), 'H1||B|R');
});

test('линза-rephraser: слова переписаны, структура изоморфна', () => {
  assert.equal(structuralIsomorphic(plan, rephrased), true, 'тот же скелет');
  assert.equal(structuralHash(plan), structuralHash(rephrased));
});

test('redactor пойман: потеря узла ломает изоморфизм', () => {
  assert.equal(structuralIsomorphic(plan, structBroken), false);
});

test('protectedTokens: числа, статусы, ссылки', () => {
  const t = protectedTokens('#592 OPEN 55 https://x.io GHSA-ab-cd');
  assert.ok(t.includes('#592'));
  assert.ok(t.includes('OPEN'));
  assert.ok(t.includes('55'));
  assert.ok(t.includes('https://x.io'));
  assert.ok(t.includes('GHSA-ab-cd'));
});

test('protectedTokensKept: rephrased сохраняет факты → true', () => {
  assert.equal(protectedTokensKept(plan, rephrased), true);
});

test('protectedTokensKept: искажён факт (#592→#593) → false', () => {
  assert.equal(protectedTokensKept(plan, rephrased.replace('#592', '#593')), false);
  assert.equal(protectedTokensKept(plan, rephrased.replace('OPEN', 'CLOSED')), false, 'смягчён статус');
});

test('classifyLinkStatus: внутренняя — бинарно', () => {
  assert.equal(classifyLinkStatus('internal', { exists: true }), LINK_STATUS.ALIVE);
  assert.equal(classifyLinkStatus('internal', { exists: false }), LINK_STATUS.DEAD);
});

test('classifyLinkStatus: внешняя — dead на 4xx/410, unverifiable на таймаут', () => {
  assert.equal(classifyLinkStatus('external', { status: 200 }), LINK_STATUS.ALIVE);
  assert.equal(classifyLinkStatus('external', { status: 404 }), LINK_STATUS.DEAD);
  assert.equal(classifyLinkStatus('external', { status: 410 }), LINK_STATUS.DEAD);
  assert.equal(classifyLinkStatus('external', { timedOut: true }), LINK_STATUS.UNVERIFIABLE);
  assert.equal(classifyLinkStatus('external', { status: null }), LINK_STATUS.UNVERIFIABLE);
});

test('canPublish: чисто → ok; dead → блок; unverifiable считается, не блокирует', () => {
  assert.equal(canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'external', status: LINK_STATUS.ALIVE }] }).ok, true);
  const withDead = canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'internal', status: LINK_STATUS.DEAD }] });
  assert.equal(withDead.ok, false);
  const withUnver = canPublish({ structuralIntact: true, protectedTokensKept: true, linkStatuses: [{ kind: 'external', status: LINK_STATUS.UNVERIFIABLE }] });
  assert.equal(withUnver.ok, true);
  assert.equal(withUnver.unverifiable, 1);
});

test('canPublish: сломанная структура → блок с причиной', () => {
  const r = canPublish({ structuralIntact: false, protectedTokensKept: true, linkStatuses: [] });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /структур/u.test(x)));
});

// ─── Ф1 #788: доклад по задачам — зеркало 5-блочного плана (day-report) ──────────

test('day-report: parsePlanSlots различает пустой слот и отсутствующий', async () => {
  const { parsePlanSlots } = await import('./lib/day-report.mjs');
  const md = ['## Магистраль', 'текст #592', '', '## Подкрепление', '', '## Перспективные', 'x',
    '## Экспериментальные', 'y'].join('\n'); // «Санитарные» отсутствуют
  const slots = parsePlanSlots(md);
  assert.equal(slots.length, 5, 'всегда все 5 слотов frame()');
  assert.match(slots[0].body, /#592/u);
  assert.equal(slots[1].body, '', 'пустой слот = пустая строка');
  assert.equal(slots[4].body, null, 'отсутствующий слот = null, не пустая строка');
});

test('day-report: доклад зеркалит все 5 слотов и детерминирован', async () => {
  const { parsePlanSlots, buildDayReport, missingReportSlots } = await import('./lib/day-report.mjs');
  const plan = ['## Магистраль', 'вести strategy-day-generator #592', '## Подкрепление', '- ritual-trust-contour',
    '## Перспективные', '', '## Экспериментальные', '', '## Санитарные', '#598 и #599'].join('\n');
  const input = {
    dayKey: '2026-07-21',
    slots: parsePlanSlots(plan),
    registryTasks: [
      { id: 'strategy-day-generator', leadPersona: 'vesnin', status: 'active' },
      { id: 'ritual-trust-contour', leadPersona: null, status: 'active' },
    ],
    issueStatuses: { 592: 'OPEN', 598: 'CLOSED' },
  };
  const a = buildDayReport(input);
  const b = buildDayReport(input);
  assert.equal(a, b, 'тот же вход → тот же доклад');
  assert.deepEqual(missingReportSlots(a), [], 'зеркало цело: все 5 заголовков');
  assert.match(a, /strategy-day-generator.*ведёт vesnin/u, 'назначение через ядро M3-S');
  assert.match(a, /ritual-trust-contour.*осиротело/u, 'карточка без ведущего видима, не спрятана');
  assert.match(a, /#592 — OPEN/u);
  assert.match(a, /#599 — не проверено/u, 'непроверенная ссылка — честное слово, не пропуск');
  assert.match(a, /— пусто —/u, 'пустой блок явный');
});

test('day-report: гейт зеркала возвращает диагноз потерянных слотов', async () => {
  const { missingReportSlots } = await import('./lib/day-report.mjs');
  const broken = '# Доклад\n## Магистраль\nx\n## Подкрепление\ny\n';
  const missing = missingReportSlots(broken);
  assert.deepEqual(missing, ['Перспективные', 'Экспериментальные', 'Санитарные']);
});

test('day-report: провод — morning-gate зовёт генератор после чеканки', async () => {
  const { readFileSync } = await import('node:fs');
  const gate = readFileSync(new URL('./morning-gate.mjs', import.meta.url), 'utf8');
  assert.match(gate, /day-report\.mjs/u, 'провод T7: чеканка → доклад, не отдельное касание');
  const chain = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  assert.match(chain, /"day:report":\s*"node scripts\/day-report\.mjs"/u, 'ручной перезапуск существует');
});

test('day-report: «##» внутри code-fence не обрывает слот (P2 ревью Ф1)', async () => {
  const { parsePlanSlots } = await import('./lib/day-report.mjs');
  const md = ['## Магистраль', 'до', '```', '## не заголовок', '```', 'после #42',
    '## Подкрепление', '', '## Перспективные', '', '## Экспериментальные', '', '## Санитарные', ''].join('\n');
  const slots = parsePlanSlots(md);
  assert.match(slots[0].body, /после #42/u, 'тело слота не усечено fence-блоком');
  assert.match(slots[0].body, /## не заголовок/u, 'содержимое fence сохранено в теле');
});

// ─── Ф2 #788: ласточка-зеркало — шаблон + гейт чистоты ───────────────────────────

test('swallow-mirror: скелет содержит все 5 меток и строку деталей', async () => {
  const { buildSwallowSkeleton, SWALLOW_LABELS, DETAILS_LABEL } = await import('./lib/swallow-mirror.mjs');
  const sk = buildSwallowSkeleton();
  for (const { label } of SWALLOW_LABELS) assert.match(sk, new RegExp(`^${label}:`, 'mu'));
  assert.match(sk, new RegExp(`^${DETAILS_LABEL}:`, 'mu'));
});

test('swallow-mirror: чистый черновик проходит, детали с #N разрешены', async () => {
  const { checkSwallowDraft } = await import('./lib/swallow-mirror.mjs');
  const draft = ['Доброе утро! Сегодня чиним надёжность утреннего планирования.', '',
    'Главное: доклад о задачах приходит сам после выбора главной цели.',
    'Также: отчёт партнёрам собирается по тому же зеркалу.',
    'Смотрим вперёд: витрины продукта вернутся после починки основы.',
    'Пробуем: помощник перезапускает сборку сам, если она не отвечает критериям.',
    'Гигиена: без изменений.', '', 'Детали: #592, #788'].join('\n');
  const r = checkSwallowDraft(draft);
  assert.deepEqual(r.violations, []);
  assert.equal(r.ok, true);
});

test('swallow-mirror: жаргон в теле и потерянный блок ловятся с диагнозом', async () => {
  const { checkSwallowDraft } = await import('./lib/swallow-mirror.mjs');
  const dirty = ['Доброе утро!', '',
    'Главное: чиним MAIN_DAY_ISSUE и провод ritual:day.',
    'Также: без изменений.',
    'Смотрим вперёд: без изменений.',
    'Пробуем: без изменений.', '', 'Детали: #592'].join('\n'); // «Гигиена» потеряна
  const r = checkSwallowDraft(dirty);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => /Гигиена/u.test(v)), 'потерянный блок назван');
  assert.ok(r.violations.some((v) => /жаргон/u.test(v)), 'жаргон назван');
});

test('swallow-mirror: плейсхолдер и нарушенный порядок ловятся', async () => {
  const { checkSwallowDraft } = await import('./lib/swallow-mirror.mjs');
  const bad = ['Привет!', '', 'Также: раньше главного.',
    'Главное: <одной фразой, без внутренних имён>',
    'Смотрим вперёд: ок.', 'Пробуем: ок.', 'Гигиена: ок.'].join('\n');
  const r = checkSwallowDraft(bad);
  assert.ok(r.violations.some((v) => /плейсхолдер/u.test(v)));
  assert.ok(r.violations.some((v) => /порядок/u.test(v)));
});
