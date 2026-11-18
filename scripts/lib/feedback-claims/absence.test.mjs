/**
 * Тесты утверждений об отсутствии (#2615). Фразы — дословно из протоколов
 * `docs/seanses/team-evening-feedback-2026-10-0{5,6,7}.md` и `-2026-08-29.md`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ABSENCE_KIND, absenceVerdict, clauses, entitiesOf, extractAbsenceClaims } from './absence.mjs';
import { OUTCOMES } from './verdict.mjs';
import {
  absenceEvidence,
  absenceVerdicts,
  protocolDayOf,
  withoutClaimsSections,
} from '../../feedback-claims-probe.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const kinds = (md) => extractAbsenceClaims(md).map((c) => `${c.kind}:${c.token}`);

// ── формы утверждения отсутствия (реальные фразы) ────────────────────────────────────────

test('«архитектурный документ (ADR-0031) … не положен» (05.10:19) — утверждение', () => {
  const md =
    'Итоги дня: формат заморозки реализован кодом (b1+b2 обоих issue), но архитектурный документ (ADR-0031), который должен закрепить вердикты консилиума 1–6 как канон, не положен.';
  assert.deepEqual(kinds(md), ['claim:ADR-0031']);
});

test('«- ADR-0031 файлом в стволе — нет; инверсия…» (05.10:78) — утверждение', () => {
  assert.deepEqual(kinds('- ADR-0031 файлом в стволе — нет; инверсия «код впереди ADR».'), ['claim:ADR-0031']);
});

test('«DoD закрыт частично (нет ADR-0031, манифеста…)» (05.10:92) — отрицание перед сущностью', () => {
  assert.deepEqual(
    kinds('LGTM по магистрали — не ставлю, DoD закрыт частично (нет ADR-0031, манифеста, перечеканки assertions).'),
    ['claim:ADR-0031'],
  );
});

test('«ADR-0031 файлом в ствол — долг третьего дня, не закрыт» (06.10:78) — долг дня = отсутствие', () => {
  assert.deepEqual(kinds('- ADR-0031 файлом в ствол — долг третьего дня, не закрыт.'), ['claim:ADR-0031']);
});

test('«ADR-0031 в ствол не положен» — форма из иссью', () => {
  assert.deepEqual(kinds('Опять: ADR-0031 в ствол не положен.'), ['claim:ADR-0031']);
});

test('«#2593 не влит» — PR', () => {
  assert.deepEqual(kinds('Блокер: #2593 не влит, ждём ревью.'), ['claim:#2593']);
});

// ── план-предпосылка ───────────────────────────────────────────────────────────────────────

test('«положить docs/adr/ADR-0031-downgrade-archive.md файлом» (06.10:20) — план, путь', () => {
  const md =
    'На завтра: (1) положить docs/adr/ADR-0031-downgrade-archive.md файлом с полным протоколом консилиума 05.10 (вердикты 1–6 дословно); (2) верифицировать письменно C1/C9.';
  assert.deepEqual(kinds(md), ['plan:docs/adr/ADR-0031-downgrade-archive.md']);
});

test('«ADR-0031 в ствол либо явный долг с датой» (05.10:14) — план, а не долг дня', () => {
  assert.deepEqual(kinds('На завтра: (1) ADR-0031 в ствол либо явный долг с датой; (2) перечеканить.'), [
    'plan:ADR-0031',
  ]);
});

// ── граница: НЕ утверждения о стволе ──────────────────────────────────────────────────────

test('граница: «файла ADR в затронутых путях нет» (05.10:18) — про дифф дня, не судится', () => {
  const md =
    'Оценка артефактов: `MAIN_DAY_ISSUE` ссылается на ADR-0031 как на шаг дня, но файла ADR в затронутых путях нет и в git log за день он не упомянут.';
  assert.deepEqual(kinds(md), []);
});

test('граница: закрытый долг — «ADR-0031 файлом в стволе … долга закрыт» (07.10:74)', () => {
  assert.deepEqual(kinds('- ADR-0031 файлом в стволе с LGTM Vesnin — третий день долга закрыт.'), []);
});

test('граница: состояние работы без адреса — «ветка ещё не в main», «не сделано сегодня»', () => {
  assert.deepEqual(kinds('MFCC-спринт (день 3/3) завершён по коду, но ветка ещё не в main.'), []);
  assert.deepEqual(kinds('Триаж CVE не сделано сегодня, перенос на завтра.'), []);
});

test('граница: совет — «Держать #2204 в санитарии, не в стволе» (29.08)', () => {
  assert.deepEqual(kinds('Держать #2204 в санитарии, не в стволе.'), []);
});

test('граница: модальность — «возможно, #2593 не влит»', () => {
  assert.deepEqual(kinds('Возможно, #2593 не влит.'), []);
});

test('граница: таблица и цитата не читаются (claimLines)', () => {
  assert.deepEqual(kinds('| ADR-0031 | не положен |\n> ADR-0031 не в стволе'), []);
});

test('clauses/entitiesOf: путь к ADR — одна сущность-путь, номер внутри не дублируется', () => {
  assert.deepEqual(clauses('А. Б; В'), ['А', 'Б', 'В']);
  const e = entitiesOf('положить docs/adr/ADR-0031-downgrade-archive.md и #2593');
  assert.deepEqual(e.map((x) => `${x.type}:${x.token}`), ['path:docs/adr/ADR-0031-downgrade-archive.md', 'pr:#2593']);
});

// ── вердикт ─────────────────────────────────────────────────────────────────────────────

const CLAIM = { token: 'ADR-0031', type: 'adr', kind: ABSENCE_KIND.CLAIM };
const FOUND = {
  present: true,
  where: 'docs/adr/ADR-0031-downgrade-archive.md',
  sha: '66153f58abcdef',
  addedOn: '2026-10-05',
  ref: 'origin/main',
};

test('порча #2615: «ADR-0031 не в стволе» при файле в стволе → НЕ ПОДТВЕРЖДЕНО с доказательством', () => {
  const v = absenceVerdict(CLAIM, FOUND, { protocolDay: '2026-10-06' });
  assert.equal(v.outcome, OUTCOMES.HARD);
  assert.match(v.reason, /ОПРОВЕРГНУТО: docs\/adr\/ADR-0031-downgrade-archive\.md есть в стволе с 66153f58, 2026-10-05/u);
});

test('файл появился в стволе в день протокола — тоже опровержение (05.10 вечером он уже был)', () => {
  assert.equal(absenceVerdict(CLAIM, FOUND, { protocolDay: '2026-10-05' }).outcome, OUTCOMES.HARD);
});

test('файл появился ПОЗЖЕ протокола — на свой день утверждение было правдой', () => {
  const v = absenceVerdict(CLAIM, FOUND, { protocolDay: '2026-10-04' });
  assert.equal(v.outcome, OUTCOMES.HOLDS);
  assert.match(v.reason, /появилось позже/u);
});

test('план сделать сделанное — сомнение (жёлтое), не красное', () => {
  assert.equal(absenceVerdict({ ...CLAIM, kind: ABSENCE_KIND.PLAN }, FOUND, {}).outcome, OUTCOMES.SOFT);
});

test('в стволе нет — утверждение подтверждено; ствол не опрошен — не проверено', () => {
  assert.equal(absenceVerdict(CLAIM, { present: false }, {}).outcome, OUTCOMES.HOLDS);
  assert.equal(absenceVerdict(CLAIM, { present: null }, {}).outcome, OUTCOMES.UNKNOWN);
});

// ── живой прогон: реальный протокол 06.10 против реального ствола ────────────────────────

test('живой: протокол 06.10 — «ADR-0031 файлом не положен» опровергнут стволом', () => {
  const rel = 'docs/seanses/team-evening-feedback-2026-10-06.md';
  const md = withoutClaimsSections(readFileSync(resolve(ROOT, rel), 'utf8'));
  const v = absenceVerdicts(md, { cwd: ROOT, hasGit: true, ref: 'HEAD' }, protocolDayOf(rel));
  const claim = v.find((x) => x.token === 'ADR-0031' && x.kind === ABSENCE_KIND.CLAIM);
  assert.ok(claim, 'утверждение об отсутствии ADR-0031 не распознано');
  // День доставки по shallow-клону недостоверен (корень графа «добавил» всё) — там вердикт
  // уходит в безопасную сторону («появилось позже» = пропуск). На полной истории — красный.
  const shallow =
    execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, encoding: 'utf8' }).trim() === 'true';
  if (shallow) assert.notEqual(claim.outcome, OUTCOMES.UNKNOWN);
  else assert.equal(claim.outcome, OUTCOMES.HARD, claim.reason);
  const ev = absenceEvidence({ type: 'adr', token: 'ADR-0031' }, { cwd: ROOT, hasGit: true, ref: 'HEAD' });
  assert.equal(ev.present, true);
  assert.equal(ev.where, 'docs/adr/ADR-0031-downgrade-archive.md');
  assert.ok(claim.occurrences >= 2, 'повторы одного утверждения свёрнуты в строку');
});
