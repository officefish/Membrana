import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FINDING_KINDS,
  PENDING_REASONS,
  VERDICTS,
  auditCatalogs,
  auditWires,
  checkWire,
  commandNameFromYarn,
  extractCarrierPaths,
  pendingEntryProblems,
  pendingExpired,
  splitComposite,
} from './lib/dead-wire.mjs';
import { runCheck } from './dead-wire-check.mjs';

const TODAY = '2026-08-01';
const alive = () => true;
const dead = () => false;

// Срок pending ратифицируется владельцем и продлевается (01.08 → 11.08: 09.08 → 16.08);
// живые прогоны ниже читают его из перечня, а не из пришпиленной даты — пришпиленный
// пин падал при каждой легальной перечеканке, ничего не ловя.
const LIVE_PENDING = JSON.parse(
  readFileSync(new URL('../docs/tasks/dead-wire-pending.json', import.meta.url), 'utf8'),
);
const LIVE_UNTIL = Object.values(LIVE_PENDING.pending)
  .map((p) => p.until)
  .sort()
  .at(-1);
const shiftDay = (iso, days) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

// ── извлечение носителя ──────────────────────────────────────────────────────

test('составная команда отдаёт все носители, а не первый', () => {
  const paths = extractCarrierPaths('node scripts/a.mjs && turbo run build | node ./scripts/b.mjs');
  assert.deepEqual(paths, ['scripts/a.mjs', 'scripts/b.mjs']);
});

test('команды без файлового носителя носителей не дают', () => {
  for (const cmd of ['turbo run build', 'yarn workspace @m/core build', 'tsc -p .', 'echo ok']) {
    assert.deepEqual(extractCarrierPaths(cmd), [], cmd);
  }
});

test('префикс переменных окружения не прячет носитель', () => {
  assert.deepEqual(extractCarrierPaths('NODE_ENV=prod node scripts/x.mjs'), ['scripts/x.mjs']);
});

test('флаги раннера не принимаются за путь', () => {
  assert.deepEqual(extractCarrierPaths('node --test scripts/y.test.mjs'), ['scripts/y.test.mjs']);
});

test('splitComposite режет по операторам оболочки', () => {
  assert.deepEqual(splitComposite('a && b || c ; d | e'), ['a', 'b', 'c', 'd', 'e']);
});

// ── оба пути предиката ───────────────────────────────────────────────────────

test('путь 1: носитель на месте — находки нет', () => {
  const found = checkWire({
    name: 'live', command: 'node scripts/live.mjs', fileExists: alive, pending: {}, today: TODAY,
  });
  assert.deepEqual(found, []);
});

