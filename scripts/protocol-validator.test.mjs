import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  countRoleReplies,
  extractAgendaIds,
  findUncoveredAgendaItems,
  parseVotingTable,
  protocolBody,
  unknownBracketLabels,
  validateProtocol,
} from './lib/protocol-validator.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('countRoleReplies: [Роль]: и [Роль — Имя]: формы', () => {
  const md = '[Teamlead]: раз\n[Структурщик — Ozhegov]: два\n[Математик]: три\nтекст [не роль]: мимо';
  const c = countRoleReplies(md);
  assert.equal(c.Teamlead, 1);
  assert.equal(c.Структурщик, 1);
  assert.equal(c.Математик, 1);
  assert.equal(c.Музыкант, 0);
});

test('живой консилиум-протокол 14.07 проходит канон (регресс-фикстура)', () => {
  for (const rel of [
    'docs/seanses/quality-control-contour-2026-07-14.md',
    'docs/seanses/cowork-sprint-format-2026-07-14.md',
  ]) {
    const res = validateProtocol(read(rel), { kind: 'consilium', minReplies: 20 });
    assert.ok(res.ok, `${rel}: ${res.problems.join('; ')}`);
  }
});

test('невалидный консилиум: роль молчит + мало реплик + нет итога', () => {
  const md = '# Метаданные\n| Поле | Значение |\n[Teamlead]: одна реплика\n[Структурщик]: вторая';
  const res = validateProtocol(md, { kind: 'consilium', minReplies: 20 });
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /Математик/.test(p)));
  assert.ok(res.problems.some((p) => /минимума/.test(p)));
  assert.ok(res.problems.some((p) => /итог/i.test(p)));
});

test('parseVotingTable: балл считается и сверяется', () => {
  const md = [
    '| Роль | Балл /10 |',
    '| Teamlead | 7 |',
    '| Структурщик | 7 |',
    '| Математик | 6 |',
    '| Музыкант | 5 |',
    '| Верстальщик | 7 |',
    '**Средний балл:** 6.4',
  ].join('\n');
  const v = parseVotingTable(md);
  assert.equal(v.scores.length, 5);
  assert.equal(v.declared, 6.4);
  assert.ok(Math.abs(v.average - 6.4) < 0.01);
});

test('живой insight-review 14.07 проходит канон (регресс-фикстура)', () => {
  const res = validateProtocol(read('docs/insights/insight-office-panel-qa-section/REVIEW.md'), {
    kind: 'insight-review',
  });
  assert.ok(res.ok, res.problems.join('; '));
});

test('insight-review ловит расхождение среднего балла', () => {
  const md = [
    '| Поле | Значение |',
    '[Teamlead]: a', '[Структурщик]: b', '[Математик]: c', '[Музыкант]: d', '[Верстальщик]: e',
    '| Роль | /10 |',
    '| Teamlead | 9 |', '| Структурщик | 9 |', '| Математик | 9 |', '| Музыкант | 9 |', '| Верстальщик | 9 |',
    '**Средний балл:** 3.0',
    'Рекомендуемый статус: adopted',
  ].join('\n');
  const res = validateProtocol(md, { kind: 'insight-review' });
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /не сходится/.test(p)));
});

// ─── rt-6: полнота повестки и подсказка формата (#539) ────────────────────────────

test('extractAgendaIds: жирные ID вопросов повестки', () => {
  const topic = '**A1 — гвард.** текст\n- **B2** норма\n**Q3.** вопрос\nобычный **жирный** не-ID';
  assert.deepEqual(extractAgendaIds(topic), ['A1', 'B2', 'Q3']);
});

test('protocolBody отсекает эхо-вопрос до первой реплики', () => {
  const md = '# Метаданные\n**Вопрос:** A3 B1 упомянуты тут\n\n[Teamlead]: обсуждаем A1\n## Итог';
  const body = protocolBody(md);
  assert.doesNotMatch(body, /Метаданные/u);
  assert.match(body, /обсуждаем A1/u);
  assert.doesNotMatch(body, /A3 B1 упомянуты/u, 'эхо-вопрос НЕ в теле');
});

test('unknownBracketLabels ловит формат [Имя · Роль] (инцидент 16.07)', () => {
  const md = '[Ozhegov · Структурщик]: раз\n[Teamlead]: два';
  const unknown = unknownBracketLabels(md);
  assert.ok(unknown.includes('Ozhegov · Структурщик'));
  assert.ok(!unknown.includes('Teamlead'), 'известная роль не в списке');
});

