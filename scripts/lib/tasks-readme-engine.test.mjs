/**
 * README реестра через движок стратегических документов (#1201).
 *
 * Проверяем три вещи, из-за которых стоял карантин синка:
 *  · гранулы детерминированны и чисты (без io не работают вовсе);
 *  · шаблон валиден, сборка уходит в маршрут release;
 *  · документ воспроизводим байт-в-байт — иначе гейт README↔registry нечем проверять.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './strategic-docs-model.mjs';
import { buildGranuleIndex } from './strategic-docs-integration.mjs';
import { loadGranules, loadTemplate } from './strategic-docs-loader.mjs';
import { pureIoThrow } from './strategic-docs-generate.mjs';
import {
  generateTasksReadme,
  makeRegistryIo,
  renderBySkeleton,
  TASKS_README_TEMPLATE_ID,
} from './tasks-readme-engine.mjs';
import { computeReadmeMatchesRegistry } from './task-validity.mjs';

const containerRoot = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../docs/containers/strategic-docs',
);
const granulesDir = path.join(containerRoot, 'granules');

const registry = {
  version: 1,
  tasks: [
    {
      id: 'active-two',
      title: 'Вторая активная',
      promptPath: 'docs/prompts/B_PROMPT.md',
      githubIssue: 42,
      size: 'M',
      status: 'active',
      createdAt: '2026-07-02',
      archivedAt: null,
      githubIssueClosedAt: null,
    },
    {
      id: 'active-one',
      title: 'Первая активная',
      promptPath: 'docs/prompts/A_PROMPT.md',
      githubIssue: null,
      size: 'S',
      status: 'active',
      createdAt: '2026-07-01',
      archivedAt: null,
    },
    {
      id: 'done-early',
      title: 'Закрыта раньше',
      promptPath: 'docs/prompts/C_PROMPT.md',
      githubIssue: 7,
      size: 'S',
      status: 'archived',
      createdAt: '2026-06-01',
      archivedAt: '2026-06-10',
      githubIssueClosedAt: '2026-06-11',
    },
    {
      id: 'done-late',
      title: 'Закрыта позже',
      promptPath: 'docs/prompts/D_PROMPT.md',
      githubIssue: 8,
      size: 'L',
      status: 'archived',
      createdAt: '2026-06-02',
      archivedAt: '2026-06-20',
      githubIssueClosedAt: null,
    },
  ],
};

describe('гранулы tasks-readme-*', () => {
  it('шаблон валиден: 4 слота резолвятся @1.0.0', async () => {
    const template = await loadTemplate(TASKS_README_TEMPLATE_ID);
    const granules = await loadGranules(granulesDir);
    const index = buildGranuleIndex(granules);

    assert.equal(template.slots.length, 4);
    const result = valid(template, index);
    assert.equal(result.ok, true, JSON.stringify(result.reasons));
  });

  it('fn-гранулы детерминированны: тот же реестр → те же строки', async () => {
    const granules = await loadGranules(granulesDir);
    const io = makeRegistryIo(registry);

    for (const id of ['tasks-readme-active-table', 'tasks-readme-archive-table']) {
      const g = granules.find((x) => x.id === id);
      assert.ok(g, `гранула ${id} не найдена`);
      const mod = await import(g.modulePath);
      const first = await mod[g.fn]({ pin: {}, ctx: {} }, io);
      const second = await mod[g.fn]({ pin: {}, ctx: {} }, io);
      assert.equal(first.body, second.body);
    }
  });

  it('порядок архива стабилен: свежие сверху по archivedAt', async () => {
    const granules = await loadGranules(granulesDir);
    const g = granules.find((x) => x.id === 'tasks-readme-archive-table');
    const mod = await import(g.modulePath);
    const { body } = await mod[g.fn]({ pin: {}, ctx: {} }, makeRegistryIo(registry));

    assert.ok(
      body.indexOf('done-late') < body.indexOf('done-early'),
      'позже архивированная задача должна идти выше',
    );
    assert.match(body, /#8 \(Issue открыт\)/u, 'незакрытый Issue помечен');
  });

  it('без io-адаптера fn-гранула не работает — чистота не на честном слове', async () => {
    const granules = await loadGranules(granulesDir);
    const g = granules.find((x) => x.id === 'tasks-readme-active-table');
    const mod = await import(g.modulePath);
    await assert.rejects(
      () => mod[g.fn]({ pin: {}, ctx: {} }, pureIoThrow),
      /I\/O is not allowed/u,
    );
  });

  it('io-адаптер отдаёт только реестр: чужая операция — отказ', async () => {
    const io = makeRegistryIo(registry);
    assert.equal(await io.exec({ op: 'loadRegistry' }), registry);
    await assert.rejects(() => io.exec({ op: 'readFile' }), /не разрешена/u);
  });
});

describe('renderBySkeleton', () => {
  it('скелет — авторитет порядка, а не порядок слотов', () => {
    const template = {
      skeleton: '{{b}}\n\n{{a}}',
      slots: [{ placeholder: '{{a}}' }, { placeholder: '{{b}}' }],
    };
    const out = renderBySkeleton(template)(['ПЕРВЫЙ', 'ВТОРОЙ']);
    assert.equal(out, 'ВТОРОЙ\n\nПЕРВЫЙ\n');
  });
});

describe('generateTasksReadme', () => {
  it('маршрут release, идемпотентно байт-в-байт', async () => {
    const first = await generateTasksReadme(registry);
    const second = await generateTasksReadme(registry);

    assert.equal(first.route, 'release', JSON.stringify(first.validation.reasons));
    assert.equal(first.body, second.body, 'два прогона разошлись — документ невоспроизводим');
  });

  it('в документе нет отметки времени — иначе идемпотентность мнимая', async () => {
    const { body } = await generateTasksReadme(registry);
    assert.doesNotMatch(body, /Файл обновлён автоматически/u);
    assert.doesNotMatch(body, /\b20\d{2}-\d{2}-\d{2}\b(?![^|]*\|)/u, 'дата вне табличных ячеек');
  });

  it('собранный README проходит computeReadmeMatchesRegistry', async () => {
    const { body } = await generateTasksReadme(registry);
    assert.equal(computeReadmeMatchesRegistry(registry.tasks, body), true);
  });

  it('секции на месте: шапка, активные, архив, как добавить', async () => {
    const { body } = await generateTasksReadme(registry);
    assert.match(body, /^# Реестр задач \(task prompts\)/u);
    assert.match(body, /## Активные задачи/u);
    assert.match(body, /## Архив/u);
    assert.match(body, /## Как добавить задачу/u);
    assert.match(body, /Правка руками запрещена/u, 'подпись о лицензии документа');
    assert.ok(body.endsWith('\n'));
  });

  it('пустой реестр: обе секции дают человекочитаемую заглушку', async () => {
    const { body, route } = await generateTasksReadme({ version: 1, tasks: [] });
    assert.equal(route, 'release');
    assert.match(body, /_Нет активных задач/u);
    assert.match(body, /_Архив пуст\._/u);
  });
});
