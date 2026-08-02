import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkWorkflowDocs,
  loadWorkflowDocsModel,
  readDigest,
  renderProcedurePage,
  renderWorkshopPage,
  renderWorkflowDocs,
} from './lib/mintlify-workflow-docs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('every live workshop and procedure gets one Harness page', () => {
  const model = loadWorkflowDocsModel(repoRoot);
  const outputs = renderWorkflowDocs(repoRoot);
  const workshopPages = Object.keys(outputs).filter((path) => /workshops\/(?!index)[^/]+\.mdx$/u.test(path));
  const procedurePages = Object.keys(outputs).filter((path) => /procedures\/(?!index)[^/]+\.mdx$/u.test(path));
  assert.equal(workshopPages.length, model.workshops.length);
  assert.equal(procedurePages.length, model.procedures.length);
  assert.equal(new Set(workshopPages).size, workshopPages.length);
  assert.equal(new Set(procedurePages).size, procedurePages.length);
});

test('generated workflow pages and navigation are in sync', () => {
  assert.deepEqual(checkWorkflowDocs(repoRoot), []);
});

test('README digest reads a whole prose paragraph', () => {
  const root = mkdtempSync(join(tmpdir(), 'workflow-digest-'));
  const path = join(root, 'README.md');
  writeFileSync(path, '# Дом\n\nПервая строка длинного\nабзаца не обрывается.\n\n## Дальше\n', 'utf8');
  assert.deepEqual(readDigest(path), { title: 'Дом', summary: 'Первая строка длинного абзаца не обрывается.' });
});

test('missing workshop examples are named as marathon debt', () => {
  const page = renderWorkshopPage({
    name: 'Мастерская', home: 'docs/example', worksOn: 'docs/example', plane: 'domain',
    valid: true, commands: {}, usage: null,
  });
  assert.match(page, /workflow-examples-marathon/u);
  assert.match(page, /Проверенного примера пока нет/u);
});

test('procedure portfolio is not called a lived example without run evidence', () => {
  const page = renderProcedurePage({
    id: 'adr', title: 'ADR', procedureKind: 'решение', holder: 'vesnin',
    buildState: 'built-valid', migrationState: 'migrated',
    portfolio: { items: [{ id: 'template', kind: 'template', path: 'docs/adr/ADR_TEMPLATE.md' }] },
    manifest: { frames: [], gates: { items: [] } },
  });
  assert.match(page, /нет прожитого примера/u);
  assert.match(page, /workflow-examples-marathon/u);
});

test('planned workshop commands are not presented as executable', () => {
  const page = renderWorkshopPage({
    name: 'Tasks', home: 'docs/tasks', worksOn: 'docs/tasks', plane: 'domain', valid: true,
    commands: { board: 'planned: yarn task:board' }, usage: {},
  });
  assert.match(page, /запланировано, но ещё не исполнимо/u);
  assert.doesNotMatch(page, /`planned:/u);
});

test('Harness navigation does not acquire Product groups', () => {
  const config = JSON.parse(renderWorkflowDocs(repoRoot)['apps/docs-harness/docs.json']);
  const text = JSON.stringify(config.navigation);
  assert.doesNotMatch(text, /Device Board|Тариф/u);
  assert.match(text, /Мастерские/u);
  assert.match(text, /Процедуры/u);
});
