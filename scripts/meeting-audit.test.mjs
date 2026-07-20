import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { AGENDA_FILE_MASK, auditMeeting, readTopics } from './lib/meeting-audit.mjs';

const head = '# Метаданные\n\n---\n\n[Музыкант]: Начали.\n\n';

const goodProtocol = (id) => `${head}[Teamlead]: Вердикт по ${id}.

## Итоговое решение консилиума

**Полный список посылок вердикта:**
1. Посылка-вход из предшественника.

**Definition of Done:**
- Тест без сети.
`;

const state = (over = {}) => ({
  // Повестка обязана требовать посылки (контракт расширен 18.07 после провала M2″).
  topics: [{ file: 'M1-topic.md', md: '**B1 — вопрос?**\n\nпроза без ID\n\nПолный список посылок обязателен.\n' }],
  protocols: [{ file: 'm1.md', md: goodProtocol('B1') }],
  untracked: [],
  ...over,
});

test('чистое заседание: нарушений нет', () => {
  const { violations } = auditMeeting(state());
  assert.equal(violations, 0);
});

test('проверка 1 валит повестку с двумя ID (S-M1)', () => {
  const r = auditMeeting(state({ topics: [{ file: 'M1-topic.md', md: '**B1 — а?**\n**B2 — б?**\n' }] }));
  const c = r.checks.find((x) => x.n === 1);
  assert.equal(c.status, 'FAIL');
  assert.match(c.note, /2 вопрос/u);
});

test('проверка 2 валит протокол без секции вердикта (S-M2)', () => {
  const r = auditMeeting(state({ protocols: [{ file: 'm1.md', md: `${head}[Teamlead]: Поговорили.\n` }] }));
  const c = r.checks.find((x) => x.n === 2);
  assert.equal(c.status, 'FAIL');
  assert.match(c.note, /заседание не состоялось/u);
});

test('проверка 3 валит протокол, датированный раньше предшественника', () => {
  const r = auditMeeting(
    state({
      protocols: [
        { file: 'm1.md', md: `2026-07-18T10:00:00.000Z\n${goodProtocol('B1')}` },
        { file: 'm2.md', md: `2026-07-18T09:00:00.000Z\n${goodProtocol('H1')}` },
      ],
    }),
  );
  const c = r.checks.find((x) => x.n === 3);
  assert.equal(c.status, 'FAIL');
});

test('проверка 4 ловит колонизацию соседней комнаты по ID из другой повестки', () => {
  const colonizing = `${head}[Teamlead]: Вердикт.

## Итоговое решение консилиума

**Полный список посылок вердикта:**
1. Вход.

**Definition of Done:**
- Закрепить H1 контракт-тестом.
`;
  const r = auditMeeting(
    state({
      topics: [
        { file: 'M1-topic.md', md: '**B1 — вопрос?**\n' },
        { file: 'M2-topic.md', md: '**H1 — соседний?**\n' },
      ],
      protocols: [{ file: 'm1.md', md: colonizing }],
    }),
  );
  const c = r.checks.find((x) => x.n === 4);
  assert.equal(c.status, 'FAIL');
  assert.match(c.note, /чужим вопросам \(H1\)/u);
});

test('проверка 5 при untracked даёт НЕЧЕМ, а не FAIL — и не валит код возврата', () => {
  const r = auditMeeting(state({ untracked: ['docs/seanses/m1.md'] }));
  const c = r.checks.find((x) => x.n === 5);
  assert.equal(c.status, 'НЕЧЕМ');
  assert.equal(r.violations, 0, 'отсутствие зубов ≠ нарушение');
});

// ─── проверка 6: обход инструмента (#616, вариант A) ────────────────────────────

test('#616: протокол после отсечки без пометки канала → FAIL (записан мимо инструмента)', () => {
  const { checks } = auditMeeting(state({ protocols: [{ file: 'm1-2026-07-20.md', md: goodProtocol('B1') }] }));
  const c6 = checks.filter((c) => c.n === 6);
  assert.equal(c6.length, 1);
  assert.equal(c6[0].status, 'FAIL');
  assert.match(c6[0].note, /мимо consilium\.mjs/u);
});

