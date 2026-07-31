#!/usr/bin/env node
/**
 * yarn tooling:atlas — мастерская контейнера контейнеров (спринт tooling-atlas).
 *
 *   --audit                     инвентарь контейнеров + здоровье мастерских (зуб)
 *   --decompose [--by family|plane|holder|kit]   раскладка контейнеров (список = home)
 *   --inspect <home>            один контейнер вглубь
 *   --render                    пересобрать registry/ATLAS.md + mintlify-страницу
 *   --check                     производные не разъехались с источником (зуб для CI)
 *
 * Операции чтения идемпотентны. --audit роняет CI при битом контейнере;
 * --check роняет CI при дрейфе производных. Канон: docs/tooling-atlas/README.md.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeDrift, renderDrift } from './lib/atlas-drift.mjs';
import { discoverHomes } from './lib/atlas-discovery.mjs';
import { listWorkshopManifests } from './lib/validate-workshop.mjs';
import { REGISTRY_STATES, projectNamespaces, readRegistry } from './lib/namespace-registry.mjs';
import {
  auditContainers,
  decomposeContainers,
  discoverContainers,
  inspectContainer,
  renderAtlasRegistry,
  renderMintlifyPage,
} from './lib/tooling-atlas.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); const v = i >= 0 ? argv[i + 1] : null; return v && !v.startsWith('--') ? v : null; };

const REGISTRY = join(repoRoot, 'docs', 'tooling-atlas', 'registry', 'ATLAS.md');
// Dual-mintlify: public atlas page lives in harness workspace (not apps/docs).
const MINTLIFY = join(repoRoot, 'apps', 'docs-harness', 'tooling', 'containers.mdx');

/**
 * Проекция неймспейсов для индекса.
 *
 * Реестр читается ОДИН раз и здесь: источник истины о членстве — `REGISTRY.json` (§1), а
 * справочник его потребитель. Нечитаемый реестр не роняет рендер — иначе битая запись
 * членства обрушила бы весь индекс контейнеров, к которому она отношения не имеет.
 */
function namespacesOf() {
  const r = readRegistry(repoRoot);
  return {
    projected: r.state === REGISTRY_STATES.OK ? projectNamespaces(r.namespaces) : [],
    state: r.state,
    ids: r.state === REGISTRY_STATES.OK ? r.namespaces.map((n) => n.id) : [],
  };
}

function generate() {
  const containers = discoverContainers(repoRoot);
  const ns = namespacesOf();
  return {
    containers,
    ns,
    atlas: `${renderAtlasRegistry(containers, { namespaces: ns.projected })}\n`,
    mintlify: `${renderMintlifyPage(containers)}\n`,
  };
}

function runRender() {
  const { containers, atlas, mintlify } = generate();
  for (const [file, body] of [[REGISTRY, atlas], [MINTLIFY, mintlify]]) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  console.log(`tooling:atlas --render → пересобрано: ATLAS.md + mintlify (${containers.length} контейнеров).`);
}

