/**
 * Порча-тесты предиката #2107: протокол фидбека засчитан только с полным readAt.
 *
 * Предикат чистый (без ФС/часов/сети) — проверяем порчей каждого рода:
 * убрать вход → красный; подменить отпечаток → красный; вчерашняя версия → красный;
 * файл отсутствовал при генерации → красный; всё на месте → зелёный.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  EVENING_REQUIRED_KEYS,
  buildEveningFeedbackUserMessage,
  eveningFeedbackInputs,
  eveningInputFreshness,
  renderFreshnessNotice,
  writeEveningFeedbackMarkdown,
  parseEveningFeedbackGuard,
  validateEveningFeedbackReadAt,
} from './lib/team-evening-feedback-ritual.mjs';
import { readEntry } from './lib/angelina-adapter.mjs';

const rec = (v, d) => ({ version: v, digest: d });

function greenPair() {
  const readAt = {};
  const current = {};
  for (const key of EVENING_REQUIRED_KEYS) {
    readAt[key] = rec(`sha-${key}`, `digest-${key}`);
    current[key] = rec(`sha-${key}`, `digest-${key}`);
  }
  return { readAt, current };
}

test('всё на месте → зелёный', () => {
  const { readAt, current } = greenPair();
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, true);
  assert.deepEqual(r.failures, []);
});

test('порча: убрать один вход из readAt → красный', () => {
  const { readAt, current } = greenPair();
  delete readAt.DAY_MEMO;
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.startsWith('DAY_MEMO:')));
});

test('порча: подменить отпечаток → красный', () => {
  const { readAt, current } = greenPair();
  readAt.DAILY_AUDIT = rec(readAt.DAILY_AUDIT.version, 'digest-forged');
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_AUDIT') && f.includes('отпечаток')));
});

test('порча: вчерашний вход с ДРУГИМ содержимым → красный, версия названа причиной', () => {
  const { readAt, current } = greenPair();
  readAt.DAILY_CODE_REVIEW = rec('sha-yesterday', 'digest-yesterday');
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_CODE_REVIEW') && f.includes('отпечаток') && f.includes('версия')));
});

test('доставка в ствол: тот же отпечаток, другая версия → ЗЕЛЁНЫЙ (живой прогон 25.08)', () => {
  const { readAt, current } = greenPair();
  // deliver-to-main закоммитил прочитанный файл: содержимое то же, git-версия новая
  current.DAILY_CODE_REVIEW = rec('sha-after-delivery', readAt.DAILY_CODE_REVIEW.digest);
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, true, JSON.stringify(r.failures));
});

test('файл отсутствовал при генерации (digest=null) → красный', () => {
  const { readAt, current } = greenPair();
  readAt.DAY_MEMO = rec(null, null);
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAY_MEMO') && f.includes('пуст')));
});

test('readAt отсутствует целиком → красный, не исключение', () => {
  const r = validateEveningFeedbackReadAt({ readAt: undefined, current: {} });
  assert.equal(r.ok, false);
  assert.equal(r.failures.length, 1);
});

test('вход исчез после генерации → красный', () => {
  const { readAt, current } = greenPair();
  delete current.DAILY_AUDIT;
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_AUDIT') && f.includes('исчез')));
});

test('eveningFeedbackInputs несёт мемо дня с датой в пути', () => {
  const inputs = eveningFeedbackInputs('2026-08-24');
  const memo = inputs.find((d) => d.key === 'DAY_MEMO');
  assert.ok(memo);
  assert.equal(memo.rel, 'docs/memos/2026-08-24.md');
  assert.equal(memo.evening, true);
  // все обязательные ключи предиката существуют во входах
  for (const key of EVENING_REQUIRED_KEYS) {
    assert.ok(inputs.some((d) => d.key === key), `входа ${key} нет в списке`);
  }
});

test('parseEveningFeedbackGuard: круговой проход через шапку', () => {
  const guard = { day: '2026-08-24', magistral: { id: 'x', author: 'human' }, readAt: { DAY_MEMO: rec('a', 'b') } };
  const content = `<!-- Сгенерировано: ... -->\n<!-- evening-feedback ${JSON.stringify(guard)} -->\n\n# Протокол`;
  const parsed = parseEveningFeedbackGuard(content);
  assert.deepEqual(parsed, guard);
});

test('parseEveningFeedbackGuard: боевая форма — вложенность 3 уровня + комментарий в теле', () => {
  // Ровно тот случай, который ревью PR #2136 назвало мёртвым (P0, «regex до первой }»):
  // вложенный guard, null-поля отсутствовавшего файла, обычный HTML-комментарий дальше в теле.
  const guard = {
    day: '2026-08-24',
    magistral: { id: 'logging-observability-contour', author: 'human', source: 'gate-state', fresh: true },
    readAt: {
      DAILY_AUDIT: rec('abc123', 'd'.repeat(64)),
      DAY_MEMO: rec(null, null),
      DAILY_CODE_REVIEW: rec('def456', 'e'.repeat(64)),
    },
  };
  const content =
    `<!-- Сгенерировано: X -->\n<!-- evening-feedback ${JSON.stringify(guard)} -->\n\n` +
    '# Протокол\nтело <!-- обычный комментарий -->';
  assert.deepEqual(parseEveningFeedbackGuard(content), guard);
});

test('parseEveningFeedbackGuard: битый JSON → null, не исключение', () => {
  assert.equal(parseEveningFeedbackGuard('<!-- evening-feedback {oops} -->'), null);
  assert.equal(parseEveningFeedbackGuard('нет шапки вовсе'), null);
});

// ── #2438: вердикт по вчерашним данным ────────────────────────────────────────────
//
// КРАСНЫЙ ВХОД — протокол docs/seanses/team-evening-feedback-2026-09-24.md: 5.8/10,
// «DoD магистрали не закрыт», четыре несущих утверждения ложны по факту. Гарантия
// readAt при этом ЗЕЛЁНАЯ: команда честно прочитала то, что лежало. Лежал утренний
// срез — `readAt.MAIN_DAY_ISSUE.version = 8d251ad1`, — и всё, что произошло после
// полудня, для протокола не существовало.

const EVENING = '2026-09-24T17:16:00.000Z'; // момент генерации протокола 24.09
const MORNING = '2026-09-24T06:20:00.000Z'; // утренний срез MAIN_DAY_ISSUE

test('#2438 зелёная гарантия readAt НИЧЕГО не говорит о свежести входов', () => {
  const { readAt, current } = greenPair();
  for (const k of Object.keys(readAt)) readAt[k].versionAt = MORNING;
  assert.equal(validateEveningFeedbackReadAt({ readAt, current }).ok, true, 'гарантия и должна быть зелёной');
  const f = eveningInputFreshness({ readAt, now: EVENING });
  assert.equal(f.oldest.at, MORNING, 'предикат обязан назвать утро утром при зелёной гарантии');
  assert.ok(f.oldest.ageHours > 10, `вход старше половины суток, а возраст показан ${f.oldest.ageHours}`);
});

test('#2438 оговорка печатает ЧАС отсечки словами, а не только отпечаток', () => {
  const readAt = { MAIN_DAY_ISSUE: rec('8d251ad1', 'd'), DAY_MEMO: rec('b', 'd') };
  readAt.MAIN_DAY_ISSUE.versionAt = MORNING;
  readAt.DAY_MEMO.versionAt = EVENING;
  const notice = renderFreshnessNotice(eveningInputFreshness({ readAt, now: EVENING }));
  assert.match(notice, /MAIN_DAY_ISSUE/u, 'самый старый вход обязан быть назван по имени');
  assert.match(notice, /события после 06:20 в нём не учтены/u);
  assert.match(notice, /утверждать «не сделано» по такому входу нельзя/u);
});

test('#2438 самым старым назван САМЫЙ старый, а не первый по алфавиту', () => {
  const readAt = {
    AAA: { ...rec('a', 'd'), versionAt: EVENING },
    ZZZ: { ...rec('z', 'd'), versionAt: MORNING },
  };
  assert.equal(eveningInputFreshness({ readAt, now: EVENING }).oldest.key, 'ZZZ');
});

test('#2438 ПОРЧА: вход без отметки версии возраста НЕ выдумывает', () => {
  const readAt = { MAIN_DAY_ISSUE: rec('8d251ad1', 'd') }; // versionAt отсутствует
  const f = eveningInputFreshness({ readAt, now: EVENING });
  assert.equal(f.oldest, null, 'придуманный возраст — та же ложь, только с другой стороны');
  assert.deepEqual(f.unknown, ['MAIN_DAY_ISSUE']);
  const notice = renderFreshnessNotice(f);
  assert.match(notice, /Возраст входов неизвестен/u);
  assert.match(notice, /MAIN_DAY_ISSUE/u, 'молчать о неизвестном возрасте нельзя');
});

test('#2438 свежие входы: оговорка есть всегда, но час отсечки — вечерний', () => {
  const readAt = { MAIN_DAY_ISSUE: { ...rec('a', 'd'), versionAt: '2026-09-24T17:10:00.000Z' } };
  const notice = renderFreshnessNotice(eveningInputFreshness({ readAt, now: EVENING }));
  assert.match(notice, /события после 17:10 в нём не учтены/u);
  assert.match(notice, /0\.1 ч назад/u);
});

test('#2438 оговорка доезжает до ФАЙЛА протокола и стоит ДО тела вердикта', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evening-freshness-'));
  const path = join(dir, 'protocol.md');
  const notice = '> **Свежесть входов.**\n> Вход датирован 06:20 UTC; события после 06:20 в нём не учтены.';
  writeEveningFeedbackMarkdown({ path, body: '# Протокол\n\nоценка дня 5.8/10', freshnessNotice: notice });
  const md = readFileSync(path, 'utf8');
  assert.ok(md.includes('события после 06:20 в нём не учтены'), 'оговорка не доехала до файла');
  assert.ok(
    md.indexOf('Свежесть входов') < md.indexOf('оценка дня 5.8/10'),
    'оговорка после вердикта — примечание, а не предупреждение',
  );
});

test('#2438 протокол БЕЗ оговорки пишется как прежде (обратная совместимость)', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'evening-freshness-')), 'protocol.md');
  writeEveningFeedbackMarkdown({ path, body: '# Протокол' });
  assert.match(readFileSync(path, 'utf8'), /# Протокол/u);
});

test('#2438 оговорка доезжает до ПРОМПТА команды, и до документов дня', () => {
  const msg = buildEveningFeedbackUserMessage({
    regulation: 'Р',
    prompt: 'П',
    virtualTeam: 'В',
    dayDocs: 'MAIN_DAY_ISSUE: план на день',
    gitSummary: 'G',
    freshnessNotice: '> Вход датирован 06:20 UTC; события после 06:20 в нём не учтены.',
    date: new Date('2026-09-24T17:16:00.000Z'),
  });
  assert.ok(msg.includes('события после 06:20 в нём не учтены'), 'команда судит, не зная о возрасте входа');
  assert.ok(
    msg.indexOf('Свежесть входов') < msg.indexOf('Документы дня'),
    'оговорка после документов — примечание, а не предупреждение',
  );
});

test('#2438 readEntry несёт versionAt, когда io умеет его дать; иначе поля нет', () => {
  const io = {
    version: () => 'sha',
    content: () => 'тело',
    versionAt: () => '2026-09-24T06:20:00.000Z',
  };
  assert.equal(readEntry(io, 'docs/MAIN_DAY_ISSUE.md').versionAt, '2026-09-24T06:20:00.000Z');
  const legacy = readEntry({ version: () => 'sha', content: () => 'тело' }, 'x.md');
  assert.equal('versionAt' in legacy, false, 'io без порта не обязан выдумывать возраст');
  assert.equal(legacy.version, 'sha', 'старый контракт не сломан');
});
