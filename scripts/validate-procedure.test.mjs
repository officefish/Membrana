import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROCEDURE_CORE_PILOTS,
  PROCEDURE_HOME_PILOTS,
  auditProcedureCorpus,
  auditProcedureHomes,
  collectDeclaredHomePaths,
  coreFieldsProblems,
  corePresence,
  frameLaneProblems,
  homeFieldsProblems,
  isHonestWhy,
  listBuiltProcedureIds,
  listProcedureDirs,
  manifestSchemaProblems,
  normalizeFramePins,
  portfolioProblems,
  validateProcedure,
} from './lib/validate-procedure.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Фикстура: временный «репозиторий» с контейнером.
const tmp = mkdtempSync(join(tmpdir(), 'proc-validate-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function makeContainer(id, { readme = 'Определение.', manifest, extraFile } = {}) {
  const dir = join(tmp, 'docs', 'procedures', id);
  mkdirSync(dir, { recursive: true });
  if (readme !== null) writeFileSync(join(dir, 'README.md'), readme);
  if (manifest !== null) {
    writeFileSync(join(dir, 'MANIFEST.json'),
      typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  }
  if (extraFile) writeFileSync(join(dir, extraFile), '// code');
  return dir;
}

const GOOD = {
  id: 'demo',
  leadPersona: 'angelina',
  kitVersion: null,
  engines: ['scripts/demo-engine.mjs'],
  precedents: [],
};

mkdirSync(join(tmp, 'scripts'), { recursive: true });
writeFileSync(join(tmp, 'scripts', 'demo-engine.mjs'), 'export {};');

test('валидный контейнер: все три предиката истинны, valid=true', () => {
  const dir = makeContainer('demo', { manifest: GOOD });
  const r = validateProcedure(dir, tmp);
  assert.deepEqual(
    { valid: r.valid, resolvable: r.resolvable, readmeNonEmpty: r.readmeNonEmpty, manifestSchemaOk: r.manifestSchemaOk },
    { valid: true, resolvable: true, readmeNonEmpty: true, manifestSchemaOk: true },
    r.problems.join('; '),
  );
});

test('нерезолвящийся движок → resolvable=false, дефект с путём', () => {
  const dir = makeContainer('ghost', { manifest: { ...GOOD, id: 'ghost', engines: ['scripts/net-takogo.mjs'] } });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('net-takogo.mjs')));
});

test('пустой README и битый JSON — оба дефекта названы', () => {
  const dir = makeContainer('broken', { readme: '   ', manifest: '{оборвано' });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('README')));
  assert.ok(r.problems.some((p) => p.includes('битый JSON')));
});

test('код в контейнере (Т12) — дефект даже при валидной схеме', () => {
  const dir = makeContainer('coded', { manifest: { ...GOOD, id: 'coded' }, extraFile: 'helper.mjs' });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('Т12')));
});

test('схема: пустые engines, лишнее поле, id≠каталогу — дефекты', () => {
  assert.ok(manifestSchemaProblems({ ...GOOD, engines: [] }, 'demo').some((p) => p.includes('без движков')));
  assert.ok(manifestSchemaProblems({ ...GOOD, extra: 1 }, 'demo').some((p) => p.includes('лишнее поле')));
  assert.ok(manifestSchemaProblems(GOOD, 'other').some((p) => p.includes('≠ имени каталога')));
});

test('portfolio: present требует элементы с резолвящимися путями', () => {
  const ok = {
    status: 'present',
    items: [{ id: 'engine', kind: 'engine', path: 'scripts/demo-engine.mjs' }],
  };
  assert.equal(portfolioProblems(ok, tmp).length, 0);
  assert.ok(portfolioProblems({ status: 'present', items: [] }, tmp).some((p) => p.includes('items пуст')));
  assert.ok(
    portfolioProblems({ status: 'present', items: [{ id: 'ghost', kind: 'run', path: 'docs/nope.md' }] }, tmp)
      .some((p) => p.includes('не резолвится')),
  );
  assert.equal(manifestSchemaProblems({ ...GOOD, portfolio: ok }, 'demo', tmp).length, 0);
});

