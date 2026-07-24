/**
 * Cowork Phase 4 · интеграционный smoke (склейка трёх блоков адаптером по INTERFACE_CONTRACT).
 * Литеральные гранулы; fn-гранулы (динамическая загрузка модуля) — хвост Phase 4.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { valid } from './strategic-docs-model.mjs';
import { buildGranuleIndex, integratedGenerate, syncGranule } from './strategic-docs-integration.mjs';

// Гранулы несут и bodyPath (ждёт canon-data.valid), и body (ждёт generate) — реконсайл стыка.
const granules = [
  { id: 'g.intro', version: '1.0.0', kind: 'literal', body: 'Intro body', bodyPath: './g.intro.md' },
  { id: 'g.policy', version: '2.0.0', kind: 'literal', body: 'Policy body', bodyPath: './g.policy.md' },
];

const validTpl = {
  id: 'tpl-1',
  version: '1.0.0',
  skeleton: '# Doc\n\n{{intro}}\n\n{{policy}}\n',
  slots: [
    { granuleId: 'g.intro', pin: '1.0.0', version: '1.0.0', placeholder: '{{intro}}' },
    { granuleId: 'g.policy', pin: '2.0.0', version: '2.0.0', placeholder: '{{policy}}' },
  ],
};

test('стык примирён: индекс несёт и .get (canon-data), и .resolve (generate)', () => {
  const idx = buildGranuleIndex(granules);
  assert.ok(idx.get('g.intro@1.0.0'), 'get(key) — интерфейс canon-data');
  assert.ok(idx.resolve('g.intro', '1.0.0'), 'resolve(id,version) — интерфейс generate');
  assert.equal(idx.size, 2);
});

test('РЕАЛЬНЫЙ canon-data.valid проходит на примирённом шаблоне+индексе', () => {
  const idx = buildGranuleIndex(granules);
  const r = valid(validTpl, idx);
  assert.equal(r.ok, true, JSON.stringify(r.reasons));
});

test('integratedGenerate: валидный шаблон → release ЧЕРЕЗ реальный valid', async () => {
  const res = await integratedGenerate(validTpl, granules);
  assert.equal(res.route, 'release');
});

test('integratedGenerate: valid-невалидный (битый пин) → experiment (карантин)', async () => {
  // generate резолвит гранулу по version (1.0.0) и строит тело, но реальный canon-data.valid
  // отвергает шаблон из-за не-semver пина → маршрут в experiments (карантин). generate НЕ бросает.
  // (Прим.: valid при ОТСУТСТВИИ skeleton падает TypeError — баг canon-data, вынесен в RETROSPECTIVE;
  //  здесь используем невалидность, которую valid отдаёт как {ok:false}, а не как краш.)
  const invalidTpl = {
    ...validTpl,
    id: 'tpl-inv',
    slots: [{ granuleId: 'g.intro', pin: 'not-semver', version: '1.0.0', placeholder: '{{intro}}' }],
    skeleton: '# Doc\n\n{{intro}}\n',
  };
  const res = await integratedGenerate(invalidTpl, granules);
  assert.equal(res.route, 'experiment');
});

test('canon-data.syncGranule распространяет правку гранулы по релизам (моат)', () => {
  const releases = [
    { id: 'r1', pins: { 'g.intro': '1.0.0' }, body: '<!-- granule:g.intro@1.0.0 -->old<!-- /granule -->' },
    { id: 'r2', pins: { 'g.intro': '1.0.0' }, body: '<!-- granule:g.intro@1.0.0 -->old<!-- /granule -->' },
  ];
  const { updated, skipped } = syncGranule({
    granuleId: 'g.intro',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    newBody: 'new canon',
    releases,
  });
  assert.equal(skipped.length, 0);
  assert.equal(updated.length, 2);
});