test('путь 2: носителя нет и записи pending нет — dead_wire', () => {
  const found = checkWire({
    name: 'night:run', command: 'node scripts/night-build-run-phase.mjs',
    fileExists: dead, pending: {}, today: TODAY,
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'dead_wire');
  assert.equal(found[0].carrier, 'scripts/night-build-run-phase.mjs');
});

test('легальное «нет с причиной»: валидный непросроченный pending находки не даёт', () => {
  const found = checkWire({
    name: 'later', command: 'node scripts/later.mjs', fileExists: dead,
    pending: { later: { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.deepEqual(found, []);
});

// ── каждый род находки поимённо ──────────────────────────────────────────────

test('род pending_invalid: причина вне закрытого перечня', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: dead,
    pending: { x: { reason: 'потому что', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(found[0].kind, 'pending_invalid');
});

test('род pending_expired: срок вышел — это находка, а не тихий remove', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: dead,
    pending: { x: { reason: 'awaits-implementation', until: '2026-07-31' } }, today: TODAY,
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'pending_expired');
});

test('род pending_orphan: провод жив, а запись держится', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: alive,
    pending: { x: { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(found[0].kind, 'pending_orphan');
});

test('род pending_orphan: запись о команде, которой нет в package.json', () => {
  const { findings } = auditWires({
    scripts: { live: 'node scripts/live.mjs' }, fileExists: alive,
    pending: { 'ушла:совсем': { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'pending_orphan');
  assert.equal(findings[0].name, 'ушла:совсем');
});

test('blocked-by-epic без ссылки — невалидная запись', () => {
  assert.ok(pendingEntryProblems({ reason: 'blocked-by-epic', until: '2026-09-01' }).length > 0);
  assert.deepEqual(
    pendingEntryProblems({ reason: 'blocked-by-epic', until: '2026-09-01', ref: '#1447' }), [],
  );
});

test('срок сравнивается календарно', () => {
  assert.equal(pendingExpired({ until: '2026-07-31' }, TODAY), true);
  assert.equal(pendingExpired({ until: '2026-08-01' }, TODAY), false);
  assert.equal(pendingExpired({ until: '2026-08-02' }, TODAY), false);
});

// ── «сейчас» и вход не выдумываются ──────────────────────────────────────────

test('без today аудит падает, а не считает всё свежим', () => {
  assert.throws(() => auditWires({ scripts: {}, fileExists: alive }), /today/);
});

test('перечни закрыты', () => {
  assert.deepEqual([...VERDICTS], ['implement', 'pending', 'remove']);
  assert.equal(FINDING_KINDS.length, 5, 'пятый род введён актом владельца 01.08, шестого нет');
  assert.ok(FINDING_KINDS.includes('carrier_mismatch'));
  assert.equal(PENDING_REASONS.length, 4);
  assert.ok(Object.isFrozen(VERDICTS) && Object.isFrozen(FINDING_KINDS));
});

// ── каталоги мастерских ──────────────────────────────────────────────────────

test('ключ инструмента выводится из поля yarn, флаги отбрасываются', () => {
  assert.equal(commandNameFromYarn('yarn strategic-docs:publish --push'), 'strategic-docs:publish');
  assert.equal(commandNameFromYarn('yarn task:board'), 'task:board');
  assert.equal(commandNameFromYarn('—'), null, 'прочерк — доковый вход, не провод');
  assert.equal(commandNameFromYarn(undefined), null);
});

test('каталог: объявление только в каталоге, движка нет — dead_wire с указанием источника', () => {
  const { findings } = auditCatalogs({
    catalogs: [{ path: 'docs/x/workshop.catalog.json', tools: [{ id: 'board', yarn: 'yarn task:board', script: 'scripts/нет.mjs' }] }],
    scripts: {},
    fileExists: dead,
    today: TODAY,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'dead_wire');
  assert.equal(findings[0].source, 'docs/x/workshop.catalog.json');
  assert.equal(findings[0].tool, 'board');
});

test('каталог: законный pending гасит находку и здесь — своих ключей перечень не заводит', () => {
  const { findings } = auditCatalogs({
    catalogs: [{ path: 'c.json', tools: [{ id: 'board', yarn: 'yarn task:board', script: 'scripts/нет.mjs' }] }],
    scripts: {},
    fileExists: dead,
    pending: { 'task:board': { reason: 'awaits-implementation', until: '2026-09-01' } },
    today: TODAY,
  });
  assert.deepEqual(findings, []);
});

test('род carrier_mismatch: каталог обещает один носитель, команда запускает другой', () => {
  const { findings } = auditCatalogs({
    catalogs: [{ path: 'c.json', tools: [{ id: 'publish-push', yarn: 'yarn pub --push', script: 'scripts/lib/inner.mjs' }] }],
    scripts: { pub: 'node scripts/outer.mjs' },
    fileExists: alive,
    today: TODAY,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'carrier_mismatch');
  assert.match(findings[0].detail, /каталог обещает scripts\/lib\/inner\.mjs/u);
});

test('согласие каталога и package.json находки не даёт', () => {
  const { findings } = auditCatalogs({
    catalogs: [{ path: 'c.json', tools: [{ id: 'ok', yarn: 'yarn ok', script: 'scripts/ok.mjs' }] }],
    scripts: { ok: 'node scripts/ok.mjs --flag' },
    fileExists: alive,
    today: TODAY,
  });
  assert.deepEqual(findings, []);
});

test('живые каталоги в дереве: два, инструментов двенадцать, расхождений нет', () => {
  const report = runCheck({ today: TODAY });
  assert.equal(report.catalogsChecked, 2);
  assert.equal(report.toolsChecked, 12);
  assert.equal(report.findings.filter((f) => f.kind === 'carrier_mismatch').length, 0);
});

// ── прогон по живому дереву ──────────────────────────────────────────────────

// Красный ДО разбора доказан прогоном 01.08: 418 команд, 10 мёртвых, код возврата 1.
// После разбора (4 сняты, 6 в pending) тот же зуб обязан быть зелёным — иначе разбор
// ничего не изменил. Утверждение перевёрнуто сознательно, а не подогнано под результат.
test('живой package.json: после разбора связь честная', () => {
  const report = runCheck({ today: TODAY });
  assert.equal(report.findings.length, 0, `находки: ${JSON.stringify(report.findings)}`);
  assert.ok(report.checked > 400, `команд проверено: ${report.checked}`);
});

test('перечень pending покрывает ровно шесть проводов и все с причиной и датой', () => {
  const report = runCheck({ today: TODAY });
  assert.equal(report.findings.length, 0);
  // Сдвинем «сегодня» за срок — все шесть обязаны проявиться как просроченные.
  const after = runCheck({ today: shiftDay(LIVE_UNTIL, 1) });
  assert.equal(after.findings.length, 6, 'за сроком должны проявиться все шесть');
  assert.ok(after.findings.every((f) => f.kind === 'pending_expired'));
});

test('подложенный фальшивый провод роняет зуб, package.json не тронут', () => {
  const before = runCheck({ today: TODAY }).findings.length;
  const after = runCheck({
    today: TODAY,
    extraScripts: { 'fake:wire': 'node scripts/этого-файла-нет.mjs' },
  });
  assert.equal(after.findings.length, before + 1);
  assert.ok(after.findings.some((f) => f.name === 'fake:wire' && f.kind === 'dead_wire'));
});

// ── сторож в утренней цепочке ────────────────────────────────────────────────

test('срок доказывается БЕЗ его ожидания: дата приходит параметром', () => {
  // Системное время не подделывается: ядро берёт день прогона аргументом, и это
  // единственный честный способ проверить будущее.
  const before = runCheck({ today: shiftDay(LIVE_UNTIL, -1) });
  const onDay = runCheck({ today: LIVE_UNTIL });
  const after = runCheck({ today: shiftDay(LIVE_UNTIL, 1) });

  const expired = (r) => r.findings.filter((f) => f.kind === 'pending_expired');
  assert.equal(expired(before).length, 0, 'накануне срок ещё в силе');
  assert.equal(expired(onDay).length, 0, 'в САМ день срок ещё не вышел — сравнение строгое');
  assert.ok(expired(after).length > 0, 'назавтра прибор кричит');
});

test('сегодня сторож молчит: шума от ежедневного звонка нет', () => {
  const today = runCheck({ today: '2026-08-02' });
  assert.deepEqual(today.findings, [], 'pending в силе — находок ноль');
});

test('сторож ВПАЯН в утреннюю цепочку, а не только объявлен глаголом', () => {
  // Ловушка, ради которой зуб и стоит: глагол dead-wire:check существовал в package.json
  // и в этом файле — и не звался ниоткуда. Объявление без вызова прибором не является.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const chain = String(pkg.scripts['ritual:day']);
  assert.ok(chain.includes('dead-wire-check.mjs'), 'вызова нет — сторож снова спит');

  const at = chain.indexOf('dead-wire-check.mjs');
  const week = chain.indexOf('plan-week-if-monday.mjs');
  assert.ok(at < week, 'документы дня не чеканятся поверх невыявленных мёртвых проводов');
});

test('сторож НЕ обёрнут в «|| true»: гашеный отказ — не сторож', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const chain = String(pkg.scripts['ritual:day']);
  const at = chain.indexOf('dead-wire-check.mjs');
  const tail = chain.slice(at, at + 60);
  assert.doesNotMatch(tail, /\|\|\s*true/u, 'обёртка вернула бы ровно ту болезнь, что лечится');
});

test('манифест называет ОБА источника и различает их словами', () => {
  const m = JSON.parse(
    readFileSync(new URL('../docs/procedures/weekly-dead-wire/MANIFEST.json', import.meta.url), 'utf8'),
  );
  assert.equal(m.trigger.kind, 'captain-word', 'процедуру по-прежнему поднимает владелец такта');
  assert.equal(m.trigger.watchdog.role, 'gate');
  assert.match(m.trigger.watchdog.note, /ПОДНИМАЕТ процедуру/u);
  assert.match(m.trigger.watchdog.note, /ЗВОНИТ В ЗВОНОК/u);
});

test('манифест и цепочка не разъедутся молча: сверка ведётся ПО манифесту', () => {
  // Прежние зубы проверяли цепочку по строкам, вписанным в сам зуб, — то есть сверяли дело
  // с зубом, а не с объявлением. Через полгода кто-нибудь припишет `|| true` в цепочку либо
  // сменит место в манифесте, и словарь разойдётся с делом беззвучно. Здесь ожидание берётся
  // ИЗ манифеста, поэтому расхождение любой из двух сторон даёт красное.
  const root = new URL('../', import.meta.url);
  const m = JSON.parse(readFileSync(new URL('docs/procedures/weekly-dead-wire/MANIFEST.json', root), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

  const w = m.trigger.watchdog;
  const chain = String(pkg.scripts[w.host]);
  const at = chain.indexOf(w.command);

  assert.ok(at >= 0, `манифест объявляет «${w.command}» в цепочке ${w.host}, а её там нет`);

  assert.ok(at < chain.indexOf(w.before), `манифест обещает вызов перед «${w.before}» — цепочка этого не держит`);

  if (w.role === 'gate') {
    assert.doesNotMatch(chain.slice(at, at + 60), /\|\|\s*true/u, 'роль gate объявлена, а отказ гасится');
  }
});
