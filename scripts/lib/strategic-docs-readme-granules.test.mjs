import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { valid } from './strategic-docs-model.mjs';
import { buildGranuleIndex, integratedGenerate } from './strategic-docs-integration.mjs';
import { loadGranules, loadTemplate } from './strategic-docs-loader.mjs';
import { pureIoThrow } from './strategic-docs-generate.mjs';

const granulesDir = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../docs/containers/strategic-docs/granules'
);

describe('readme-main granules', () => {
  it('valid(template): all 12 slots resolve @1.0.0', async () => {
    const template = await loadTemplate('readme-main');
    const granules = await loadGranules(granulesDir);
    const index = buildGranuleIndex(granules);

    // Контейнер общий: рядом живут гранулы других шаблонов (tasks-readme, #1201),
    // поэтому считаем не все гранулы, а покрытие слотов readme-main.
    assert.equal(template.slots.length, 12);
    for (const slot of template.slots) {
      assert.ok(index.get(`${slot.granuleId}@${slot.pin}`), `нет гранулы ${slot.granuleId}@${slot.pin}`);
    }

    const result = valid(template, index);
    assert.equal(result.ok, true, JSON.stringify(result.reasons));
  });

  it('integratedGenerate(readme-main) → release', async () => {
    const template = await loadTemplate('readme-main');
    const granules = await loadGranules(granulesDir);
    const result = await integratedGenerate(template, granules, {
      renderBody: (parts) => parts.join('\n\n'),
    });

    assert.equal(result.route, 'release');
    assert.ok(result.body.includes('# Membrana'));
    assert.ok(result.body.includes('## Архитектура'));
    assert.ok(result.body.includes('### Фоновые серверы'));
    assert.ok(result.body.includes('## Структура пакетов'));
  });
});

describe('function granule render.mjs', () => {
  it('renderBackgroundServersTable — pure table from README canon', async () => {
    const mod = await import(
      pathToFileURL(
        path.join(granulesDir, 'readme-background-servers-table/render.mjs')
      ).href
    );
    const { body } = await mod.renderBackgroundServersTable({ pin: {} }, pureIoThrow);

    assert.match(body, /### Фоновые серверы/);
    assert.match(body, /\| office  \| `yarn office:dev` \| 3000 \|/);
    assert.match(body, /\| media  \|/);
    assert.match(body, /\| cabinet  \|/);
    assert.match(body, /BACKGROUND_SERVERS\.md/);
  });

  it('renderPackageLayersTable — pure table from README canon', async () => {
    const mod = await import(
      pathToFileURL(path.join(granulesDir, 'readme-package-layers-table/render.mjs')).href
    );
    const { body } = await mod.renderPackageLayersTable({ pin: {} }, pureIoThrow);

    assert.match(body, /## Структура пакетов/);
    assert.match(body, /\| \*\*Core\*\*/);
    assert.match(body, /@membrana\/core/);
    assert.match(body, /background-office/);
    assert.match(body, /@membrana\/client/);
  });
});
