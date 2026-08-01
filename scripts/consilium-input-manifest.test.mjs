/**
 * Зуб манифеста входа (п.5 топ-10 30.07).
 *
 * ВЕЩДОК 29.07: комната дважды сочинила утверждение о своём входе — «M0 ратифицирован»
 * и «бриф не передан» при доехавшем брифе. Проверить было нечем: шапка несла путь и
 * только путь. Здесь проверяется ровно то, чего не хватало, — различение
 * «доехало целиком / обрезано / не доехало вовсе».
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  DELIVERY_STATES,
  fingerprintOf,
  formatRunConditions,
  formatSize,
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

// --- Канон формата хендофа 30.07: путь, размер, число пунктов, отпечаток ------------------

test('отпечаток различает разные тексты и совпадает для одинаковых', () => {
  const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
  assert.equal(fingerprintOf('повестка A', sha), fingerprintOf('повестка A', sha));
  assert.notEqual(fingerprintOf('повестка A', sha), fingerprintOf('повестка B', sha));
  assert.equal(fingerprintOf('x', sha).length, 12, 'короткий, но различающий');
});

test('размер повестки несёт число пунктов, прочие входы — нет', () => {
  assert.equal(formatSize({ chars: 4068, items: 5 }), '4068 · 5 п.');
  assert.equal(formatSize({ chars: 4068, items: null }), '4068');
  assert.equal(formatSize({ chars: 4068 }), '4068');
});

test('таблица несёт отпечаток — путь и размер не отвечают «та ли версия»', () => {
  const md = renderInputManifest([
    { kind: 'повестка', path: 'a.md', chars: 4068, items: 5, fingerprint: 'ab12cd34ef56', delivery: 'полностью' },
  ]).join('\n');
  assert.match(md, /Отпечаток/u);
  assert.match(md, /`ab12cd34ef56`/u);
  assert.match(md, /4068 · 5 п\./u);
});

test('вход без отпечатка не притворяется проверенным', () => {
  const md = renderInputManifest([{ kind: 'x', path: null, chars: 1, delivery: 'полностью' }]).join('\n');
  assert.match(md, /`—`/u);
});

test('ВЕЩДОК 29.07: доставленный бриф 4068 симв. при потолке 12000 — «полностью», значит комната соврала', () => {
  // Хендоф 30.07 фиксирует цифры: бриф ПЕРЕДАН. Манифест обязан сказать «полностью» —
  // тогда «бриф не передан» в репликах становится опровержимым, а не спорным.
  const rec = { start: 40_000, chars: 4068, truncatedOwn: false };
  assert.equal(resolveDelivery(rec, null), 'полностью');
  assert.equal(manifestHasLoss([{ ...rec, delivery: resolveDelivery(rec, null) }]), false);
});

test('проводка счётчика пунктов: на живой повестке заседания items заполняется', async () => {
  const { buildPrompt } = await import('./consilium.mjs');
  const { CONSILIUM_ROLES } = await import('./lib/consilium-paths.mjs');
  const agenda = 'docs/meeting/sprint-honest-performers/M1_AGENDA.md';
  if (!existsSync(agenda)) return; // повестка могла уехать в архив — зуб не ломаем
  const { manifest } = buildPrompt({
    question: 'проводка счётчика?',
    topicFile: agenda,
    orderedRoles: CONSILIUM_ROLES,
    minReplies: 30,
    noContext: true,
  });
  const rec = manifest.find((r) => r.kind === 'повестка');
  assert.ok(rec.items >= 1, 'ID-метки повестки обязаны попасть в манифест числом');
  assert.match(formatSize(rec), /п\./u);
});

test('ВЕЩДОК 30.07 (M0 workshop-wires): повестка дублируется В ГОЛОВУ и доезжает', async () => {
  // Потолок сборки срезал повестку целиком (3630 симв., отпечаток fca72f8bea4c) — комната
  // честно отказалась ранжировать невиданное. Лечение то же, что для вопроса в 27.07.
  const { buildPrompt } = await import('./consilium.mjs');
  const { CONSILIUM_ROLES } = await import('./lib/consilium-paths.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'agenda-head-'));
  const f = join(dir, 'AGENDA.md');
  const marker = 'КАНДИДАТ-ОДИН-3f9b2c';
  writeFileSync(f, `# Повестка\n\n**P1 —** вопрос?\n\n1) ${marker}\n`, 'utf8');
  try {
    const { prompt, manifest } = buildPrompt({
      question: 'порядок?',
      topicFile: f,
      orderedRoles: CONSILIUM_ROLES,
      minReplies: 30,
      noContext: true,
    });
    const head = manifest.find((r) => r.kind === 'повестка (эхо в голове)');
    const tail = manifest.find((r) => r.kind === 'повестка');
    assert.ok(head, 'эхо повестки в голове обязано быть в манифесте');
    assert.ok(tail, 'хвостовое эхо сохраняется');
    assert.equal(head.fingerprint, tail.fingerprint, 'одна и та же повестка, один отпечаток');
    assert.equal(head.delivery, 'полностью');
    // Голова стоит раньше инструкции — значит обрезка хвоста её не унесёт.
    assert.ok(prompt.indexOf(marker) < prompt.indexOf('Инструкция консилиума'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Условия прогона в шапке протокола (01.08, карточка meeting-gates-teeth) ──────────
// Восемь прогонов заседания evening-review-predicate шли с --no-context --no-rag, и ни
// один протокол этого не нёс: условие правила 7 держалось прозой в контейнере.

test('formatRunConditions: пусто и не-объект → «по умолчанию», а не пустая строка', () => {
  assert.equal(formatRunConditions(undefined), 'по умолчанию');
  assert.equal(formatRunConditions(null), 'по умолчанию');
  assert.equal(formatRunConditions({}), 'по умолчанию');
  assert.equal(formatRunConditions('--no-rag'), 'по умолчанию');
});

test('formatRunConditions: печатаются только поднятые флаги', () => {
  assert.equal(formatRunConditions({ noContext: true, noRag: true }), '--no-context --no-rag');
  assert.equal(formatRunConditions({ noRag: true }), '--no-rag');
  assert.equal(formatRunConditions({ noContext: false, noRag: false }), 'по умолчанию');
});

test('formatRunConditions: числовые параметры несут значение, нечисло не печатается', () => {
  assert.equal(formatRunConditions({ minReplies: 30, seed: 7 }), '--min-replies 30 --seed 7');
  assert.equal(formatRunConditions({ minReplies: null, seed: undefined }), 'по умолчанию');
  assert.equal(formatRunConditions({ seed: 0 }), '--seed 0');
});

test('renderInputManifest без run: строки условий НЕТ — старый вызов не начинает врать', () => {
  const out = renderInputManifest([
    { kind: 'повестка', path: 'a.md', chars: 10, start: 0, delivery: 'полностью' },
  ]);
  assert.equal(out.some((l) => l.includes('Условия прогона')), false);
});

test('renderInputManifest с run: условия попадают в шапку', () => {
  const out = renderInputManifest(
    [{ kind: 'повестка', path: 'a.md', chars: 10, start: 0, delivery: 'полностью' }],
    { noContext: true, noRag: true },
  );
  assert.ok(out.some((l) => l.includes('**Условия прогона:**') && l.includes('--no-context --no-rag')));
});

test('пустой манифест с run: условия печатаются и там — они про прогон, не про входы', () => {
  const out = renderInputManifest([], { noRag: true });
  assert.ok(out[0].includes('манифест не собран'));
  assert.ok(out.some((l) => l.includes('--no-rag')));
});
