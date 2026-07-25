#!/usr/bin/env node
/**
 * yarn strategic-docs:generate [--template readme-main] [--dry-run]
 *
 * Сборка релиза из шаблона + pinned гранул контейнера strategic-docs.
 * Валидный шаблон → docs/containers/strategic-docs/releases/<templateId>/
 * Невалидный → docs/containers/strategic-docs/experiments/<templateId>/
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './lib/strategic-docs-model.mjs';
import { buildGranuleIndex, integratedGenerate } from './lib/strategic-docs-integration.mjs';
import { loadGranules, loadTemplate, CONTAINER_ROOT } from './lib/strategic-docs-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

const templateId = arg('--template', 'readme-main');
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const template = await loadTemplate(templateId);
  const granules = await loadGranules();
  const index = buildGranuleIndex(granules);

  const validation = valid(template, index);
  if (!validation.ok) {
    console.error('valid(template): FAIL');
    for (const r of validation.reasons) console.error(`  - ${r}`);
  } else {
    console.log('valid(template): OK');
  }

  const result = await integratedGenerate(template, granules, {
    renderBody: (parts) => parts.join('\n\n'),
  });

  const zone = result.route === 'release' ? 'releases' : 'experiments';
  const outDir = path.join(CONTAINER_ROOT, zone, templateId);

  console.log(`route: ${result.route}`);
  console.log(`output: ${path.relative(path.join(__dirname, '..'), outDir)}`);

  if (dryRun) {
    console.log('dry-run — файлы не записаны');
    process.exitCode = validation.ok ? 0 : 1;
    return;
  }

  await fs.mkdir(outDir, { recursive: true });

  const pins = Object.fromEntries(
    template.slots.map((s) => [s.granuleId, s.pin])
  );

  const manifest = {
    releaseId: templateId,
    version: template.version,
    templateId: template.id,
    templateVersion: template.version,
    title: 'Membrana README',
    target: template.target,
    pins,
    status: result.route,
    bodyPath: './README.md',
    generatedAt: new Date().toISOString(),
    trace: result.trace,
  };

  await fs.writeFile(path.join(outDir, 'README.md'), result.body, 'utf8');
  await fs.writeFile(path.join(outDir, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  process.exitCode = validation.ok && result.route === 'release' ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
