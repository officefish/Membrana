/**
 * Ключевое свойство для эксперимента с объёмом: перцентильная рамка от роста
 * выборки СХОДИТСЯ, объемлющая — РАЗБУХАЕТ.
 *
 * Если это не так, кривая «прогресс от объёма» не построится ни на каких
 * данных: у детектора не будет механизма, через который объём действует.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildClassTemplate,
  envelopeBounds,
  percentileBounds,
  std,
  templateWidth,
} from './lib/percentile-template.mjs';

/** Детерминированный генератор — воспроизводимость важнее «настоящей» случайности. */
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Сэмпл: траектория метрик вокруг центра с шумом и редкими выбросами. */
function makeSample(rng, { centroid = 3500, spread = 200, outlierChance = 0.05 } = {}) {
  return Array.from({ length: 10 }, () => {
    const isOutlier = rng() < outlierChance;
    const noise = (rng() - 0.5) * spread * (isOutlier ? 30 : 1);
    return { centroid: centroid + noise, flux: 0.08 + (rng() - 0.5) * 0.04, rms: 0.15 + (rng() - 0.5) * 0.06 };
  });
}

function corpus(n, seed = 42) {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => makeSample(rng));
}

test('envelope РАЗБУХАЕТ с ростом выборки — объём делает шаблон всеядным', () => {
  const widths = [10, 50, 200].map(
    (n) => templateWidth(buildClassTemplate(corpus(n), { key: 'DRONE', method: 'envelope' })),
  );
  assert.ok(widths[1] > widths[0], `50 сэмплов шире 10: ${widths[1]} > ${widths[0]}`);
  assert.ok(widths[2] > widths[1], `200 шире 50: ${widths[2]} > ${widths[1]}`);
});

test('перцентильная рамка НЕ разбухает — сходится к квантилям распределения', () => {
  const widths = [10, 50, 200].map(
    (n) => templateWidth(buildClassTemplate(corpus(n), { key: 'DRONE', method: 'percentile' })),
  );
  // Сходимость: разброс между объёмами мал относительно самой ширины.
  const spread = Math.max(...widths) - Math.min(...widths);
  assert.ok(
    spread < Math.min(...widths) * 0.5,
    `перцентильная ширина устойчива: разброс ${spread.toFixed(0)} против ширины ${Math.min(...widths).toFixed(0)}`,
  );
  // И она заведомо уже объемлющей на том же корпусе.
  const env = templateWidth(buildClassTemplate(corpus(200), { key: 'DRONE', method: 'envelope' }));
  assert.ok(widths[2] < env, `перцентильная ${widths[2].toFixed(0)} уже envelope ${env.toFixed(0)}`);
});

test('выбросы уводят envelope, но не трогают перцентили', () => {
  const clean = corpus(50);
  const dirty = [...clean, [{ centroid: 50_000, flux: 5, rms: 9 }]];

  const envClean = envelopeBounds(clean.map((t) => t.map((m) => m.centroid)));
  const envDirty = envelopeBounds(dirty.map((t) => t.map((m) => m.centroid)));
  assert.ok(envDirty.max > envClean.max * 5, 'один выброс раздувает envelope в разы');

  const pctClean = percentileBounds(clean.map((t) => t.map((m) => m.centroid)));
  const pctDirty = percentileBounds(dirty.map((t) => t.map((m) => m.centroid)));
  assert.ok(
    Math.abs(pctDirty.max - pctClean.max) < pctClean.max * 0.05,
    'перцентиль почти не сдвинулся',
  );
});

test('шаблон несёт метод и размер выборки — иначе кривую не прочитать', () => {
  const t = buildClassTemplate(corpus(30), { key: 'DRONE', method: 'percentile' });
  assert.equal(t.method, 'percentile');
  assert.equal(t.sampleCount, 30);
  assert.match(t.description, /30 сэмплов/);
  for (const metric of ['centroid', 'flux', 'rms']) {
    assert.ok(t.thresholds[metric].min < t.thresholds[metric].max, `границы ${metric} осмысленны`);
  }
});

test('ширина перцентильной рамки регулируется процентами', () => {
  const wide = buildClassTemplate(corpus(100), { key: 'D', lowPct: 1, highPct: 99 });
  const narrow = buildClassTemplate(corpus(100), { key: 'D', lowPct: 25, highPct: 75 });
  assert.ok(templateWidth(narrow) < templateWidth(wide), 'p25–p75 уже, чем p1–p99');
});

test('пустой вход не роняет сборку', () => {
  const t = buildClassTemplate([], { key: 'D' });
  assert.equal(t.sampleCount, 0);
  assert.deepEqual(t.thresholds, {});
  assert.equal(std([]), 0);
});