test('findUncoveredAgendaItems: ID в эхе, но не в реплике → не покрыт', () => {
  const topic = '**A1 —** раз\n**A2 —** два\n**A3 —** три';
  // Протокол обсудил A1/A2, A3 только в эхе-вопросе.
  const protocol = '**Вопрос:** A1 A2 A3\n\n[Teamlead]: решаем A1 и A2\n## Итог\n| A1 | done |\n| A2 | done |';
  assert.deepEqual(findUncoveredAgendaItems(topic, protocol), ['A3']);
});

test('золотой: три протокола 16.07 РЕАЛЬНО роняли повестку (rt-6 их ловит)', () => {
  const cases = [
    {
      topic: 'docs/seanses/rt8-loose-ends-topic-2026-07-16.md',
      protocol: 'docs/seanses/rt8-loose-ends-2026-07-16.md',
    },
  ];
  for (const c of cases) {
    const uncovered = findUncoveredAgendaItems(read(c.topic), read(c.protocol));
    assert.ok(uncovered.length > 0, `${c.protocol}: гейт обязан поймать пропуск`);
    // Именно те, что я нашёл руками: A3, B1, B2, B3, C1.
    assert.ok(uncovered.includes('B1'), 'B1 (вопрос про пропуск вопросов) пропущен — гейт видит');
    assert.ok(uncovered.includes('A3'), 'A3 пропущен');
  }
});

test('validateProtocol с agenda: пропуск повестки БЕЗ вердикта → problem', () => {
  const topic = '**A1 —** раз\n**A2 —** два';
  const goodBody = Array.from({ length: 20 }, (_, i) =>
    `[${['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'][i % 5]}]: реплика ${i} про A1 и A2`,
  ).join('\n');
  const md = `| Поле | Значение |\n**Вопрос:** A1 A2\n\n${goodBody}\n## Итоговое решение\nконсенсус`;
  assert.equal(validateProtocol(md, { agenda: topic }).ok, true, 'A1+A2 покрыты → ok');

  // Секции вердикта нет → вопрос вероятно уронен, зубы сохранены.
  const noVerdict = `| Поле | Значение |\n**Вопрос:** A1 A2\n\n${goodBody}`;
  const topic3 = topic + '\n**A3 —** три';
  const res = validateProtocol(noVerdict, { agenda: topic3, minReplies: 20 });
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /повестка не покрыта.*A3/u.test(p)), 'A3 назван');
});

test('#619: метки нет, но вердикт есть → заметка, а не отказ (ложный красный M0/M1′/M4)', () => {
  const topic = '**A1 —** раз\n**A2 —** два\n**A3 —** три';
  const body = Array.from({ length: 20 }, (_, i) =>
    `[${['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'][i % 5]}]: реплика ${i} про A1 и A2`,
  ).join('\n');
  // A3 разобран по существу, но ID-метка в теле не проставлена — ровно кейс 18.07.
  const md = `| Поле | Значение |\n**Вопрос:** A1 A2 A3\n\n${body}\n## Итоговое решение\nконсенсус по всем трём`;
  const res = validateProtocol(md, { agenda: topic });
  assert.equal(res.ok, true, 'вердикт есть → прогон не роняем');
  assert.ok(!res.problems.some((p) => /повестка не покрыта/u.test(p)), 'в problems этого нет');
  assert.ok(res.notes.some((n) => /повестка не покрыта.*A3/u.test(n)), 'но сигнал не проглочен — он в notes');
});

test('validateProtocol: молчание + неверный формат → подсказка о формате', () => {
  const md = '| Поле | Значение |\n[Иванов · Teamlead]: раз\n[Петров · Математик]: два\n## Итог';
  const res = validateProtocol(md, { minReplies: 1 });
  assert.ok(res.problems.some((p) => /формат меток неверный/u.test(p)), 'подсказка есть');
});

// ── reconcileReplyCount (NB2 ночь 17.07) ────────────────────────────────────────

test('reconcileReplyCount: врущий футер (21) приводится к факту (2 реплики)', async () => {
  const { reconcileReplyCount } = await import('./lib/protocol-validator.mjs');
  const md = '[Математик]: раз.\n[Структурщик]: два.\n\n*Реплик в диалоге: 21; все высказались.*';
  const r = reconcileReplyCount(md);
  assert.equal(r.total, 2);
  assert.equal(r.stated, 21);
  assert.equal(r.corrected, true);
  assert.match(r.md, /Реплик в диалоге: 2;/u);
});

test('reconcileReplyCount: верный футер не трогается', async () => {
  const { reconcileReplyCount } = await import('./lib/protocol-validator.mjs');
  const md = '[Математик]: раз.\n\n*Реплик в диалоге: 1.*';
  const r = reconcileReplyCount(md);
  assert.equal(r.corrected, false);
  assert.equal(r.md, md);
});