test('#616: протокол с пометкой канала → PASS (гейт посылок отработал при записи)', () => {
  const stamped = `<!-- канал: llm — протокол произведён yarn consilium -->\n${goodProtocol('B1')}`;
  const { checks } = auditMeeting(state({ protocols: [{ file: 'm1-2026-07-20.md', md: stamped }] }));
  assert.equal(checks.filter((c) => c.n === 6)[0].status, 'PASS');
});

test('#616: протоколы ДО отсечки не судятся задним числом', () => {
  // Ретроактивность запрещена тем же принципом, что и добор посылок задним числом.
  const { checks } = auditMeeting(state({ protocols: [{ file: 'm1-2026-07-18.md', md: goodProtocol('B1') }] }));
  assert.equal(checks.filter((c) => c.n === 6).length, 0, 'старые протоколы вне правила');
});

// ─── #696: маска повесток видит все три живых соглашения об именах ───────────────

test('#696: маска ловит M*-topic, M*_AGENDA и AGENDA_M* — три живых соглашения', () => {
  for (const f of ['M0-topic.md', 'M1s-topic.md', 'M2p-topic.md', 'M0_AGENDA.md', 'M4_AGENDA.md', 'AGENDA_M0.md', 'AGENDA_M1_RUN2.md']) {
    assert.ok(AGENDA_FILE_MASK.test(f), `повестка должна попадать под маску: ${f}`);
  }
});

test('#696: маска не цепляет обвес заседания (EPIC, MEETING_ACTIVE, TOXIC_PILOT_RESULT)', () => {
  for (const f of ['EPIC.md', 'MEETING_ACTIVE.md', 'MEETING_BRIEF.md', 'TOXIC_PILOT_RESULT.md']) {
    assert.ok(!AGENDA_FILE_MASK.test(f), `не повестка, под маску попадать не должен: ${f}`);
  }
});

test('#696: readTopics читает M*_AGENDA.md → проверки 1 и 4 РЕАЛЬНО запускаются', () => {
  // Корень #696: маска ловила только `-topic.md`, повестки `M*_AGENDA.md` давали
  // topics=[] → проверок 1 и 4 в выводе не было вовсе (ложно-зелёный «Нарушений: 0»).
  const root = mkdtempSync(join(tmpdir(), 'meeting-audit-696-'));
  try {
    const dir = join(root, 'docs', 'meeting', 'demo');
    mkdirSync(dir, { recursive: true });
    // Две повестки соседних комнат — материал для проверки 4 (колонизация по ID).
    writeFileSync(join(dir, 'M0_AGENDA.md'), '**B1 — вопрос?**\n\nПолный список посылок обязателен.\n');
    writeFileSync(join(dir, 'M1_AGENDA.md'), '**H1 — соседний вопрос?**\n');
    writeFileSync(join(dir, 'EPIC.md'), '# Эпик — не повестка\n');

    const topics = readTopics(root, 'demo');
    assert.equal(topics.length, 2, 'обе повестки M*_AGENDA прочитаны, EPIC отсеян');

    const { checks } = auditMeeting({ topics, protocols: [], untracked: [] });
    assert.ok(checks.some((c) => c.n === 1), 'проверка 1 запускается на непустых повестках');
    // Колонизация: протокол B1, тянущий H1 из соседней повестки в DoD → проверка 4 FAIL.
    const colonizing = `${head}[Teamlead]: Вердикт.\n\n## Итоговое решение консилиума\n\n**Полный список посылок вердикта:**\n1. Вход.\n\n**Definition of Done:**\n- Закрепить H1 контракт-тестом.\n`;
    const r = auditMeeting({ topics, protocols: [{ file: 'm0.md', md: colonizing }], untracked: [] });
    const c4 = r.checks.find((c) => c.n === 4);
    assert.equal(c4.status, 'FAIL', 'проверка 4 обрела зубы: соседний ID виден');
    assert.match(c4.note, /H1/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