test('ЗУБ CI: каждый реальный контейнер docs/procedures/ валиден', () => {
  const dirs = listProcedureDirs(repoRoot);
  assert.ok(dirs.length >= 1, 'дом слоя не пуст — первый жилец заселён (Р1)');
  for (const dir of dirs) {
    const r = validateProcedure(dir, repoRoot);
    assert.equal(r.valid, true, `${dir}: ${r.problems.join('; ')}`);
  }
});

test('kitVersion на несуществующий кит → resolvable=false', () => {
  const dir = makeContainer('badkit', {
    manifest: { ...GOOD, id: 'badkit', kitVersion: 'kits/net-takogo' },
  });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('kitVersion не резолвится')));
});

test('ритуал утра ritual-day: kitVersion → kits/angelina-morning', () => {
  const day = join(repoRoot, 'docs', 'procedures', 'ritual-day');
  const r = validateProcedure(day, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
  const m = JSON.parse(readFileSync(join(day, 'MANIFEST.json'), 'utf8'));
  assert.equal(m.kitVersion, 'kits/angelina-morning');
  assert.equal(m.engines.length, 1, 'engines не дублируют весь кит');
});

test('ритуал снов ritual-dreams: kitVersion → kits/dream-master', () => {
  const dreams = join(repoRoot, 'docs', 'procedures', 'ritual-dreams');
  const r = validateProcedure(dreams, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
  const m = JSON.parse(readFileSync(join(dreams, 'MANIFEST.json'), 'utf8'));
  assert.equal(m.kitVersion, 'kits/dream-master');
  assert.equal(m.engines.length, 1);
  assert.ok(m.precedents.some((p) => p.includes('DREAM_MASTER_PROMPT')));
});

const GOOD_PIN = {
  path: 'docs/example.md',
  anchor: { kind: 'marker', ref: '<!-- gate -->' },
  segmentHash: 'a'.repeat(40),
};

test('F1: отсутствие очереди кадров — валидно (P2/P3 вакуумны)', () => {
  assert.equal(manifestSchemaProblems(GOOD, 'demo').length, 0);
});

test('F1: frames с валидным кадром и pins[] — ок; лишний ключ — дефект', () => {
  const withFrames = {
    ...GOOD,
    frames: [{ id: 'morning-hygiene', holder: 'ozhegov', pins: [GOOD_PIN] }],
  };
  assert.equal(manifestSchemaProblems(withFrames, 'demo').length, 0, manifestSchemaProblems(withFrames, 'demo').join('; '));
  assert.ok(manifestSchemaProblems({ ...GOOD, scenes: [] }, 'demo').some((p) => p.includes('лишнее поле')));
});

test('F1: preflight + frames + post — три полосы; дубль id между полосами — P2 fail', () => {
  const m = {
    ...GOOD,
    preflight: [{ id: 'morning-wiring', holder: 'ozhegov', pins: [GOOD_PIN] }],
    frames: [{ id: 'strategy-day', holder: 'vesnin' }],
    post: [{ id: 'swallow-send', holder: 'angelina' }],
  };
  assert.equal(manifestSchemaProblems(m, 'demo').length, 0, manifestSchemaProblems(m, 'demo').join('; '));
  const dup = {
    ...GOOD,
    preflight: [{ id: 'same', holder: 'ozhegov' }],
    frames: [{ id: 'same', holder: 'vesnin' }],
  };
  assert.ok(manifestSchemaProblems(dup, 'demo').some((p) => p.includes('дубль id')));
});

test('F1: holder вне Persona и битая структура pins — дефекты', () => {
  assert.ok(
    manifestSchemaProblems(
      { ...GOOD, frames: [{ id: 'x', holder: 'manager' }] },
      'demo',
    ).some((p) => p.includes('holder')),
  );
  assert.ok(
    manifestSchemaProblems(
      { ...GOOD, frames: [{ id: 'x', holder: 'vesnin', pins: [{ path: 'a.md' }] }] },
      'demo',
    ).some((p) => p.includes('anchor') || p.includes('segmentHash')),
  );
});

test('F1 ADR-0015: скаляр pin нормализуется в pins[]; pin+pins вместе — дефект', () => {
  const { frame } = normalizeFramePins({ id: 'x', holder: 'vesnin', pin: GOOD_PIN });
  assert.ok(Array.isArray(frame.pins) && frame.pins.length === 1);
  const both = frameLaneProblems(
    [{ id: 'x', holder: 'vesnin', pin: GOOD_PIN, pins: [GOOD_PIN] }],
    'frames',
  );
  assert.ok(both.some((p) => p.includes('одновременно')));
});

test('F1: validateProcedure принимает контейнер с frames', () => {
  const dir = makeContainer('framed', {
    manifest: {
      ...GOOD,
      id: 'framed',
      frames: [{ id: 'step-one', holder: 'angelina', pins: [GOOD_PIN] }],
    },
  });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, true, r.problems.join('; '));
});

const GOOD_CORE = {
  trigger: { kind: 'captain-word', command: 'yarn demo' },
  steps: {
    kind: 'inline',
    items: [{ id: 'one', criticality: 'critical' }],
  },
  gates: { kind: 'none', why: 'нет машинной паузы на человека' },
};

test('CORE: отсутствие ядра — valid + finding; частичное — дефект', () => {
  const bare = makeContainer('bare-core', { manifest: { ...GOOD, id: 'bare-core' } });
  const bareR = validateProcedure(bare, tmp);
  assert.equal(bareR.valid, true, bareR.problems.join('; '));
  assert.equal(bareR.core, 'none');
  assert.ok(bareR.findings.some((f) => f.includes('нет ядра')));

  assert.equal(corePresence({ ...GOOD, trigger: GOOD_CORE.trigger }), 'partial');
  assert.ok(
    manifestSchemaProblems({ ...GOOD, trigger: GOOD_CORE.trigger }, 'demo').some((p) =>
      p.includes('частичное'),
    ),
  );
});

test('CORE: полное ядро валидно; заглушка why — дефект; noncritical без why — дефект', () => {
  assert.equal(isHonestWhy('TODO'), false);
  assert.equal(isHonestWhy('паузы в диалоге, не в потоке'), true);
  assert.equal(
    manifestSchemaProblems({ ...GOOD, ...GOOD_CORE }, 'demo', tmp).length,
    0,
    manifestSchemaProblems({ ...GOOD, ...GOOD_CORE }, 'demo', tmp).join('; '),
  );
  const stub = {
    ...GOOD,
    ...GOOD_CORE,
    gates: { kind: 'none', why: 'TODO' },
  };
  assert.ok(manifestSchemaProblems(stub, 'demo', tmp).some((p) => p.includes('честного why')));
  const badStep = {
    ...GOOD,
    ...GOOD_CORE,
    steps: {
      kind: 'inline',
      items: [{ id: 'x', criticality: 'noncritical' }],
    },
  };
  assert.ok(
    coreFieldsProblems(badStep, tmp).some((p) => p.includes('whyNoncritical')),
  );
});

test('CORE: steps.ref резолвит evening-ritual-steps.json', () => {
  const eveningish = {
    ...GOOD,
    trigger: { kind: 'captain-word', command: 'yarn ritual:evening' },
    steps: { kind: 'ref', path: 'docs/tasks/evening-ritual-steps.json' },
    gates: {
      kind: 'inline',
      items: [{
        id: 'partner-swallow',
        waitsFor: 'owner',
        resume: 'ок владельца → yarn telegram:swallow',
      }],
    },
  };
  const probs = manifestSchemaProblems(eveningish, 'demo', repoRoot);
  assert.equal(probs.length, 0, probs.join('; '));
});

test('CORE Ф1: пилоты ritual-evening / bridge / ritual-dreams несут валидное ядро', () => {
  for (const id of PROCEDURE_CORE_PILOTS) {
    const dir = join(repoRoot, 'docs', 'procedures', id);
    const r = validateProcedure(dir, repoRoot);
    assert.equal(r.valid, true, `${id}: ${r.problems.join('; ')}`);
    assert.equal(r.core, 'full', `${id}: ядро неполное`);
    assert.equal(r.findings.length, 0, `${id}: ${r.findings.join('; ')}`);
  }
});

test('CORPUS Ф5: все built несут полное ядро + home+mode; audit пуст', () => {
  const built = listBuiltProcedureIds(repoRoot);
  assert.ok(built.length >= 11, `ожидали ≥11 built, получили ${built.length}`);
  for (const id of built) {
    const dir = join(repoRoot, 'docs', 'procedures', id);
    const r = validateProcedure(dir, repoRoot);
    assert.equal(r.valid, true, `${id}: ${r.problems.join('; ')}`);
    assert.equal(r.core, 'full', `${id}: ядро неполное`);
    const m = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8'));
    assert.ok(m.home && m.mode, `${id}: нет home/mode`);
    assert.ok(isHonestWhy(m.home.kind === 'none' ? m.home.why : 'path-home-ok') || m.home.kind === 'path',
      `${id}: home.none без честного why`);
  }
  const findings = auditProcedureCorpus(repoRoot);
  assert.equal(findings.length, 0, findings.join('\n'));
});

test('CORPUS Ф5: morning-ritual-steps.json годится как steps.ref (criticality)', () => {
  const probs = coreFieldsProblems(
    {
      trigger: { kind: 'captain-word', command: 'yarn ritual:day' },
      steps: { kind: 'ref', path: 'docs/tasks/morning-ritual-steps.json' },
      gates: {
        kind: 'inline',
        items: [{
          id: 'magistral-choice',
          waitsFor: 'owner',
          resume: 'owner-choice → main-day-issue',
        }],
      },
    },
    repoRoot,
  );
  assert.equal(probs.length, 0, probs.join('; '));
});

test('HOME Ф2: mode вне словаря и home.path без каталога — дефекты', () => {
  assert.ok(
    homeFieldsProblems({ mode: 'remote' }, tmp).some((p) => p.includes('mode')),
  );
  const ghost = {
    ...GOOD,
    mode: 'local',
    home: {
      kind: 'path',
      path: 'docs/net-takogo-home',
      form: 'docs/net-takogo-home/HOME.form.json',
      holder: 'angelina',
      writers: [{ procedureId: 'bridge', via: 'yarn bridge' }],
    },
  };
  assert.ok(
    manifestSchemaProblems(ghost, 'demo', tmp).some((p) => p.includes('не существует')),
  );
});

test('HOME Ф2: пилоты несут home+mode; bridge объявляет docs/bridge', () => {
  for (const id of PROCEDURE_HOME_PILOTS) {
    const dir = join(repoRoot, 'docs', 'procedures', id);
    const r = validateProcedure(dir, repoRoot);
    assert.equal(r.valid, true, `${id}: ${r.problems.join('; ')}`);
    const m = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8'));
    assert.ok(m.home && m.mode, `${id}: нет home/mode`);
  }
  const bridge = JSON.parse(
    readFileSync(join(repoRoot, 'docs/procedures/bridge/MANIFEST.json'), 'utf8'),
  );
  assert.equal(bridge.home.kind, 'path');
  assert.equal(bridge.home.path, 'docs/bridge');
  assert.equal(bridge.mode, 'mirrored');
  assert.ok(collectDeclaredHomePaths(repoRoot).has('docs/bridge'));
});

test('HOME Ф2: auditProcedureHomes — docs/bridge объявлен, находки пусты', () => {
  const findings = auditProcedureHomes(repoRoot);
  assert.equal(
    findings.filter((f) => f.includes('docs/bridge')).length,
    0,
    findings.join('; '),
  );
});

test('HOME Ф4: форма мостика несёт formVersion; bridge валиден', () => {
  const form = JSON.parse(
    readFileSync(join(repoRoot, 'docs/bridge/HOME.form.json'), 'utf8'),
  );
  assert.equal(form.formVersion, '1.0.0');
  assert.ok(Array.isArray(form.compat) && form.compat.includes('1.0.0'));
  assert.equal('version' in form, false);
  const dir = join(repoRoot, 'docs/procedures/bridge');
  const r = validateProcedure(dir, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
});

test('ростер держателей кадров несёт СЕМЬ персон — тимлид не выпадает второй раз', async () => {
  // Вещдок 03.08: список был отчеканен 26.07, за день до ротации ролей 27.07, и валидатор
  // отвергал tarasov держателем кадра execute шота — второй экземпляр дефекта класса #1644
  // («шесть дней тимлид вне ростера»). Зуб держит список ДОСЛОВНО: молчаливое выпадение
  // персоны из копии ростера — ровно то, что случилось дважды.
  const { PROCEDURE_PERSONAS } = await import('./lib/validate-procedure.mjs');
  assert.deepEqual(
    [...PROCEDURE_PERSONAS].sort(),
    ['angelina', 'dynin', 'kuryokhin', 'ozhegov', 'rodchenko', 'tarasov', 'vesnin'],
  );
});
