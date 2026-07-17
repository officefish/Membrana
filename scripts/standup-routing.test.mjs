/**
 * Тесты роутинга стендапа (спринт standup-charge-redesign).
 *
 * DoD консилиума `standup-charge-2026-07-16`:
 *   • одинаковый реестр → одинаковый набор назначений (детерминизм);
 *   • пустой реестр → честный пустой стендап БЕЗ выдуманных задач;
 *   • task-id только из реестра (гейт, паттерн main-day-probe);
 *   • самооценка во вход не входит.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildStandupRouting,
  findInventedTaskIds,
  formatStandupRouting,
  formatStandupSection,
  lastMemoryDate,
  normalizePersona,
  parseRoleCompetencies,
  parseRoleSlugs,
  personaTasks,
  pickTaskForPersona,
} from './lib/standup-routing.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const VT = [
  '| Роль | Сильные стороны | Анти-паттерны |',
  '| **Teamlead** | Стратегия, границы модулей, LGTM | Лишний прикладной код |',
  '| **Математик** | FFT, вейвлеты, спектр — чистые функции | UI, Web Audio |',
  '',
  '| **Teamlead** | **Vesnin** (авангард) | `vesnin` | `vesnin` |',
  '| **Математик** | **Dynin** (мат. школа) | `dynin` | `dynin` |',
].join('\n');

const registry = {
  tasks: [
    { id: 'task-a', status: 'active', leadPersona: 'vesnin', supportPersonas: ['dynin'] },
    { id: 'task-b', status: 'active', leadPersona: 'dynin', supportPersonas: [] },
    { id: 'task-old', status: 'archived', leadPersona: 'vesnin', supportPersonas: [] },
    { id: 'task-c', status: 'active', leadPersona: 'musician', supportPersonas: [] },
  ],
};

// ─── канонизация: Музыкант живёт под двумя именами ────────────────────────────────

test('normalizePersona: role-key → slug (реестр держит и musician, и kuryokhin)', () => {
  // Живой факт 16.07: в реестре 9 активных задач с leadPersona=musician и 1 с
  // kuryokhin. Роутинг по одному имени молча потерял бы девять.
  assert.equal(normalizePersona('musician'), 'kuryokhin');
  assert.equal(normalizePersona('kuryokhin'), 'kuryokhin');
  assert.equal(normalizePersona('teamlead'), 'vesnin');
  assert.equal(normalizePersona('ozhegov'), 'ozhegov');
});

test('задачи Музыканта находятся под обоими именами', () => {
  const { lead } = personaTasks(registry, 'kuryokhin');
  assert.deepEqual(lead.map((t) => t.id), ['task-c'], 'musician-задача найдена по slug');
});

// ─── парсинг компетенций: второго реестра НЕ заводим ──────────────────────────────

test('parseRoleCompetencies берёт таблицу ролей, а не таблицу участников', () => {
  const comp = parseRoleCompetencies(VT);
  assert.deepEqual(comp.map((c) => c.role), ['Teamlead', 'Математик']);
  assert.match(comp[1].strengths, /FFT/u);
});

test('parseRoleSlugs связывает роль со slug', () => {
  assert.deepEqual(parseRoleSlugs(VT), { Teamlead: 'vesnin', Математик: 'dynin' });
});

test('живой VIRTUAL_TEAM_PROMPT парсится: ровно 5 ролей', () => {
  const vt = readFileSync(join(root, 'docs/VIRTUAL_TEAM_PROMPT.md'), 'utf8');
  assert.equal(parseRoleCompetencies(vt).length, 5, 'пять ролей команды');
  assert.equal(Object.keys(parseRoleSlugs(vt)).length >= 5, true);
});

// ─── детерминизм (DoD) ────────────────────────────────────────────────────────────

test('DoD: одинаковый реестр → одинаковый набор назначений', () => {
  const once = buildStandupRouting({ registry, virtualTeamMd: VT, memories: {} });
  const twice = buildStandupRouting({ registry, virtualTeamMd: VT, memories: {} });
  assert.deepEqual(once, twice, 'чистая функция, без случайности');
  assert.deepEqual(once.map((r) => r.taskId), ['task-a', 'task-b']);
});

test('lead важнее support; порядок реестра — тай-брейк', () => {
  const picked = pickTaskForPersona(registry, 'dynin');
  assert.equal(picked.task.id, 'task-b', 'где ведёт, а не где поддерживает');
  assert.equal(picked.assignment ?? picked.role, 'ведёт');
});

test('archived не попадает в роутинг — стендап смотрит вперёд', () => {
  const { lead } = personaTasks(registry, 'vesnin');
  assert.ok(!lead.some((t) => t.id === 'task-old'));
});

// ─── честное пустое состояние (DoD) ───────────────────────────────────────────────

test('DoD: пустой реестр → честный стендап БЕЗ выдуманных задач', () => {
  const routing = buildStandupRouting({ registry: { tasks: [] }, virtualTeamMd: VT, memories: {} });
  assert.ok(routing.every((r) => r.taskId === null), 'ни одной выдуманной задачи');
  const md = formatStandupRouting(routing);
  assert.match(md, /нет подходящей активной задачи/u, 'честная строка, не пропуск');
  assert.equal(findInventedTaskIds(routing, { tasks: [] }).length, 0);
});

// ─── гейт против выдуманных id (паттерн main-day-probe) ───────────────────────────

test('гейт ловит task-id вне реестра', () => {
  const fake = [{ taskId: 'never-existed', role: 'X', strengths: 'y', more: 0, provenance: null }];
  assert.deepEqual(findInventedTaskIds(fake, registry), ['never-existed']);
  assert.deepEqual(findInventedTaskIds([{ taskId: 'task-a' }], registry), [], 'реальный id проходит');
});

// ─── provenance ───────────────────────────────────────────────────────────────────

test('lastMemoryDate берёт САМУЮ позднюю запись журнала', () => {
  assert.equal(lastMemoryDate('### 2026-07-10\nx\n### 2026-07-14\ny'), '2026-07-14');
  assert.equal(lastMemoryDate('журнала нет'), null);
  assert.equal(lastMemoryDate(undefined), null);
});

// ─── формат: ссылка на норму, не копия ────────────────────────────────────────────

test('секция ССЫЛАЕТСЯ на норму, а не копирует её', () => {
  const md = formatStandupSection(buildStandupRouting({ registry, virtualTeamMd: VT, memories: {} }));
  assert.match(md, /STANDUP_NORMS\.md/u, 'ссылка есть');
  assert.match(md, /ссылается, не копирует/u);
  assert.doesNotMatch(md, /Честность — первая/u, 'тело нормы НЕ втянуто — иначе стена текста');
  assert.match(md, /вычислено из реестра, не моделью/u, 'происхождение честно названо');
});

test('самооценка не участвует: в выходе нет usefulness/оценок', () => {
  const md = formatStandupSection(buildStandupRouting({ registry, virtualTeamMd: VT, memories: {} }));
  assert.doesNotMatch(md, /usefulness|полезность дня|\d\/10/u);
  assert.match(md, /Самооценка полезности во вход НЕ входит/u, 'и это сказано явно');
});

// ─── регрессия: обрезка съедала ЗАДАНИЕ (пре­существовавший баг 16.07) ────────────

test('обрезка режет контекст, задание доживает до модели', async () => {
  const { assembleStandupPrompt } = await import('./_daily-standup.mjs');
  const assignment = '# Задание\nДай фокус дня.\nРоутинг персон — НЕ ПИШИ ЕГО.';
  const huge = 'x'.repeat(200_000);
  const out = assembleStandupPrompt({ context: huge, assignment, maxChars: 95_000 });
  assert.match(out, /# Задание/u, 'задание НЕ обрезано — иначе модель без инструкций');
  assert.match(out, /Роутинг персон — НЕ ПИШИ/u);
  assert.match(out, /контекст обрезан/u, 'обрезан именно контекст');
  // Строго ≤ бюджета: допуск маскировал ошибку в арифметике (проверено возвратом
  // бага — с `budget = maxChars` вместо `maxChars - assignment.length` тест был зелёным).
  assert.ok(out.length <= 95_000, `бюджет соблюдён строго, получено ${out.length}`);
});

test('короткий контекст не обрезается вовсе', () => {
  return import('./_daily-standup.mjs').then(({ assembleStandupPrompt }) => {
    const out = assembleStandupPrompt({ context: 'ctx', assignment: 'task', maxChars: 1000 });
    assert.equal(out, 'ctx\ntask');
    assert.doesNotMatch(out, /обрезан/u);
  });
});
