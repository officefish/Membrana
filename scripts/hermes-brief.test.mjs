import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBrief,
  stripMetadata,
  selectActiveCards,
  sortPRs,
  pickLatestHandoff,
  extractHeadings,
  stripEmphasis,
  byCodePoint,
} from './hermes-brief.mjs';

/** Полностью «ok» фикстура-состояние; meta инъектируется. */
function fixtureState(meta) {
  return {
    focus: {
      ok: true,
      link: 'docs/MAIN_DAY_ISSUE.md',
      title: 'MAIN_DAY_ISSUE — 2026-07-09',
      focusHeading: 'Фокус дня',
    },
    openPRs: {
      ok: true,
      prs: [
        { number: 1, title: 'PR one', headRefName: 'br-1' },
        { number: 2, title: 'PR two', headRefName: 'br-2' },
      ],
    },
    activeCards: {
      ok: true,
      link: 'docs/tasks/registry.json',
      cards: [
        { id: 'a-card', title: 'A' },
        { id: 'b-card', title: 'B' },
      ],
      total: 2,
    },
    handoff: { ok: true, date: '2026-07-08', link: 'h.md', title: 'Handoff', sections: ['S1', 'S2'] },
    memory: { ok: true, link: 'MEMORY.md', entryCount: 3 },
    git: { commit: 'abc123', commits: '• abc123: msg (a)', changed: { files: ['f1', 'f2'], more: 0 } },
    meta,
  };
}

test('детерминизм: два рендера отличаются ТОЛЬКО блоком «Метаданные»', () => {
  const a = renderBrief(fixtureState({ commit: 'abc123', generatedAt: '2026-01-01T00:00:00.000Z' }));
  const b = renderBrief(fixtureState({ commit: 'abc123', generatedAt: '2030-12-31T23:59:59.999Z' }));
  assert.notEqual(a, b, 'timestamp должен отличаться → строки не равны целиком');
  assert.equal(stripMetadata(a), stripMetadata(b), 'всё до «Метаданные» — побайтово идентично');
});

test('детерминизм: одинаковый вход → побайтово одинаковый выход', () => {
  const meta = { commit: 'abc123', generatedAt: '2026-01-01T00:00:00.000Z' };
  assert.equal(renderBrief(fixtureState(meta)), renderBrief(fixtureState(meta)));
});

test('fallback: отсутствующий источник → блок «н/д», renderBrief не бросает', () => {
  const state = fixtureState({ commit: 'abc123', generatedAt: 't' });
  state.handoff = { ok: false, reason: 'нет HANDOFF' };
  state.openPRs = { ok: false, reason: 'gh недоступен' };
  state.memory = { ok: false, reason: 'нет MEMORY.md' };
  const md = renderBrief(state);
  assert.match(md, /_н\/д_ \(нет HANDOFF\)/);
  assert.match(md, /_н\/д_ \(gh недоступен\)/);
  assert.match(md, /_н\/д_ \(нет MEMORY\.md\)/);
});

test('сортировка карточек: перемешанный вход + фильтр active → стабильно по id', () => {
  const r = selectActiveCards({
    tasks: [
      { id: 'c', status: 'active', title: 'C' },
      { id: 'a', status: 'active', title: 'A' },
      { id: 'z', status: 'archived', title: 'Z' }, // отфильтровать
      { id: 'b', status: 'active', title: 'B' },
    ],
  });
  assert.deepEqual(r.cards.map((c) => c.id), ['a', 'b', 'c']);
  assert.equal(r.total, 3);
});

test('сортировка PR: перемешанный вход → по номеру (возрастание)', () => {
  const r = sortPRs([{ number: 5 }, { number: 1 }, { number: 3 }]);
  assert.deepEqual(r.map((p) => p.number), [1, 3, 5]);
});

test('pickLatestHandoff: выбирает самый свежий по ISO-дате', () => {
  const r = pickLatestHandoff([
    { date: '2026-07-01', path: 'a' },
    { date: '2026-07-08', path: 'b' },
    { date: '2026-06-30', path: 'c' },
  ]);
  assert.equal(r.date, '2026-07-08');
});

test('pickLatestHandoff: пустой список → null (graceful)', () => {
  assert.equal(pickLatestHandoff([]), null);
});

test('stripEmphasis: снимает ** * ` и схлопывает пробелы', () => {
  assert.equal(stripEmphasis('**🔴 **ФОКУС****'), '🔴 ФОКУС');
  assert.equal(stripEmphasis('`code`'), 'code');
});

test('extractHeadings: уровни + снятая эмфаза, текст игнорируется', () => {
  const h = extractHeadings('# **Title**\n## Sec\nтекст\n### Sub');
  assert.deepEqual(h, [
    { level: 1, text: 'Title' },
    { level: 2, text: 'Sec' },
    { level: 3, text: 'Sub' },
  ]);
});

test('extractHeadings: `#` внутри code-fence НЕ считается заголовком', () => {
  const h = extractHeadings('# Real\n```bash\n# comment inside fence\ngit log\n```\n## After');
  assert.deepEqual(h, [
    { level: 1, text: 'Real' },
    { level: 2, text: 'After' },
  ]);
});

test('byCodePoint: детерминированный порядок (не локале-зависимый), дефис значим', () => {
  assert.deepEqual(['db-h1c', 'db-h1b', 'dbh1'].sort(byCodePoint), ['db-h1b', 'db-h1c', 'dbh1']);
  assert.equal(byCodePoint('a', 'a'), 0);
});
