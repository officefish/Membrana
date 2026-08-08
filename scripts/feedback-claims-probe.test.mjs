/**
 * Зубы обвязки feedback-claims-probe (блок b2, карточка feedback-claims-code-probe #1795).
 *
 * Проверяется то, что можно проверить БЕЗ дерева: разбор аргументов, форма секции, выбор
 * коммита-доставки, поведение при недоступном git. Сборщики фактов, зависящие от git,
 * держатся живым прогоном на пяти протоколах (предикат приёмки блока) — здесь их дубль был
 * бы тестом на историю репозитория, а она переписывается.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ackClaimsProbe,
  claimsSection,
  collectEvidence,
  parseArgs,
  pickDeliverySha,
  PROTOCOL_PREFIX,
  SOURCE_PATHSPECS,
  withClaimsProbeState,
  withClaimsSection,
  withoutClaimsSections,
} from './feedback-claims-probe.mjs';
import { ATOM_CLASSES } from './lib/feedback-claims/atoms.mjs';

test('аргументы: протокол, режимы, строгость', () => {
  const a = parseArgs(['--protocol', 'docs/seanses/x.md', '--json', '--append', '--strict']);
  assert.equal(a.protocol, 'docs/seanses/x.md');
  assert.equal(a.json, true);
  assert.equal(a.append, true);
  assert.equal(a.strict, true);
  const b = parseArgs([]);
  assert.equal(b.protocol, null);
  assert.equal(b.strict, false);
  assert.equal(b.includeHolds, false);
});

test('доставка — только номер В КОНЦЕ заголовка: упоминание иссью доставкой не является', () => {
  const log = [
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa feat(archivarius): ingest читает Codex rollout (#1330) (#1357)',
  ].join('\n');
  assert.equal(pickDeliverySha(log, 1330), false);
  assert.equal(pickDeliverySha(log, 1357), 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
});

test('доставка находится среди нескольких строк лога', () => {
  const log = [
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb chore: упоминание (#1766) в теле',
    'cccccccccccccccccccccccccccccccccccccccc feat(ritual): ADR-0024 — свой момент (#1766)',
  ].join('\n');
  assert.equal(pickDeliverySha(log, 1766), 'cccccccccccccccccccccccccccccccccccccccc');
});

test('пустой лог — «доставки нет», а не исключение', () => {
  assert.equal(pickDeliverySha('', 1), false);
  assert.equal(pickDeliverySha(undefined, 1), false);
});

test('без git все факты честно null — «не проверено», а не «нет»', () => {
  const atom = {
    token: 'anySymbol',
    classes: [ATOM_CLASSES.SYMBOL, ATOM_CLASSES.PATH, ATOM_CLASSES.DOC],
  };
  const e = collectEvidence(atom, { cwd: process.cwd(), hasGit: false, registry: [], scripts: {} });
  assert.equal(e.symbolDecls, null);
  assert.equal(e.pathExists, null);
  assert.equal(e.docExists, null);
});

test('глагол извлекается вторым словом: аргументы командной строки не часть имени', () => {
  const scripts = { 'code-review:pr': 'node scripts/code-review.mjs' };
  const ctx = { cwd: process.cwd(), hasGit: false, registry: [], scripts };
  const yes = collectEvidence(
    { token: 'yarn code-review:pr 1765', classes: [ATOM_CLASSES.VERB] },
    ctx,
  );
  assert.equal(yes.verbExists, true);
  const no = collectEvidence(
    { token: 'yarn procedure:close … --status fail', classes: [ATOM_CLASSES.VERB] },
    ctx,
  );
  assert.equal(no.verbExists, false);
});

test('карточка без иссью не получает признака доставки — оффлайн его нет, и догадки тут не место', () => {
  const registry = [
    { id: 'morning-gates-two-moments', status: 'active', githubIssue: null },
    { id: 'archived-one', status: 'archived', githubIssue: 1700 },
  ];
  const ctx = { cwd: process.cwd(), hasGit: false, registry, scripts: {} };
  const e = collectEvidence(
    { token: 'morning-gates-two-moments', classes: [ATOM_CLASSES.CARD] },
    ctx,
  );
  assert.equal(e.cardFound, true);
  assert.equal(e.cardStatus, 'active');
  assert.equal(e.cardDeliveredPr, undefined);
});

test('отсутствующая карточка предъявляется фактом, а не догадкой', () => {
  const ctx = { cwd: process.cwd(), hasGit: false, registry: [{ id: 'other' }], scripts: {} };
  const e = collectEvidence({ token: 'js-yaml', classes: [ATOM_CLASSES.CARD] }, ctx);
  assert.equal(e.cardFound, false);
});

test('секция дописывается формой ручной поправки: не стирает, называет протокол и дерево', () => {
  const s = claimsSection('| Вердикт |\n| --- |', {
    protocolRel: 'docs/seanses/team-evening-feedback-2026-08-07.md',
    sha: '43f4d5af118a9999',
    checkedAt: '2026-08-08 12:30',
  });
  assert.ok(s.startsWith('\n---\n'));
  assert.ok(s.includes('## Проверка утверждений — 2026-08-08 12:30'));
  assert.ok(s.includes('team-evening-feedback-2026-08-07.md'));
  assert.ok(s.includes('43f4d5af118a'));
  assert.ok(s.includes('Текст выше не тронут'));
  assert.ok(s.includes('| Вердикт |'));
});

test('имя протокола вечера объявлено константой — обвязка и врезка вечера смотрят в одно место', () => {
  assert.equal(PROTOCOL_PREFIX, 'team-evening-feedback-');
});

test('семья гейта исключена из охвата символа: прибор не источник фактов о самом себе', () => {
  // Вещдок 08.08: после расширения охвата на scripts/** символ PromoDeclineReason собрал
  // девять вхождений — все в комментариях и зубах этого прибора, где он назван примером
  // ЛОЖНОГО утверждения. Без исключения гейт подтверждал бы утверждения своими словами.
  const excluded = SOURCE_PATHSPECS.filter((p) => p.includes('exclude'));
  assert.ok(excluded.some((p) => p.includes('scripts/lib/feedback-claims')));
  assert.ok(excluded.some((p) => p.includes('scripts/feedback-claims-probe.mjs')));
  assert.ok(excluded.some((p) => p.includes('scripts/feedback-claims-probe.test.mjs')));
});

test('повторный прогон на том же дереве заменяет свою секцию, а не плодит вторую', () => {
  const body = '# Протокол\n\nТело команды.\n';
  const s1 = claimsSection('первый отчёт', { protocolRel: 'p.md', sha: 'aaaaaaaaaaaa1', checkedAt: '2026-08-08 12:00' });
  const once = withClaimsSection(body, s1, 'aaaaaaaaaaaa1');
  const s2 = claimsSection('второй отчёт', { protocolRel: 'p.md', sha: 'aaaaaaaaaaaa1', checkedAt: '2026-08-08 13:00' });
  const twice = withClaimsSection(once, s2, 'aaaaaaaaaaaa1');

  assert.equal(twice.split('## Проверка утверждений').length - 1, 1);
  assert.ok(twice.includes('второй отчёт'));
  assert.equal(twice.includes('первый отчёт'), false);
  // Чужой текст неприкосновенен — протокол остаётся следом того, что сказала команда.
  assert.ok(twice.startsWith('# Протокол\n\nТело команды.\n'));
});

test('прогон на ДРУГОМ дереве дописывает новую секцию: две сверки — два разных факта', () => {
  const body = '# Протокол\n\nТело.\n';
  const first = withClaimsSection(
    body,
    claimsSection('отчёт вчера', { protocolRel: 'p.md', sha: 'aaaaaaaaaaaa1', checkedAt: '2026-08-07 20:00' }),
    'aaaaaaaaaaaa1',
  );
  const second = withClaimsSection(
    first,
    claimsSection('отчёт сегодня', { protocolRel: 'p.md', sha: 'bbbbbbbbbbbb2', checkedAt: '2026-08-08 20:00' }),
    'bbbbbbbbbbbb2',
  );
  assert.equal(second.split('## Проверка утверждений').length - 1, 2);
  assert.ok(second.includes('отчёт вчера'));
  assert.ok(second.includes('отчёт сегодня'));
});

test('состояние: пишется только своё поле, state.day не трогается', () => {
  const before = { day: '2026-08-08', swallow: { gate: 'evening:partner-swallow', ownerAck: true, draftDigest: 'd' } };
  const after = withClaimsProbeState(before, {
    verdict: 'hard',
    protocolRel: 'docs/seanses/x.md',
    sha: 'abcdef1234567',
    at: '2026-08-08T12:30:00.000Z',
  });
  assert.equal(after.day, before.day);
  assert.equal(after.swallow.gate, before.swallow.gate);
  assert.equal(after.swallow.ownerAck, true);
  assert.equal(after.swallow.claimsProbe.verdict, 'hard');
  assert.equal(after.swallow.claimsProbe.sha, 'abcdef123456');
});

test('квитанция сгорает при смене дерева: вчерашнее «ок» не открывает сегодняшний вердикт', () => {
  const withOverride = {
    swallow: { claimsProbe: { verdict: 'hard', sha: 'oldoldoldold', override: { by: 'owner', sha: 'oldoldoldold', note: 'ок' } } },
  };
  const same = withClaimsProbeState(withOverride, { verdict: 'hard', protocolRel: 'p.md', sha: 'oldoldoldoldXX', at: 't' });
  assert.ok(same.swallow.claimsProbe.override, 'то же дерево — квитанция жива');

  const moved = withClaimsProbeState(withOverride, { verdict: 'hard', protocolRel: 'p.md', sha: 'newnewnewnew', at: 't' });
  assert.equal(moved.swallow.claimsProbe.override, undefined);
});

test('квитанция требует причину и привязывается к дереву', () => {
  const acked = ackClaimsProbe(
    { swallow: { claimsProbe: { verdict: 'hard', sha: 'abcdef123456' } } },
    { note: 'ложная тревога: символ живёт в scripts', sha: 'abcdef1234567', at: '2026-08-08T12:40:00.000Z' },
  );
  assert.equal(acked.swallow.claimsProbe.override.sha, 'abcdef123456');
  assert.equal(acked.swallow.claimsProbe.override.by, 'owner');
  assert.match(acked.swallow.claimsProbe.override.note, /scripts/u);
});

test('probe не разбирает СВОЮ секцию: предмет сверки — голос команды, не отчёт гейта', () => {
  const body = ['# Протокол', '', 'Команда сказала `someSymbol`.', ''].join('\n');
  const withSection = withClaimsSection(
    body,
    claimsSection('| таблица |', { protocolRel: 'docs/seanses/p.md', sha: 'aaaaaaaaaaaa1', checkedAt: '2026-08-08 12:00' }),
    'aaaaaaaaaaaa1',
  );
  const stripped = withoutClaimsSections(withSection);
  assert.equal(stripped.includes('Проверка утверждений'), false);
  assert.ok(stripped.includes('someSymbol'));
  assert.equal(withoutClaimsSections(body), body);
});