function runCheck() {
  const { containers, ns, atlas, mintlify } = generate();

  // Сначала ТРИ РАЗНИЦЫ (§3), потом свежесть файлов. Порядок не случаен: плоское сравнение
  // отвечает «пересобери» на любой вопрос, а разницы говорят, ЧТО именно разъехалось — и
  // починка у них разная. Ответ «пересобери» на расхождение реестра увёл бы не туда.
  const drift = computeDrift({
    discovered: discoverHomes(repoRoot),
    indexed: containers,
    manifestHomes: listWorkshopManifests(repoRoot).map((p) => relative(repoRoot, dirname(p)).replaceAll('\\', '/')),
    registryIds: ns.ids,
    projectedIds: ns.projected.map((n) => n.id),
  });
  for (const line of renderDrift(drift)) console.log(line);

  const stale = [];
  if (!existsSync(REGISTRY) || readFileSync(REGISTRY, 'utf8') !== atlas) stale.push('registry/ATLAS.md разъехался с источником');
  if (!existsSync(MINTLIFY) || readFileSync(MINTLIFY, 'utf8') !== mintlify) stale.push('apps/docs-harness/tooling/containers.mdx разъехался с источником');
  for (const p of stale) console.error(`✗ ${p}`);

  // Реестр, который не читается, — не «ноль правил»: это отказ источника истины, и молча
  // отрендерить пустую секцию значило бы выдать поломку за состояние.
  if (ns.state !== REGISTRY_STATES.OK && ns.state !== 'absent') {
    console.error(`✗ реестр неймспейсов: ${ns.state} — проекция пуста НЕ потому, что правил нет`);
    stale.push('реестр нечитаем');
  }

  if (!drift.ok || stale.length > 0) {
    if (stale.length > 0) console.error('tooling:atlas --check: производные несвежи — пересобери `yarn tooling:atlas --render`.');
    process.exit(1);
  }
  console.log('tooling:atlas --check: OK — производные свежи.');
}

function runAudit() {
  const { healthy, warned, broken, rows } = auditContainers(repoRoot);
  console.log(`tooling:atlas --audit · контейнеров: ${rows.length}\n`);
  for (const c of rows) {
    const mark = !c.valid ? '✗' : c.warnings.length ? '⚠' : '✓';
    console.log(`${mark} ${c.home}  [${c.plane}/${c.role ?? '—'}]  [${c.name}]  глаголы: ${c.verbs.join('+') || '—'}${c.missingVerbs.length ? `  (нет: ${c.missingVerbs.join(',')})` : ''}`);
    for (const p of c.problems) console.log(`    ✗ ${p}`);
  }
  console.log(`\nЗдоровы: ${healthy} · с ⚠: ${warned} · битых: ${broken}`);
  if (broken > 0) { console.error(`tooling:atlas --audit: битых контейнеров ${broken}.`); process.exit(1); }
  console.log('tooling:atlas --audit: OK.');
}

function runDecompose() {
  const by = val('by') ?? 'family';
  const groups = decomposeContainers(discoverContainers(repoRoot), by);
  console.log(`tooling:atlas --decompose --by ${by}\n`);
  console.log('| Категория | Контейнеров | Список |');
  console.log('|-----------|-------------|--------|');
  for (const [k, ids] of [...groups].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    console.log(`| ${k} | ${ids.length} | ${ids.join(', ')} |`);
  }
}

function runInspect(home) {
  const c = inspectContainer(repoRoot, home);
  if (!c) { console.error(`tooling:atlas: контейнер «${home}» не найден`); process.exit(2); }
  console.log(`tooling:atlas --inspect ${c.home}\n`);
  console.log(`имя: ${c.name} · home: ${c.home} · plane: ${c.plane} · role: ${c.role ?? '—'} · семья: ${c.family}`);
  console.log(`worksOn: ${c.worksOn} · kit: ${c.kit ?? 'null'} · валиден: ${c.valid ? '✓' : '✗'}`);
  console.log(`глаголы: ${c.verbs.join(' + ') || '—'}${c.missingVerbs.length ? ` (нет: ${c.missingVerbs.join(', ')})` : ''}`);
  if (c.title) console.log(`README: ${c.title}`);
  if (c.summary) console.log(`  ${c.summary}`);
  for (const w of c.warnings) console.log(`  ⚠ ${w}`);
}

if (has('render')) runRender();
else if (has('check')) runCheck();
else if (has('audit')) runAudit();
else if (has('decompose')) runDecompose();
else if (has('inspect')) { const h = val('inspect'); if (!h) { console.error('tooling:atlas --inspect требует <home>'); process.exit(2); } runInspect(h); }
else { console.log('Usage: yarn tooling:atlas --audit | --decompose [--by family|plane|holder|kit] | --inspect <home> | --render | --check'); process.exit(2); }
