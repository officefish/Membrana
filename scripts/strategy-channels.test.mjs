/**
 * Тесты IO-слоя каналов горизонта (#592, S4). Работают на фикстурах во временном
 * каталоге — на диск ходят, в сеть нет.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseFrontmatter,
  readInsightChannel,
  readResearchChannel,
  readHorizonChannels,
  readHorizonConfig,
  readTruthChannel,
  renderHorizonArtifact,
} from './lib/strategy-channels.mjs';
import { makeHorizon } from './lib/strategy-horizon.mjs';

function tmpRepo() {
  return mkdtempSync(join(tmpdir(), 'strat-ch-'));
}

test('parseFrontmatter: плоские пары ключ:значение, кавычки снимаются', () => {
  const fm = parseFrontmatter('---\ntopic: "дрон vs птица"\nmode: derived\nttl: 14\n---\n\nтело');
  assert.equal(fm.topic, 'дрон vs птица');
  assert.equal(fm.mode, 'derived');
  assert.equal(fm.ttl, '14');
});

test('parseFrontmatter: нет фронтматтера → пустой объект', () => {
  assert.deepEqual(parseFrontmatter('просто текст'), {});
});

test('readInsightChannel: отсутствие файла → null (мёртвый канал), не пустой массив', () => {
  const repo = tmpRepo();
  try {
    assert.equal(readInsightChannel(repo), null);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readInsightChannel: фильтрует archived/revoked', () => {
  const repo = tmpRepo();
  try {
    mkdirSync(join(repo, 'docs/insights'), { recursive: true });
    writeFileSync(
      join(repo, 'docs/insights/registry.json'),
      JSON.stringify({
        insights: [
          { id: 'a', status: 'adopted' },
          { id: 'b', status: 'archived' },
          { id: 'c', status: 'revoked' },
        ],
      }),
    );
    const list = readInsightChannel(repo);
    assert.deepEqual(list.map((i) => i.id), ['a']);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readResearchChannel: нет каталога → null (канал ещё не рождён)', () => {
  const repo = tmpRepo();
  try {
    assert.equal(readResearchChannel(repo), null);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readResearchChannel: парсит фронтматтер + производные slug/date из имени', () => {
  const repo = tmpRepo();
  try {
    mkdirSync(join(repo, 'docs/research/night'), { recursive: true });
    writeFileSync(
      join(repo, 'docs/research/night/2026-07-17-drone-vs-bird.md'),
      '---\ntopic: дрон против птицы\nmode: derived\norigin: crystal-pair-x\nstatus: void\nttl: 14\n---\n\nтело',
    );
    const list = readResearchChannel(repo);
    assert.equal(list.length, 1);
    assert.equal(list[0].slug, 'drone-vs-bird');
    assert.equal(list[0].date, '2026-07-17');
    assert.equal(list[0].topic, 'дрон против птицы');
    assert.equal(list[0].origin, 'crystal-pair-x');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readHorizonChannels: флаги — параметры (S4), выключенный канал = undefined', () => {
  const repo = tmpRepo();
  try {
    const ch = readHorizonChannels(repo, { includeInsights: false, includeResearch: false });
    assert.equal(ch.insights, undefined);
    assert.equal(ch.research, undefined);
    // По умолчанию включены → отсутствующие файлы дают null (мёртвый канал).
    const ch2 = readHorizonChannels(repo);
    assert.equal(ch2.insights, null);
    assert.equal(ch2.research, null);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readHorizonConfig: нет файла → null (веху не выдумываем)', () => {
  const repo = tmpRepo();
  try {
    assert.equal(readHorizonConfig(repo), null);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('readTruthChannel: активные кристаллы, onlyOwner фильтрует класс (S7)', () => {
  const repo = tmpRepo();
  try {
    assert.equal(readTruthChannel(repo), null); // нет файла → мёртвый канал
    mkdirSync(join(repo, 'docs/truth'), { recursive: true });
    writeFileSync(
      join(repo, 'docs/truth/registry.json'),
      JSON.stringify({
        tokens: [
          { id: 'o1', class: 'owner', status: 'active', claim: 'слово владельца' },
          { id: 'd1', class: 'derived', status: 'active', claim: 'вывод' },
          { id: 'r1', class: 'owner', status: 'revoked', claim: 'отозван' },
        ],
      }),
    );
    assert.equal(readTruthChannel(repo).length, 2); // revoked исключён
    const owner = readTruthChannel(repo, { onlyOwner: true });
    assert.deepEqual(owner.map((t) => t.id), ['o1']);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('renderHorizonArtifact: посылки графа правды печатаются (S7)', () => {
  const horizon = makeHorizon({ gate: 'g', phase: 'mid', criteria: ['c1'] });
  const md = renderHorizonArtifact(
    horizon,
    {
      highlights: [],
      provenance: [{ channel: 'insight', present: true, count: 0 }],
      premises: [
        { id: 'o1', class: 'owner', claim: 'исследования ночью, осмысление утром' },
        { id: 'd1', class: 'derived', claim: 'вывод из пары' },
      ],
    },
  );
  assert.match(md, /Посылки горизонта \(граф правды\)/u);
  assert.match(md, /🪨 `o1`.*исследования ночью/u);
  assert.match(md, /owner: 1, derived: 1/u);
});

test('renderHorizonArtifact: мёртвый канал печатается видимо (⚠️), не молчит', () => {
  const horizon = makeHorizon({ gate: 'g', phase: 'mid', criteria: ['c1'] });
  const md = renderHorizonArtifact(horizon, {
    highlights: [
      { kind: 'insight', ref: 'x', title: 'X', timely: true, stale: false, staleBadge: null, reflections: 1 },
      { kind: 'insight', ref: 'y', title: 'Y', timely: false, stale: true, staleBadge: '2026-06-01', reflections: 3 },
    ],
    provenance: [
      { channel: 'insight', present: true, count: 2 },
      { channel: 'research', present: false, note: 'канал мёртв: вход отсутствует (null)' },
    ],
  });
  assert.match(md, /⚠️.*research.*канал мёртв/u);
  assert.match(md, /Своевременные/u);
  assert.match(md, /stale · 2026-06-01/u);
  assert.match(md, /×3/u); // эхо-счётчик виден
  assert.match(md, /assign.*операция реестра/u); // граница Q1 напечатана
});
