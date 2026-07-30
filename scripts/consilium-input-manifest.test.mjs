/**
 * Зуб манифеста входа (п.5 топ-10 30.07).
 *
 * ВЕЩДОК 29.07: комната дважды сочинила утверждение о своём входе — «M0 ратифицирован»
 * и «бриф не передан» при доехавшем брифе. Проверить было нечем: шапка несла путь и
 * только путь. Здесь проверяется ровно то, чего не хватало, — различение
 * «доехало целиком / обрезано / не доехало вовсе».
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  DELIVERY_STATES,
  manifestHasLoss,
  partOffsets,
  renderInputManifest,
  resolveDelivery,
  resolveManifest,
} from './lib/consilium-input-manifest.mjs';

test('смещения считаются той же арифметикой, что и join(\\n)', () => {
  const parts = ['абв', '', 'дежз'];
  const off = partOffsets(parts);
  assert.deepEqual(off, [0, 4, 5]);
  // Сверка с реальностью: срез по смещению должен дать саму часть.
  const joined = parts.join('\n');
  assert.equal(joined.slice(off[2], off[2] + parts[2].length), 'дежз');
});

test('сборка не резалась — вход доехал полностью', () => {
  assert.equal(resolveDelivery({ start: 0, chars: 100 }, null), 'полностью');
});

test('ВЕЩДОК: вход целиком за границей обрезки — «не доехал», а не «полностью»', () => {
  // Повестка стоит в хвосте сборки; потолок отрезал её первой, и это выглядело как
  // «бриф не передан» — неотличимо от вранья комнаты.
  assert.equal(resolveDelivery({ start: 95_000, chars: 5_000 }, 95_000), 'не доехал');
});

test('вход, задетый границей, — «обрезан», не «не доехал»', () => {
  assert.equal(resolveDelivery({ start: 94_000, chars: 5_000 }, 95_000), 'обрезан');
});

test('обрезка по СВОЕМУ потолку тоже «обрезан», даже когда сборка целая', () => {
  assert.equal(resolveDelivery({ start: 0, chars: 12_000, truncatedOwn: true }, null), 'обрезан');
});

test('resolveManifest режет только когда сборка реально превысила потолок', () => {
  const recs = [{ kind: 'повестка', path: 'a.md', chars: 10, start: 90 }];
  assert.equal(resolveManifest(recs, { assembledChars: 100, limit: 95 })[0].delivery, 'обрезан');
  assert.equal(resolveManifest(recs, { assembledChars: 95, limit: 95 })[0].delivery, 'полностью');
});

test('манифест видит потерю и молчит, когда всё цело', () => {
  assert.equal(manifestHasLoss([{ delivery: 'полностью' }]), false);
  assert.equal(manifestHasLoss([{ delivery: 'полностью' }, { delivery: 'не доехал' }]), true);
  assert.equal(manifestHasLoss([{ delivery: 'обрезан' }]), true);
});

test('исходы доставки — закрытый словарь', () => {
  const seen = [
    resolveDelivery({ start: 0, chars: 1 }, null),
    resolveDelivery({ start: 0, chars: 1, truncatedOwn: true }, null),
    resolveDelivery({ start: 10, chars: 1 }, 5),
    resolveDelivery({ start: 4, chars: 10 }, 5),
  ];
  for (const s of seen) assert.ok(DELIVERY_STATES.includes(s), `${s} вне словаря`);
});

test('потеря в таблице выделена и несёт предупреждение', () => {
  const md = renderInputManifest([
    { kind: 'повестка', path: 'a.md', chars: 5, delivery: 'не доехал' },
    { kind: 'контекст', path: 'b.md', chars: 5, delivery: 'полностью' },
  ]).join('\n');
  assert.match(md, /\*\*не доехал\*\*/u, 'потеря обязана быть заметной');
  assert.match(md, /сверять с этой таблицей/u);
  assert.doesNotMatch(md, /\*\*полностью\*\*/u, 'целое не выделяем — иначе выделение ничего не значит');
});

test('пустой манифест — честная строка, а не отсутствие раздела', () => {
  // Нет раздела читается как «входа не было»; нужно «нечем подтвердить».
  const md = renderInputManifest([]).join('\n');
  assert.match(md, /не собран/u);
  assert.doesNotMatch(md, /\| Вход \|/u);
  assert.deepEqual(renderInputManifest(null), renderInputManifest([]));
});

test('целый манифест предупреждения не несёт', () => {
  const md = renderInputManifest([{ kind: 'повестка', path: 'a.md', chars: 5, delivery: 'полностью' }]).join('\n');
  assert.doesNotMatch(md, /⚠/u);
});

// --- Сквозной инвариант: манифест описывает ЭТУ сборку ------------------------------------

test('манифест не расходится со сборкой: смещение указывает на сам текст входа', async () => {
  // Главная защита от возвращения дефекта: если однажды манифест начнут считать
  // повторным чтением файлов, этот срез перестанет совпадать.
  const { buildPrompt } = await import('./consilium.mjs');
  const { CONSILIUM_ROLES } = await import('./lib/consilium-paths.mjs');

  // Повестка с уникальным маркером: срез по смещению обязан дать ЕЁ, а не «что-то длиной N».
  const dir = mkdtempSync(join(tmpdir(), 'consilium-manifest-'));
  const agendaPath = join(dir, 'AGENDA.md');
  const marker = 'МАРКЕР-ПОВЕСТКИ-4f2a9c';
  const agendaText = `# Повестка\n\n${marker}\n\nтело повестки\n`;
  writeFileSync(agendaPath, agendaText, 'utf8');

  try {
    const { prompt, manifest, assembledChars, limit } = buildPrompt({
      question: 'проверочный вопрос манифеста входа?',
      topicFile: agendaPath,
      orderedRoles: CONSILIUM_ROLES,
      minReplies: 30,
    });

    assert.ok(manifest.length >= 2, 'инструкция и повестка обязаны попасть в манифест');
    const agenda = manifest.find((r) => r.kind === 'повестка');
    assert.ok(agenda, 'повестка обязана быть в манифесте');
    assert.equal(agenda.chars, agendaText.length);
    assert.equal(agenda.delivery, 'полностью');

    // Содержательная сверка: по смещению манифеста лежит ровно текст повестки.
    assert.equal(prompt.slice(agenda.start, agenda.start + agenda.chars), agendaText);
    assert.ok(prompt.includes(marker), 'повестка обязана быть в собранном промпте');

    assert.equal(limit > 0, true);
    assert.equal(typeof assembledChars, 'number');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('вход без повестки не выдумывает её в манифесте', async () => {
  const { buildPrompt } = await import('./consilium.mjs');
  const { CONSILIUM_ROLES } = await import('./lib/consilium-paths.mjs');
  const { manifest } = buildPrompt({
    question: 'без повестки?',
    orderedRoles: CONSILIUM_ROLES,
    minReplies: 30,
    noContext: true,
  });
  assert.equal(manifest.some((r) => r.kind === 'повестка'), false);
  assert.equal(manifest.some((r) => String(r.kind).startsWith('контекст')), false);
});
