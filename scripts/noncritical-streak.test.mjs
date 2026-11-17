// Зуб #2580 (спринт office-mongo-credentials-2580, блок b3): многодневный некритичный красный
// не тонет. Вещдок: archivarius-evening (noncritical) падал 8 вечеров подряд 27.09–04.10 — и
// ни разу не попал в журнал как отказ.
//
// P5 — серия по синтетической ленте журнала (без fs: записи — значения).
// P6 — эскалация по порогу (решение владельца 04.10: умолчание 2, поле шага).
// P7 — манифест: поле escalateAfterConsecutive валидируется; archivarius-evening несёт порог.
// P4 (трение noncritical-fail в close) — в scripts/ritual-evening-close-args.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_ESCALATE_AFTER,
  applyNoncriticalEscalation,
  escalationThreshold,
  eveningCloses,
  eveningVerdictForStep,
  noncriticalFailSymptom,
  priorRedStreak,
  readEveningTrail,
} from './lib/noncritical-streak.mjs';
import { validateManifest } from './lib/step-status.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STEP = 'archivarius-evening';
const step = { id: STEP, criticality: 'noncritical', whyNoncritical: 'тест', escalateAfterConsecutive: 2 };

/** Close-запись вечера в форме журнала (procedure-run-journal@1, только несущие поля). */
function close(date, { red = false, finding = false, gap = false, at = `${date}T18:00:00.000Z`, runSuffix = '' } = {}) {
  const friction = [];
  if (red) friction.push({ symptom: noncriticalFailSymptom({ id: STEP, exitCode: 1 }) });
  if (finding) friction.push({ symptom: `${STEP}: finding exit 3` });
  return {
    runId: `ritual-evening-${date}${runSuffix}`,
    procedureId: 'ritual-evening',
    runPhase: 'close',
    at,
    status: gap ? 'fail' : 'pass',
    coverage: { evidence: ['docs/HANDOFF.md'], gaps: gap ? [STEP] : [] },
    friction,
  };
}

const streakOf = (records, excludeDate) => priorRedStreak(eveningCloses(records, { excludeDate }), STEP);

// ── P5: серия по ленте ──────────────────────────────────────────────────────────

test('P5: трение некритичного отказа — ровно «noncritical-fail <id> exit N»', () => {
  assert.equal(noncriticalFailSymptom({ id: STEP, exitCode: 1 }), 'noncritical-fail archivarius-evening exit 1');
  assert.equal(noncriticalFailSymptom({ id: STEP }), 'noncritical-fail archivarius-evening exit ?');
  assert.throws(() => noncriticalFailSymptom({ id: 'bad id' }), /недопустимый id шага/u);
});

test('P5: вердикт вечера — red по трению или gap, neutral по находке, green иначе', () => {
  assert.equal(eveningVerdictForStep(close('2026-10-01', { red: true }), STEP), 'red');
  assert.equal(eveningVerdictForStep(close('2026-10-01', { gap: true }), STEP), 'red');
  assert.equal(eveningVerdictForStep(close('2026-10-01', { finding: true }), STEP), 'neutral');
  assert.equal(eveningVerdictForStep(close('2026-10-01'), STEP), 'green');
  // Чужой шаг с похожим префиксом id не засчитывается.
  const other = close('2026-10-01');
  other.friction.push({ symptom: 'noncritical-fail archivarius-evening-extra exit 1' });
  assert.equal(eveningVerdictForStep(other, STEP), 'green');
});

test('P5: вещдок 27.09–04.10 — семь красных вечеров подряд → серия 7', () => {
  const days = ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
  assert.equal(streakOf(days.map((d) => close(d, { red: true })), '2026-10-04'), 7);
});

test('P5: зелёный вечер рвёт серию; счёт идёт с последнего зелёного', () => {
  const records = [close('2026-09-30', { red: true }), close('2026-10-01'), close('2026-10-02', { red: true })];
  assert.equal(streakOf(records, '2026-10-04'), 1);
  assert.equal(streakOf([...records, close('2026-10-03')], '2026-10-04'), 0);
});

test('P5: день без вечера серию не рвёт; находка exit 3 не продлевает и не рвёт', () => {
  // 30.09 красный, 01.10 вечера не было, 02.10 находка, 03.10 красный → 2.
  const records = [close('2026-09-30', { red: true }), close('2026-10-02', { finding: true }), close('2026-10-03', { red: true })];
  assert.equal(streakOf(records, '2026-10-04'), 2);
  // Только находки — серия 0.
  assert.equal(streakOf([close('2026-10-02', { finding: true }), close('2026-10-03', { finding: true })], '2026-10-04'), 0);
});

test('P5: сегодняшний вечер исключён; повтор дня (-r2) — судит последний close по at', () => {
  const records = [
    close('2026-10-03', { red: true }),
    close('2026-10-04', { red: true }),
    close('2026-10-04', { at: '2026-10-04T19:00:00.000Z', runSuffix: '-r2' }),
  ];
  assert.equal(streakOf(records, '2026-10-04'), 1, 'сегодняшние close не судятся');
  assert.equal(streakOf(records, '2026-10-05'), 0, 'последний close 04.10 (-r2) зелёный — он и судит');
});

