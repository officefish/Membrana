import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkWorkflowDocs,
  loadWorkflowDocsModel,
  readDigest,
  renderProceduresCatalog,
  renderWorkshopsCatalog,
} from './lib/mintlify-workflow-docs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('workflow model follows every live workshop and procedure', () => {
  const model = loadWorkflowDocsModel(repoRoot);
  const workshopsPage = renderWorkshopsCatalog(model.workshops);
  const proceduresPage = renderProceduresCatalog(model.procedures);

  assert.ok(model.workshops.length > 0);
  assert.ok(model.procedures.length > 0);
  for (const workshop of model.workshops) assert.match(workshopsPage, new RegExp(workshop.home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const procedure of model.procedures) assert.match(proceduresPage, new RegExp(procedure.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('generated workflow catalogs are in sync', () => {
  assert.deepEqual(checkWorkflowDocs(repoRoot), []);
});

test('README digest reads a whole prose paragraph', () => {
  const root = mkdtempSync(join(tmpdir(), 'workflow-digest-'));
  const path = join(root, 'README.md');
  writeFileSync(path, '# Дом\n\nПервая строка длинного\nабзаца не обрывается.\n\n## Дальше\n', 'utf8');
  assert.deepEqual(readDigest(path), { title: 'Дом', summary: 'Первая строка длинного абзаца не обрывается.' });
});

test('workshop model uses the paragraph digest, not its first physical line', () => {
  const model = loadWorkflowDocsModel(repoRoot);
  const strategic = model.workshops.find((item) => item.home === 'docs/containers/strategic-docs');
  assert.equal(
    strategic?.summary,
    'Дом генеративных стратегических документов: гранулы и шаблоны собираются в проверяемые релизы, после чего могут быть опубликованы на разрешённую поверхность.',
  );
});

test('portfolio is not called a lived example without run evidence', () => {
  const page = renderProceduresCatalog([{
    id: 'adr',
    procedureKind: 'решение',
    holder: 'vesnin',
    buildState: 'built-valid',
    migrationState: 'migrated',
    portfolio: { count: 2, items: [
      { id: 'catalog', kind: 'catalog', path: 'docs/adr/README.md' },
      { id: 'template', kind: 'template', path: 'docs/adr/ADR_TEMPLATE.md' },
    ] },
    manifest: { mode: 'local', frames: [] },
  }]);
  assert.match(page, /Носители портфолио/u);
  assert.match(page, /прожитого примера в нём нет/u);
  assert.doesNotMatch(page, /\*\*Прожитые примеры\*\*/u);
});

test('strategic-docs entry keeps the frozen publish warning visible', () => {
  const source = readFileSync(join(repoRoot, 'docs', 'containers', 'strategic-docs', 'README.md'), 'utf8');
  assert.match(source, /Affine publish заморожен/u);
  assert.match(source, /--allow-affine-frozen-publish/u);
});

test('planned workshop verbs are not rendered as executable doors', () => {
  const page = renderWorkshopsCatalog([{
    name: 'tasks',
    home: 'docs/tasks',
    worksOn: 'docs/tasks/registry.json',
    plane: 'domain',
    role: 'primary',
    valid: true,
    warnings: [],
    verbs: ['inspectElement'],
    missingVerbs: ['audit', 'decompose'],
    commands: { board: 'planned: yarn task:board' },
  }]);
  assert.match(page, /план, не исполнимая дверь/u);
  assert.doesNotMatch(page, /\*\*board:\*\* `planned:/u);
});

test('null kit and domain intent without tool remain visible', () => {
  const page = renderWorkshopsCatalog([{
    name: 'strategic-docs',
    home: 'docs/containers/strategic-docs',
    worksOn: 'docs/containers/strategic-docs',
    plane: 'domain',
    role: null,
    kit: null,
    valid: true,
    warnings: ['audit = null'],
    verbs: [],
    missingVerbs: ['audit', 'decompose', 'inspectElement'],
    commands: {},
    domainTools: [{ name: 'generate', worksOn: 'docs/containers/strategic-docs', tool: null }],
  }]);
  assert.match(page, /`null` — отдельная поставка не заказана/u);
  assert.match(page, /Доменные намерения без команды/u);
  assert.match(page, /`generate`.*`tool` не объявлен/u);
});
