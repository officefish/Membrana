#!/usr/bin/env node
/**
 * Verify docs/catalog/client/registry.json matches registerClientModules.ts
 * and that every catalog prompt file exists.
 *
 * Usage: node scripts/verify-client-catalog.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const registryPath = resolve(root, 'docs/catalog/client/registry.json');
const registerPath = resolve(root, 'apps/client/src/modules/registerClientModules.ts');

function fail(message) {
  console.error(`catalog:verify-client — ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseModuleIds(source) {
  const ids = [];
  const re = /registerLazyModule\(\{[\s\S]*?id:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

function parsePluginRegistrations(source) {
  const byParent = new Map();
  const re = /registerPlugin\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const parent = m[1];
    byParent.set(parent, (byParent.get(parent) ?? 0) + 1);
  }
  return byParent;
}

const registry = readJson(registryPath);
const registerSource = readFileSync(registerPath, 'utf8');

const codeModuleIds = parseModuleIds(registerSource);
const codePluginsByParent = parsePluginRegistrations(registerSource);

const entries = registry.entries ?? [];
const modules = entries.filter((e) => e.kind === 'module');
const plugins = entries.filter((e) => e.kind === 'plugin');

const registryModuleIds = new Set(modules.map((m) => m.id));

for (const id of codeModuleIds) {
  if (!registryModuleIds.has(id)) {
    fail(`module "${id}" in registerClientModules.ts missing from catalog registry`);
  }
}

for (const mod of modules) {
  const registerId = mod.code?.registerId ?? mod.id;
  if (!codeModuleIds.includes(registerId)) {
    fail(`catalog module "${mod.id}" (registerId ${registerId}) not in registerClientModules.ts`);
  }
  if (!mod.promptPath || !existsSync(resolve(root, mod.promptPath))) {
    fail(`missing prompt file for module "${mod.id}": ${mod.promptPath}`);
  }
}

for (const plugin of plugins) {
  if (!plugin.promptPath || !existsSync(resolve(root, plugin.promptPath))) {
    fail(`missing prompt file for plugin "${plugin.id}": ${plugin.promptPath}`);
  }
  const parent = plugin.parentModuleId;
  if (!parent) {
    fail(`plugin "${plugin.id}" missing parentModuleId`);
  }
  const parentEntry = modules.find((m) => m.id === parent);
  if (!parentEntry) {
    fail(`plugin "${plugin.id}" parent "${parent}" not in registry modules`);
  }
  const listed = parentEntry.plugins ?? [];
  if (!listed.includes(plugin.id)) {
    fail(`plugin "${plugin.id}" not listed in module "${parent}".plugins`);
  }
}

for (const mod of modules) {
  const expectedPlugins = plugins.filter((p) => p.parentModuleId === mod.id);
  const listed = mod.plugins ?? [];
  if (listed.length !== expectedPlugins.length) {
    fail(
      `module "${mod.id}" plugins length ${listed.length} !== plugin entries ${expectedPlugins.length}`,
    );
  }
  const codeCount = codePluginsByParent.get(mod.id) ?? 0;
  if (codeCount !== expectedPlugins.length) {
    fail(
      `module "${mod.id}" registerPlugin count ${codeCount} !== catalog plugins ${expectedPlugins.length}`,
    );
  }
}

const registryPluginIds = new Set(plugins.map((p) => p.id));
if (registryPluginIds.size !== plugins.length) {
  fail('duplicate plugin ids in catalog registry');
}

if (process.exitCode === 1) {
  process.exit(1);
}

console.log(
  `catalog:verify-client OK — ${modules.length} modules, ${plugins.length} plugins, ${entries.length} entries`,
);
