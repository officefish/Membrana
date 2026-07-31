/**
 * Зубы рендера атласа: команды, три вида записи, проекция неймспейсов (§3).
 *
 * Прогон: `node --test scripts/atlas-render.test.mjs`
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  auditContainers,
  discoverContainers,
  renderAtlasRegistry,
  renderMintlifyPage,
} from './lib/tooling-atlas.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ns = (over = {}) => ({
  id: 'ritual',
  title: 'Ритуальный контур',
  holder: 'angelina',
  membership: { kind: 'namePrefix', value: 'ritual-' },
  containerKind: 'plain',
  ...over,
});

// ── Команды вместо имён ───────────────────────────────────────────────────────────────────

test('входной глагол — КОМАНДА, а не имя ключа', () => {
  const scripts = discoverContainers(repoRoot).find((c) => c.home === 'scripts');
  assert.ok(scripts, 'дом scripts обязан быть в индексе');
  assert.match(scripts.entryCommand, /^yarn /u, 'ключ `audit` командой не является');
  assert.equal(scripts.commands.audit, 'yarn scripts:orphans');
  // Печатать ключ значит предлагать вызов, которого не существует — тот же дефект, что пол
  // сессии поймал у себя 31.07.
  assert.notEqual(scripts.entryCommand, 'audit');
});

test('индекс печатает команду в своей колонке', () => {
  const md = renderAtlasRegistry(discoverContainers(repoRoot));
  assert.match(md, /\| Входной глагол \|/u);
  assert.match(md, /`yarn scripts:orphans`/u);
});

test('дом без манифеста входного глагола не выдумывает', () => {
  const home = discoverContainers(repoRoot).find((c) => c.kind !== 'workshop');
  assert.ok(home, 'домов без мастерской обязано быть больше нуля');
  assert.equal(home.entryCommand, null);
  assert.deepEqual(home.commands, {});
  assert.deepEqual(home.missingVerbs, [], 'у дома без мастерской глаголы не «отсутствуют» — их не обещали');
});

// ── Три вида записи в выдаче ──────────────────────────────────────────────────────────────

test('дома без мастерской идут своей секцией, а не в таблице мастерских', () => {
  const containers = discoverContainers(repoRoot);
  const md = renderAtlasRegistry(containers);
  assert.match(md, /## Дома без мастерской/u);
  assert.match(md, /законное состояние/u);
  // В таблицах плоскостей их быть не должно: там колонка глаголов, которых у них нет.
  const planeTables = md.split('## Дома без мастерской')[0];
  const home = containers.find((c) => c.kind !== 'workshop');
  assert.ok(!planeTables.includes(`(../../../${home.home}/README.md)`), `${home.home} не место среди мастерских`);
});

test('шапка называет истинный источник обнаружения', () => {
  const md = renderAtlasRegistry(discoverContainers(repoRoot));
  // Прежняя шапка говорила «docs/**/workshop.manifest.json» и врала дважды: обнаружение шло
  // по манифесту вопреки §3, а после двухклассовой RootPolicy область шире docs/**.
  assert.match(md, /Обнаружение: `README\.md` \+ `RootPolicy`/u);
  assert.doesNotMatch(md.split('\n')[2], /Source: docs\/\*\*/u);
});

test('счётчики разведены: домов, мастерских, домов без мастерской', () => {
  const containers = discoverContainers(repoRoot);
  const md = renderAtlasRegistry(containers);
  const workshops = containers.filter((c) => c.kind === 'workshop').length;
  assert.match(md, new RegExp(`Домов: \\*\\*${containers.length}\\*\\*`, 'u'));
  assert.match(md, new RegExp(`мастерских: \\*\\*${workshops}\\*\\*`, 'u'));
  assert.match(md, new RegExp(`домов без мастерской: \\*\\*${containers.length - workshops}\\*\\*`, 'u'));
});

// ── Проекция неймспейсов ──────────────────────────────────────────────────────────────────

test('пустой реестр печатается словами, а не пустой таблицей', () => {
  const md = renderAtlasRegistry(discoverContainers(repoRoot));
  assert.match(md, /## Неймспейсы \(проекция реестра\)/u);
  assert.match(md, /Правил членства \*\*ноль\*\*/u);
  assert.match(md, /НЕ значит «всё припарковано»/u, '§1: сиротство — честный исход');
});

test('непустой реестр даёт таблицу с держателем и правилом', () => {
  const md = renderAtlasRegistry(discoverContainers(repoRoot), { namespaces: [ns(), ns({ id: 'night', holder: '#1467' })] });
  assert.match(md, /\| ritual \| angelina \| namePrefix: `ritual-` \| plain \|/u);
  assert.match(md, /\| night \| #1467 \|/u);
  // Источник истины назван, чтобы «строка ATLAS» не читалась как членство.
  assert.match(md, /Источник истины — \[`docs\/namespaces\/REGISTRY\.json`\]/u);
});

// ── Соседние глаголы не сломаны ───────────────────────────────────────────────────────────

test('audit считает здоровье ТОЛЬКО по мастерским', () => {
  const a = auditContainers(repoRoot);
  assert.equal(a.rows.length, 13, 'в строках здоровья только мастерские');
  assert.ok(a.homesWithoutWorkshop >= 25, 'дома без мастерской посчитаны отдельно, а не забыты');
  // Зачесть тридцать домов в «здоровые» значило бы раздуть числитель теми, кого валидатор
  // в глаза не видел.
  assert.equal(a.healthy + a.warned + a.broken, a.rows.length);
});

test('витрина показывает мастерские и НЕ молчит о домах', () => {
  const containers = discoverContainers(repoRoot);
  const mdx = renderMintlifyPage(containers);
  assert.match(mdx, /Входной глагол: `yarn/u);
  assert.match(mdx, /## Дома без мастерской/u);
  const homes = containers.filter((c) => c.kind !== 'workshop').length;
  assert.match(mdx, new RegExp(`\\*\\*${homes}\\*\\* домов`, 'u'));
});

test('рендер идемпотентен — дрейф ловит содержание, не порядок', () => {
  const containers = discoverContainers(repoRoot);
  assert.equal(renderAtlasRegistry(containers, { namespaces: [ns()] }), renderAtlasRegistry(containers, { namespaces: [ns()] }));
  assert.equal(renderMintlifyPage(containers), renderMintlifyPage(containers));
});