test('P5: чужие процедуры, open-записи и кривой runId ленту не портят', () => {
  const records = [
    close('2026-10-03', { red: true }),
    { ...close('2026-10-02', { red: true }), procedureId: 'ritual-day' },
    { ...close('2026-10-02', { red: true }), runPhase: 'open' },
    { ...close('2026-10-02', { red: true }), runId: 'ritual-evening-вчера' },
    null,
  ];
  assert.equal(streakOf(records, '2026-10-04'), 1);
});

test('P5: чтение ленты с диска — только записи вечера, нечитаемая строка считается и пропускается', () => {
  const root = mkdtempSync(join(tmpdir(), 'nc-streak-2580-'));
  try {
    const dir = join(root, 'docs', 'procedure-runs', 'trail');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '2026-10-02.jsonl'), `${JSON.stringify(close('2026-10-02', { red: true }))}\n{"procedureId":"ritual-evening", битая\n`);
    writeFileSync(join(dir, '2026-10-03.jsonl'), `${JSON.stringify(close('2026-10-03', { red: true }))}\n`);
    writeFileSync(join(dir, 'README.md'), 'не лента');
    const { records, skippedLines } = readEveningTrail(root);
    assert.equal(records.length, 2);
    assert.equal(skippedLines, 1);
    assert.equal(streakOf(records, '2026-10-04'), 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── P6: эскалация ───────────────────────────────────────────────────────────────

test('P6: порог 2 — второй красный вечер подряд эскалирует до failed-critical, первый нет', () => {
  assert.deepEqual(applyNoncriticalEscalation(step, 'skipped-noncritical', 0), {
    status: 'skipped-noncritical',
    streak: 1,
    threshold: 2,
    escalated: false,
  });
  assert.deepEqual(applyNoncriticalEscalation(step, 'skipped-noncritical', 1), {
    status: 'failed-critical',
    streak: 2,
    threshold: 2,
    escalated: true,
  });
});

test('P6: зелёный или находка (status ok) — серия 0, без эскалации при любой прошлой серии', () => {
  assert.deepEqual(applyNoncriticalEscalation(step, 'ok', 5), { status: 'ok', streak: 0, threshold: 2, escalated: false });
});

test('P6: порог по шагу (3) и умолчание 2 без поля', () => {
  const s3 = { ...step, escalateAfterConsecutive: 3 };
  assert.equal(applyNoncriticalEscalation(s3, 'skipped-noncritical', 1).escalated, false);
  assert.equal(applyNoncriticalEscalation(s3, 'skipped-noncritical', 2).escalated, true);
  const noField = { id: 'rag-index', criticality: 'noncritical', whyNoncritical: 'тест' };
  assert.equal(DEFAULT_ESCALATE_AFTER, 2);
  assert.equal(escalationThreshold(noField), 2);
  assert.equal(applyNoncriticalEscalation(noField, 'skipped-noncritical', 1).status, 'failed-critical');
});

test('P6: критичный шаг не трогается; кривая прошлая серия читается как 0', () => {
  const crit = { id: 'code-review' };
  assert.deepEqual(applyNoncriticalEscalation(crit, 'failed-critical', 9), { status: 'failed-critical', streak: 0, threshold: 2, escalated: false });
  assert.equal(applyNoncriticalEscalation(step, 'skipped-noncritical', -3).streak, 1);
  assert.equal(applyNoncriticalEscalation(step, 'skipped-noncritical', Number.NaN).streak, 1);
});

test('P6: раннер вечера применяет эскалацию и пишет некритичные отказы в close', () => {
  const src = readFileSync(join(repoRoot, 'scripts', 'ritual-evening-run.mjs'), 'utf8');
  assert.match(src, /applyNoncriticalEscalation\(/u, 'раннер не эскалирует');
  assert.match(src, /priorRedStreak\(priorCloses, step\.id\)/u, 'раннер не читает серию из ленты');
  assert.match(src, /eveningCloseArgs\(\{ failed, findings, noncriticalFailed,/u, 'некритичные отказы не уходят в close');
});

// ── P7: манифест ────────────────────────────────────────────────────────────────

test('P7: escalateAfterConsecutive — целое ≥ 1 и только у некритичного шага', () => {
  const base = { id: 'a', criticality: 'noncritical', whyNoncritical: 'тест' };
  assert.deepEqual(validateManifest([{ ...base, escalateAfterConsecutive: 2 }]), []);
  assert.match(validateManifest([{ ...base, escalateAfterConsecutive: 0 }])[0], /нужно целое ≥ 1/u);
  assert.match(validateManifest([{ ...base, escalateAfterConsecutive: 1.5 }])[0], /нужно целое ≥ 1/u);
  assert.match(validateManifest([{ ...base, escalateAfterConsecutive: '2' }])[0], /нужно целое ≥ 1/u);
  assert.match(validateManifest([{ id: 'b', escalateAfterConsecutive: 2 }])[0], /у критичного шага/u);
});

test('P7: живой манифест вечера валиден, archivarius-evening несёт порог 2', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'docs', 'tasks', 'evening-ritual-steps.json'), 'utf8'));
  assert.deepEqual(validateManifest(manifest.steps), []);
  const arch = manifest.steps.find((s) => s.id === STEP);
  assert.equal(arch?.criticality, 'noncritical');
  assert.equal(arch?.escalateAfterConsecutive, 2);
  assert.deepEqual(arch?.findingExitCodes, [3]);
});
