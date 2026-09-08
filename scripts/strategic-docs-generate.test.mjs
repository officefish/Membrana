/**
 * Зуб движка генерации strategic-docs: каркас шаблона — авторитет (#2331, b3 спринта
 * tariff-matrix-2331).
 *
 * Предмет — ЖИВЫЕ шаблоны и гранулы контейнера, не выдумка теста. Три утверждения:
 *  1. У шаблонов, чей каркас — одни плейсхолдеры, подстановка по каркасу даёт тот же текст,
 *     что прежняя склейка через пустую строку, с точностью до пустых строк (хвосты частей
 *     обрезаются) — то есть переключение движка их релизы по смыслу не меняет.
 *  2. У матрицы тарифов строки таблицы стоят вплотную к шапке (иначе markdown-таблица
 *     рассыпается) — порча «вернуть склейку parts.join('\n\n')» → красный.
 *  3. Сам скрипт генератора зовёт renderBySkeleton (структурная порча: вернуть join → красный).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { integratedGenerate } from './lib/strategic-docs-integration.mjs';
import { loadGranules, loadTemplate } from './lib/strategic-docs-loader.mjs';
import { renderBySkeleton } from './lib/tasks-readme-engine.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const granulesDir = path.join(here, '../docs/containers/strategic-docs/granules');
const joinLegacy = (parts) => parts.join('\n\n');
const squashBlank = (s) => s.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n\n').trim();

const PLACEHOLDER_ONLY = ['readme-main', 'development-matrix', 'affine-surface-policy'];

describe('strategic-docs-generate: каркас шаблона — авторитет', () => {
  for (const id of PLACEHOLDER_ONLY) {
    it(`${id}: каркас из одних плейсхолдеров → подстановка ≡ склейка (с точностью до пустых строк)`, async () => {
      const template = await loadTemplate(id);
      const granules = await loadGranules(granulesDir);
      const literal = template.skeleton.replace(/\{\{[^}]+\}\}/g, '').replace(/\s/g, '');
      assert.equal(literal, '', `${id}: каркас несёт литералы — утверждение 1 к нему не относится`);
      const bySkeleton = await integratedGenerate(template, granules, { renderBody: renderBySkeleton(template) });
      const byJoin = await integratedGenerate(template, granules, { renderBody: joinLegacy });
      assert.equal(bySkeleton.route, 'release');
      assert.equal(squashBlank(bySkeleton.body), squashBlank(byJoin.body));
    });
  }

  it('tariff-matrix: строки таблицы вплотную к шапке; склейка через пустую строку — красный', async () => {
    const template = await loadTemplate('tariff-matrix');
    const granules = await loadGranules(granulesDir);
    const bySkeleton = await integratedGenerate(template, granules, { renderBody: renderBySkeleton(template) });
    assert.equal(bySkeleton.route, 'release');
    const head = '| Ресурс | Датчик | Блокпост | Наблюдательный пункт |\n|---|---|---|---|\n| Буфер записи |';
    assert.ok(bySkeleton.body.includes(head), 'шапка и первая строка таблицы должны стоять вплотную');
    const rows = bySkeleton.body.split('\n').filter((l) => l.startsWith('| '));
    assert.ok(rows.length >= 13, `строк таблицы ${rows.length} — ожидалось ≥ 13 (шапка + 12 ресурсов)`);
    // порча: прежний движок
    const byJoin = await integratedGenerate(template, granules, { renderBody: joinLegacy });
    assert.ok(!byJoin.body.includes(head), 'склейка не должна давать вплотную стоящую таблицу — иначе зуб без предмета');
  });

  it('скрипт генератора зовёт renderBySkeleton, а не склейку (структурно)', () => {
    const src = readFileSync(path.join(here, 'strategic-docs-generate.mjs'), 'utf8');
    assert.match(src, /renderBody:\s*renderBySkeleton\(template\)/);
    assert.doesNotMatch(src, /renderBody:\s*\(parts\)\s*=>\s*parts\.join/);
  });
});
