import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activeBlocks,
  activeIsOpen,
  activeSprintId,
  closeFindings,
  liveBlockBranches,
  mayClose,
  renderClosedActive,
} from './lib/cowork-close.mjs';

const activeOpen = `# Cowork Sprint — ACTIVE

| Поле | Значение |
|------|----------|
| **status** | \`open\` — Phase 0 закрыта; Phase 1 — следующая |
| sprintId | \`cowork-demo\` |
| blocks | \`alpha-one\` · \`beta-two\` · \`gamma-three\` |
`;

const state = (over = {}) => ({
  activeMd: activeOpen,
  sprintId: 'cowork-demo',
  dirFiles: ['COWORK_SPRINT_BRIEF.md', 'INTERFACE_CONTRACT.md', 'RETROSPECTIVE.md'],
  retroMd: '# RETRO\n\n- Блоков переписано: 0. Стыков адаптировано: 3.\n',
  card: { id: 'cowork-demo', status: 'archived' },
  liveBranches: [],
  ...over,
});

test('шапка разобрана: sprintId, признак open, слаги блоков', () => {
  assert.equal(activeSprintId(activeOpen), 'cowork-demo');
  assert.equal(activeIsOpen(activeOpen), true);
  assert.deepEqual(activeBlocks(activeOpen), ['alpha-one', 'beta-two', 'gamma-three']);
});

test('признак open — ТОТ ЖЕ, что читает cowork:open (один язык, один гард)', () => {
  // Разойдись формулировки — open отказывал бы открывать, а close считал бы закрытым.
  assert.equal(activeIsOpen('| **status** | `closed` — Phase 5 закрыта |'), false);
});

test('всё на месте: находок нет, закрывать можно', () => {
  const f = closeFindings(state());
  assert.deepEqual(f, []);
  assert.equal(mayClose(f), true);
});

test('нет INTERFACE_CONTRACT → блокирующая: Phase 3 не состоялась', () => {
  const f = closeFindings(state({ dirFiles: ['RETROSPECTIVE.md'] }));
  assert.equal(f.find((x) => x.id === 'contract_missing')?.blocking, true);
  assert.equal(mayClose(f), false);
});

test('нет RETROSPECTIVE → блокирующая: Phase 5 без ретроспективы не Phase 5', () => {
  const f = closeFindings(state({ dirFiles: ['INTERFACE_CONTRACT.md'], retroMd: null }));
  assert.equal(f.find((x) => x.id === 'retrospective_missing')?.blocking, true);
});

test('ретроспектива есть, метрики резки нет → находка НЕ блокирующая', () => {
  // Держать флаг открытым из-за формулировки значило бы воспроизвести рецидив, а не лечить.
  const f = closeFindings(state({ retroMd: '# RETRO\n\nВсё прошло отлично.\n' }));
  const m = f.find((x) => x.id === 'retrospective_missing_metric');
  assert.equal(m?.blocking, false);
  assert.match(m.note, /на глазок/u);
  assert.equal(mayClose(f), true, 'закрытие флага не роняется');
});

test('карточки реестра нет вовсе → находка, но не блокирующая (вещдок 30.07)', () => {
  const f = closeFindings(state({ card: null }));
  const c = f.find((x) => x.id === 'card_missing');
  assert.equal(c?.blocking, false);
  assert.match(c.note, /не был зарегистрирован/u);
});

test('карточка активна → назван следующий шаг, а не молчание', () => {
  const f = closeFindings(state({ card: { id: 'cowork-demo', status: 'active' } }));
  const c = f.find((x) => x.id === 'card_not_archived');
  assert.equal(c?.blocking, false);
  assert.match(c.note, /task:archive/u);
});

test('живые ветки блоков → находка, но закрытие флага не роняют', () => {
  const f = closeFindings(state({ liveBranches: ['cowork/cowork-demo/alpha-one'] }));
  assert.equal(f.find((x) => x.id === 'branches_alive')?.blocking, false);
  assert.equal(mayClose(f), true);
});

test('нет ACTIVE / флаг уже закрыт → ранний блокирующий отказ, дальше не судим', () => {
  const noActive = closeFindings(state({ activeMd: null }));
  assert.deepEqual(noActive.map((x) => x.id), ['no_active']);

  const closed = closeFindings(state({ activeMd: '| **status** | `closed` |' }));
  assert.deepEqual(closed.map((x) => x.id), ['active_not_open']);
  assert.equal(mayClose(closed), false, 'идемпотентность: менять нечего, а не «закрыли снова»');
});

test('нет sprintId в шапке → блокирующая, и дальше не судим', () => {
  const f = closeFindings(state({ activeMd: '| **status** | `open` |', sprintId: null }));
  assert.deepEqual(f.map((x) => x.id), ['no_sprint_id']);
});

test('ветки блоков считаются по именам из ACTIVE, чужие не цепляются', () => {
  const live = liveBlockBranches('cowork-demo', ['alpha-one', 'beta-two'], [
    'main',
    'cowork/cowork-demo/alpha-one',
    'cowork/cowork-other/beta-two',
  ]);
  assert.deepEqual(live, ['cowork/cowork-demo/alpha-one']);
});

test('renderClosedActive: статус closed, дата параметром, основание дописано секцией', () => {
  const out = renderClosedActive(activeOpen, {
    sprintId: 'cowork-demo',
    closedAt: '2026-07-30',
    findings: [{ id: 'branches_alive', note: 'ветки живы' }],
  });
  assert.match(out, /\| \*\*status\*\* \| `closed` — Phase 5 закрыта 2026-07-30/u);
  assert.ok(!out.includes('`open`'), 'прежний open не остался');
  assert.match(out, /## Закрытие Phase 5/u);
  assert.match(out, /- `branches_alive` — ветки живы/u, 'неблокирующие находки видны снаружи');
  assert.match(out, /НЕ утверждает/u, 'граница названа: качество сведения машине недоступно');
  assert.match(out, /\| sprintId \| `cowork-demo` \|/u, 'остальная шапка не потеряна');
});

test('renderClosedActive: пустой список находок печатается явной строкой, не пустотой', () => {
  const out = renderClosedActive(activeOpen, { sprintId: 'cowork-demo', closedAt: '2026-07-30', findings: [] });
  assert.match(out, /- находок незакрытости нет/u);
});

test('детерминизм: дата — параметр, один вход даёт бит-в-бит один выход', () => {
  const p = { sprintId: 'cowork-demo', closedAt: '2026-07-30', findings: [] };
  assert.equal(renderClosedActive(activeOpen, p), renderClosedActive(activeOpen, p));
});