test('reconcileReplyCount: нет футера — md не меняется', async () => {
  const { reconcileReplyCount } = await import('./lib/protocol-validator.mjs');
  const md = '[Математик]: раз.';
  const r = reconcileReplyCount(md);
  assert.equal(r.matched, false);
  assert.equal(r.corrected, false);
  assert.equal(r.md, md);
});

// ── hasVerdictSection (NB3 ночь 17.07, rt-6 честный) ────────────────────────────

test('hasVerdictSection: секция итогового решения распознаётся', async () => {
  const { hasVerdictSection } = await import('./lib/protocol-validator.mjs');
  const md = '[Математик]: раз.\n\n## Итоговое решение консилиума\n\n| Вопрос | Решение |';
  assert.equal(hasVerdictSection(md), true);
});

test('hasVerdictSection: вердикт/Definition of Done распознаётся', async () => {
  const { hasVerdictSection } = await import('./lib/protocol-validator.mjs');
  assert.equal(hasVerdictSection('[Teamlead]: ...\n### Вердикт: LGTM'), true);
  assert.equal(hasVerdictSection('[Teamlead]: ...\n## Definition of Done (день)'), true);
});

test('hasVerdictSection: кириллица после «итогов» (\\w её не матчит — дефект #619)', async () => {
  const { hasVerdictSection } = await import('./lib/protocol-validator.mjs');
  // Без хвоста «консилиума» — вторая альтернатива не спасает, работает только \p{L}.
  assert.equal(hasVerdictSection('[Teamlead]: ...\n## Итоговое решение'), true);
  assert.equal(hasVerdictSection('[Teamlead]: ...\n## Решение консилиума'), true);
});

test('hasVerdictSection: без секции вердикта — false (вопросы могли быть уронены)', async () => {
  const { hasVerdictSection } = await import('./lib/protocol-validator.mjs');
  const md = '[Математик]: раз.\n[Структурщик]: два.\n[Музыкант]: три.';
  assert.equal(hasVerdictSection(md), false);
});

test('NB3 связка: метки нет, но вердикт есть → случай «отвечено без метки», не «уронено»', async () => {
  const { findUncoveredAgendaItems, hasVerdictSection } = await import('./lib/protocol-validator.mjs');
  // Повестка с V1..V2, протокол отвечает по сути в таблице БЕЗ меток V1/V2 (кейс ВИЗОР 17.07)
  const topic = '**V1 — первый вопрос?**\n**V2 — второй вопрос?**';
  const protocol = '[Математик]: разобрали оба.\n\n## Итоговое решение консилиума\n| Тема | Решение |\n| интеграция | нет |';
  const uncovered = findUncoveredAgendaItems(topic, protocol);
  assert.deepEqual(uncovered, ['V1', 'V2'], 'метки действительно не проставлены');
  assert.equal(hasVerdictSection(protocol), true, 'но секция вердикта есть → не «уронено»');
});

// ─── validateProtocol meeting-режим: посылки обязательны ДО записи (#616) ────────

test('#616: заседание без секции посылок не проходит канон (гейт при записи)', async () => {
  const { validateProtocol } = await import('./lib/protocol-validator.mjs');
  const body = Array.from({ length: 20 }, (_, i) =>
    `[${['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'][i % 5]}]: реплика ${i}`,
  ).join('\n');
  const md = `| Поле | Значение |\n\n${body}\n## Итоговое решение\nконсенсус`;

  const asMeeting = validateProtocol(md, { meeting: true });
  assert.equal(asMeeting.ok, false, 'заседание обязано назвать основание');
  assert.ok(asMeeting.problems.some((p) => /список.*посылок/iu.test(p)), 'причина названа');

  // Обычный консилиум вправе не иметь секции посылок — правило только для заседаний.
  assert.equal(validateProtocol(md, { meeting: false }).ok, true);
});

test('#616: заседание с посылками и чистым DoD проходит', async () => {
  const { validateProtocol } = await import('./lib/protocol-validator.mjs');
  const body = Array.from({ length: 20 }, (_, i) =>
    `[${['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'][i % 5]}]: реплика ${i}`,
  ).join('\n');
  const md = `| Поле | Значение |\n\n${body}\n## Итоговое решение\n\n**Полный список посылок вердикта:**\n1. Вход из предшественника.\n\n**Definition of Done:**\n- своё обязательство\n`;
  const r = validateProtocol(md, { meeting: true, siblingIds: ['F1', 'H1'] });
  assert.equal(r.ok, true, r.problems.join('; '));
});
