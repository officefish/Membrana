import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byCodePoint,
  dateFromFilename,
  topicSlug,
  excerpt,
  parseRoleReplies,
  parseReviewVote,
  selectEntries,
  renderJournal,
  TOKEN_BUDGET,
  CHARS_PER_TOKEN,
} from './persona-memory-extract.mjs';

// ─── фикстуры ──────────────────────────────────────────────────────────────────

const PROTOCOL_MD = `# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-12T14:52:34.958Z |

[Структурщик]: Зафиксирую термины, иначе спор будет о словах.

[Математик]: Численно это очевидно. Data-anchor: detector = const.
Продолжение реплики на второй строке.

[Музыкант]: Поддержу с практической стороны.

[Математик]: Одно уточнение к серверному якорю: frozen-image даёт stale code-anchor.

---

## Итог
`;

const REVIEW_MD = `[Teamlead]: Идея бьёт в реальную боль.

[Математик]: Экстракция должна быть чистой и детерминированной.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | месяц (пилот 1 персона) | 6 |
| Математик | да | после MVP (калибровка — 2-й шаг) | 7 |

## Резюме Teamlead
`;

function candidate(over = {}) {
  return {
    kind: 'позиция',
    topic: 't',
    date: '2026-07-01',
    body: 'x'.repeat(200),
    provenance: 'docs/seanses/t-2026-07-01.md#reply-1',
    ...over,
  };
}

// ─── чистые помощники ──────────────────────────────────────────────────────────

test('dateFromFilename: последняя дата из имени; без даты → null', () => {
  assert.equal(dateFromFilename('drift-anchor-triggers-2026-07-12.md'), '2026-07-12');
  assert.equal(dateFromFilename('desktop-product-line-2026-06-17-2026-06-17.md'), '2026-06-17');
  assert.equal(dateFromFilename('README.md'), null);
});

test('topicSlug: срезает расширение и хвостовые даты (включая двойные)', () => {
  assert.equal(topicSlug('drift-anchor-triggers-2026-07-12.md'), 'drift-anchor-triggers');
  assert.equal(topicSlug('desktop-product-line-2026-06-17-2026-06-17.md'), 'desktop-product-line');
});

test('excerpt: короткий текст не трогает, длинный режет по слову с маркером', () => {
  assert.equal(excerpt('a b', 10), 'a b');
  const long = 'слово '.repeat(100);
  const cut = excerpt(long, 50);
  assert.ok(cut.length <= 50 + 5);
  assert.ok(cut.endsWith('[…]'));
});

// ─── парсер реплик ─────────────────────────────────────────────────────────────

test('parseRoleReplies: обе реплики роли, многострочная склеена, чужие роли отброшены', () => {
  const replies = parseRoleReplies(PROTOCOL_MD, 'Математик');
  assert.equal(replies.length, 2);
  assert.equal(replies[0].index, 1);
  assert.ok(replies[0].text.includes('Продолжение реплики на второй строке.'));
  assert.ok(replies[1].text.startsWith('Одно уточнение'));
  assert.equal(parseRoleReplies(PROTOCOL_MD, 'Верстальщик').length, 0);
});

// ─── парсер таблицы голосования ────────────────────────────────────────────────

test('parseReviewVote: фиксированный парсер строки роли', () => {
  const vote = parseReviewVote(REVIEW_MD, 'Математик');
  assert.deepEqual(vote, {
    decision: 'да',
    stage: 'после MVP (калибровка — 2-й шаг)',
    score: '7',
  });
  assert.equal(parseReviewVote(REVIEW_MD, 'Верстальщик'), null);
  assert.equal(parseReviewVote('# без таблицы', 'Математик'), null);
});

test('parseReviewVote: строка-заглушка из прочерков (роль не голосовала) → null', () => {
  const md = ['## Голосование приоритета', '', '| Роль | Внедрять | Этап | /10 |', '|---|---|---|---|', '| Математик | — | — | — |'].join('\n');
  assert.equal(parseReviewVote(md, 'Математик'), null);
});

// ─── отбор под бюджет ──────────────────────────────────────────────────────────

test('selectEntries: свежая дата побеждает при равной важности', () => {
  const cands = [
    candidate({ date: '2026-01-01', provenance: 'a#1' }),
    candidate({ date: '2026-07-01', provenance: 'b#1' }),
  ];
  const picked = selectEntries(cands, { budgetChars: 400 });
  assert.equal(picked.length, 1);
  assert.equal(picked[0].provenance, 'b#1');
});

test('selectEntries: человек-флаг importance поднимает среднюю по свежести запись над самой новой (0.6·0.5+0.4 > 0.6)', () => {
  const cands = [
    candidate({ date: '2026-01-01', provenance: 'old#1' }),
    candidate({ date: '2026-04-01', provenance: 'mid#1' }),
    candidate({ date: '2026-07-01', provenance: 'new#1' }),
  ];
  const picked = selectEntries(cands, { budgetChars: 400, importance: { 'mid#1': 1 } });
  assert.equal(picked.length, 1);
  assert.equal(picked[0].provenance, 'mid#1');
});

test('selectEntries: бюджет соблюдается, отбор детерминирован', () => {
  const cands = Array.from({ length: 100 }, (_, i) =>
    candidate({ provenance: `p#${String(i).padStart(3, '0')}`, date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}` }),
  );
  const budgetChars = TOKEN_BUDGET * CHARS_PER_TOKEN - 600;
  const a = selectEntries(cands, { budgetChars });
  const b = selectEntries(cands, { budgetChars });
  assert.deepEqual(a, b);
  assert.ok(a.length > 0 && a.length < cands.length, 'бюджет должен отсечь часть кандидатов');
  // Инвариант фазы 1: ЦЕЛИКОМ отрендеренный журнал укладывается в <5K токенов.
  const journal = renderJournal({ slug: 'dynin', roleLabel: 'Математик', entries: a, totalCandidates: cands.length });
  assert.ok(
    journal.length <= TOKEN_BUDGET * CHARS_PER_TOKEN,
    `журнал превышает бюджет: ${journal.length} > ${TOKEN_BUDGET * CHARS_PER_TOKEN}`,
  );
});

// ─── рендер ────────────────────────────────────────────────────────────────────

test('renderJournal: одинаковый вход → побайтово одинаковый выход, provenance в каждой записи', () => {
  const entries = selectEntries(
    [candidate(), candidate({ kind: 'голос', topic: 'insight-x', provenance: 'docs/insights/insight-x/REVIEW.md#vote' })],
    { budgetChars: 10_000 },
  );
  const args = { slug: 'dynin', roleLabel: 'Математик', entries, totalCandidates: 2 };
  const a = renderJournal(args);
  const b = renderJournal(args);
  assert.equal(a, b);
  assert.ok(a.includes('docs/insights/insight-x/REVIEW.md#vote'));
  assert.ok(a.includes('· голос ·'));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}/.test(a), 'в журнале не должно быть timestamp');
});

test('byCodePoint: детерминированный порядок без локали', () => {
  assert.deepEqual(['б', 'а', 'e', 'E'].sort(byCodePoint), ['E', 'e', 'а', 'б']);
});
