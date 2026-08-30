/**
 * Зубы ночной цепочки: РИТМ, ВЕРДИКТ и ГЕЙТ.
 *
 * Порча из DoD владельца («убрать ключ канала → preflight краснеет ДО запуска работы») проверена и
 * живьём: объявление канала было направлено в никуда, и прогон дал «ночь НЕ НАЧАЛАСЬ: … ни один шаг
 * не запускался», код 1. Зубы ниже держат ту же границу без запуска процессов.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NIGHT_CADENCES, cadenceOfCron, nightVerdict, nightWords, planNight, stepDueOn } from './lib/ritual-night.mjs';

const DAILY = { id: 'network-probes', cadence: 'daily' };
const WEEKDAYS = { id: 'night-hunt', cadence: 'weekdays' };
const WEEKLY = { id: 'weekly-plan', cadence: 'weekly-monday' };
const SUNDAY = 0;
const MONDAY = 1;
const FRIDAY = 5;
const SATURDAY = 6;

test('ежедневный шаг идёт в любой день', () => {
  assert.equal(stepDueOn(DAILY, MONDAY), true);
  assert.equal(stepDueOn(DAILY, SATURDAY), true);
});

test('недельный шаг идёт ТОЛЬКО в понедельник — иначе план гнался бы каждые сутки', () => {
  assert.equal(stepDueOn(WEEKLY, MONDAY), true);
  assert.equal(stepDueOn(WEEKLY, SATURDAY), false);
});

test('будний шаг идёт пять ночей, а не одну: понедельник и пятница — да, суббота и воскресенье — нет', () => {
  assert.equal(stepDueOn(WEEKDAYS, MONDAY), true);
  assert.equal(stepDueOn(WEEKDAYS, FRIDAY), true);
  assert.equal(stepDueOn(WEEKDAYS, SATURDAY), false);
  assert.equal(stepDueOn(WEEKDAYS, SUNDAY), false);
});

test('ритм по умолчанию — ежедневный: шаг без cadence не пропадает молча', () => {
  assert.equal(stepDueOn({ id: 'x' }, SATURDAY), true);
});

test('НЕЗНАКОМЫЙ ритм — поломка манифеста, а не «наверное ежедневно»', () => {
  assert.throws(() => stepDueOn({ id: 'x', cadence: 'по-вторникам' }, MONDAY), /незнакомый ритм/u);
  assert.equal(NIGHT_CADENCES.includes('по-вторникам'), false);
});

test('отложенное ритмом НЕ прячется — оно в плане со словом причины', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: SATURDAY });
  assert.equal(plan.length, 2, 'из плана не должен пропасть ни один шаг');
  const weekly = plan.find((p) => p.step.id === 'weekly-plan');
  assert.equal(weekly.run, false);
  assert.match(weekly.why, /не сегодня/u);
});

test('--all перекрывает ритм: ручной прогон вправе позвать всё', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: SATURDAY, all: true });
  assert.equal(plan.every((p) => p.run), true);
});

test('--only сужает, и причина невыбора названа', () => {
  const plan = planNight([DAILY, WEEKLY], { weekday: MONDAY, only: new Set(['weekly-plan']) });
  assert.equal(plan.find((p) => p.step.id === 'network-probes').why, 'не выбран --only');
});

// ── ГЕЙТ: «не начиналась» ≠ «прошла пустой» ────────────────────────────────────────────────
test('ПОРЧА DoD: красный preflight останавливает ночь и это ОТДЕЛЬНОЕ событие', () => {
  const v = nightVerdict({ preflightOk: false });
  assert.equal(v.ok, false);
  assert.equal(v.stopped, 'preflight');
  assert.equal(v.exitCode, 1);
  assert.match(nightWords(v), /ни один шаг не запускался/u);
});

test('ночь без шагов, но с зелёным preflight — НЕ то же самое, что остановленная', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [] });
  assert.equal(v.ok, true);
  assert.equal(v.stopped, null);
  assert.equal(v.exitCode, 0);
});

test('упавший критичный роняет прогон и назван поимённо', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [
    { id: 'regression-container', status: 'failed-critical' },
    { id: 'network-probes', status: 'ok' },
  ] });
  assert.equal(v.ok, false);
  assert.deepEqual(v.failed, ['regression-container']);
  assert.match(nightWords(v), /regression-container/u);
});

test('упавший НЕкритичный — находка, а не провал: ночь не заложник моргнувшей сети', () => {
  const v = nightVerdict({ preflightOk: true, statuses: [
    { id: 'network-probes', status: 'skipped-noncritical' },
  ] });
  assert.equal(v.ok, true);
  assert.equal(v.exitCode, 0);
  assert.deepEqual(v.findings, ['network-probes']);
  assert.match(nightWords(v), /находки: network-probes/u);
});

test('молчания нет ни в одной ветке — слова есть у каждого исхода', () => {
  for (const v of [
    nightVerdict({ preflightOk: false }),
    nightVerdict({ preflightOk: true, statuses: [] }),
    nightVerdict({ preflightOk: true, statuses: [{ id: 'a', status: 'failed-critical' }] }),
  ]) {
    assert.ok(nightWords(v).trim().length > 0);
  }
});

// ── МАНИФЕСТ ЖИВОЙ, А НЕ ДВОЙНИК ──────────────────────────────────────────────────────────
// Вчерашний урок этого же спринта: зубы кормились самодельным двойником каталога, и расхождение
// формы прошло зелёным. Здесь читается НАСТОЯЩИЙ манифест шагов.
test('ФОРМА: настоящий манифест ночи несёт пятерых сирот с законными ритмами', async () => {
  const { readFileSync } = await import('node:fs');
  const doc = JSON.parse(readFileSync(new URL('../docs/tasks/night-ritual-steps.json', import.meta.url), 'utf8'));
  assert.equal(doc.steps.length, 5, 'пятеро сирот — полный перечень ночи');
  for (const s of doc.steps) {
    assert.ok(NIGHT_CADENCES.includes(s.cadence), `${s.id}: ритм «${s.cadence}» вне словаря`);
    assert.ok(typeof s.command === 'string' && s.command.length > 0, `${s.id}: нет команды`);
    assert.ok(typeof s.workflow === 'string', `${s.id}: не назван workflow, из которого шаг родом`);
  }
  // План на понедельник обязан звать всех пятерых: понедельник — единственный день, когда
  // сходятся все три ритма, и именно в него падал недельный план семнадцать раз подряд.
  assert.equal(planNight(doc.steps, { weekday: MONDAY }).every((p) => p.run), true);
});

test('cadence выводится из cron: заявленный ритм и поле дней недели не расходятся', () => {
  assert.equal(cadenceOfCron('0 1 * * *'), 'daily');
  assert.equal(cadenceOfCron('10 7 * * 1-5'), 'weekdays');
  assert.equal(cadenceOfCron('0 7 * * 1'), 'weekly-monday');
  // Незнакомое поле дней недели — не «наверное ежедневно», а честное «не знаю».
  assert.equal(cadenceOfCron('0 7 * * 3'), null);
});

test('ПРОФИЛАКТИКА: у каждого шага cadence сходится с его СОБСТВЕННЫМ расписанием', async () => {
  // Класс дефекта, ради которого зуб есть: охота ходит по будням (10 7 * * 1-5), а объявлена была
  // weekly-monday. Ни одна проверка не краснела — шаг просто молча терял четыре ночи из пяти.
  // Сверка идёт с cron ТОГО ЖЕ шага, а не с памятью автора: разъехаться они теперь не могут молча.
  const { readFileSync } = await import('node:fs');
  const doc = JSON.parse(readFileSync(new URL('../docs/tasks/night-ritual-steps.json', import.meta.url), 'utf8'));
  for (const s of doc.steps) {
    const derived = cadenceOfCron(s.schedule);
    assert.notEqual(derived, null, `${s.id}: расписание «${s.schedule}» вне словаря ритмов — ритм не выводится`);
    assert.equal(s.cadence, derived, `${s.id}: заявлен ритм «${s.cadence}», а cron «${s.schedule}» говорит «${derived}»`);
  }
});

test('ПРОФИЛАКТИКА: носитель сводки объявлен ровно тем, что лежит в стволе', async () => {
  // Класс тот же, что у ритмов, только разъехались не манифест с cron, а ДВА PR одного дня:
  // сводку влил #2242 (e3687287), пока этот PR ждал слова владельца. Манифест объявлял
  // docs/night/<date>/SUMMARY.md, писателя `node scripts/night-summary.mjs` и читателя
  // `night-summary:gate` — ни файла, ни обоих глаголов в стволе нет. Объявление и факт обязаны
  // совпадать после слияния, иначе манифест ночи врёт с первого дня.
  const { readFileSync } = await import('node:fs');
  const { NIGHT_SUMMARY_MARKDOWN_REL, NIGHT_SUMMARY_REPORT_REL } = await import('./lib/night-summary.mjs');

  const manifest = JSON.parse(readFileSync(new URL('../docs/procedures/ritual-night/MANIFEST.json', import.meta.url), 'utf8'));
  const carrier = manifest.post.find((f) => f.id === 'night-summary')?.carrier;
  assert.ok(carrier, 'несущий фрейм сводки исчез из манифеста');

  // Пути в манифесте — ПОВТОР констант ствола. Повтор и есть источник расхождения, потому сверяем.
  assert.equal(carrier.machine, NIGHT_SUMMARY_REPORT_REL, 'машинный носитель разошёлся с NIGHT_SUMMARY_REPORT_REL');
  assert.equal(carrier.path, NIGHT_SUMMARY_MARKDOWN_REL, 'человекочитаемый носитель разошёлся с NIGHT_SUMMARY_MARKDOWN_REL');

  // Глаголы обязаны существовать. Прежние — не существовали, и это никого не остановило.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const role of ['writer', 'reader']) {
    const verb = String(carrier[role] ?? '').replace(/^yarn\s+/u, '').split(/\s+/u)[0];
    assert.ok(pkg.scripts[verb], `${role}: глагола «${verb}» нет в package.json — объявлен вызов, которого не существует`);
  }
});

test('исполняемый контракт утра объявлен ОДИН раз — в манифесте утра, не в манифесте ночи', async () => {
  // Потребитель (runNightReportGate) читает RITUAL_DAY_MANIFEST_REL, кадр NIGHT_REPORT_FRAME_ID.
  // Манифест ночи ему не виден вовсе. Своё blocksMorningWhen здесь было бы вторым объявлением
  // одного факта — и, разойдясь с SUPPORTED_BLOCK_EXPR, роняло бы гейт fail closed.
  const { readFileSync } = await import('node:fs');
  const { NIGHT_REPORT_FRAME_ID, RITUAL_DAY_MANIFEST_REL, SUPPORTED_BLOCK_EXPR } = await import('./lib/night-report-gate.mjs');

  const night = JSON.parse(readFileSync(new URL('../docs/procedures/ritual-night/MANIFEST.json', import.meta.url), 'utf8'));
  const carrier = night.post.find((f) => f.id === 'night-summary')?.carrier;
  assert.equal(carrier.blocksMorningWhen, undefined, 'ночь объявила своё blocksMorningWhen — второе объявление одного факта');

  const day = JSON.parse(readFileSync(new URL(`../${RITUAL_DAY_MANIFEST_REL}`, import.meta.url), 'utf8'));
  const frames = [...(day.preflight ?? []), ...(day.frames ?? []), ...(day.post ?? [])];
  const live = frames.find((f) => f.id === NIGHT_REPORT_FRAME_ID)?.carrier;
  assert.ok(live, `кадр ${NIGHT_REPORT_FRAME_ID} исчез из манифеста утра — потребителю нечего читать`);
  assert.equal(live.blocksMorningWhen, SUPPORTED_BLOCK_EXPR, 'живое выражение разошлось с единственным поддержанным — гейт упал бы fail closed');
});

test('СНИМОК ДОЛГА: сводка читает три ночных workflow из пяти шагов ночи', async () => {
  // Долг называется числом, чтобы не расти молча. Механизм заведён лечить «пять следов, ни одного
  // читателя», а читает три: охота и НЕДЕЛЬНЫЙ ПЛАН — тот самый, что падал семнадцать понедельников
  // подряд, — не покрыты вовсе. Расширение обязано двинуть это число ОСОЗНАННО, как род процедуры.
  const { readFileSync } = await import('node:fs');
  const { NIGHT_WORKFLOWS } = await import('./lib/night-summary.mjs');
  assert.equal(NIGHT_WORKFLOWS.length, 3, 'состав сводки изменился — обнови снимок долга вместе с решением');

  const doc = JSON.parse(readFileSync(new URL('../docs/tasks/night-ritual-steps.json', import.meta.url), 'utf8'));
  const covered = new Set(NIGHT_WORKFLOWS.map((w) => w.workflow));
  const uncovered = doc.steps
    .filter((s) => !covered.has(String(s.workflow).replace('.github/workflows/', '')))
    .map((s) => s.id);
  assert.deepEqual(
    uncovered.sort(),
    ['night-hunt', 'vitest-corpus', 'weekly-plan'],
    'состав непрочитанных шагов сдвинулся — это либо починка долга, либо новая слепота, и молча оно не проходит',
  );
});
