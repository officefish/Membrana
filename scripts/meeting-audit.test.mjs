import assert from 'node:assert/strict';
import test from 'node:test';

import { auditMeeting } from './lib/meeting-audit.mjs';

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
