import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { auditProcedures } from './procedural-workshop.mjs';
import { readReadmeDigest } from './readme-digest.mjs';
import { discoverContainers } from './tooling-atlas.mjs';

const GENERATED_NOTICE =
  '{/* Производная страница: `node scripts/mintlify-workflow-docs.mjs --render`. Руками не править. */}';

export const WORKFLOW_DOC_TARGETS = {
  workshops: 'apps/docs/workflow/workshops/catalog.mdx',
  procedures: 'apps/docs/workflow/procedures/catalog.mdx',
};

const GITHUB_ROOT = 'https://github.com/officefish/Membrana/blob/main/';

const clean = (value) => String(value ?? '—').replace(/[\r\n]+/gu, ' ').trim();
const mdx = (value) => clean(value).replace(/[{}<>]/gu, (ch) => ({
  '{': '｛',
  '}': '｝',
  '<': '‹',
  '>': '›',
}[ch]));

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export const readDigest = readReadmeDigest;

function migrationState(procedure) {
  const values = [procedure.container?.value, procedure.vocabulary?.value, procedure.grammar?.value];
  if (values.every(Boolean)) return 'migrated';
  if (values.some(Boolean)) return 'in-migration';
  return 'legacy';
}

function readProcedureManifest(repoRoot, procedure) {
  if (!procedure.homePath?.startsWith('docs/procedures/')) return null;
  const path = join(repoRoot, procedure.homePath, 'MANIFEST.json');
  return existsSync(path) ? readJson(path) : null;
}

function sourceUrl(path) {
  return `${GITHUB_ROOT}${String(path).replace(/\\/gu, '/')}`;
}

export function loadWorkflowDocsModel(repoRoot) {
  const workshops = discoverContainers(repoRoot)
    .filter((item) => item.kind === 'workshop')
    .sort((a, b) => a.home.localeCompare(b.home));

  const registry = readJson(join(repoRoot, 'docs', 'procedures', 'registry.json')).procedures;
  const auditById = new Map(auditProcedures(repoRoot).map((item) => [item.id, item]));
  const procedures = registry.map((procedure) => {
    const audit = auditById.get(procedure.id);
    const manifest = readProcedureManifest(repoRoot, procedure);
    const readmePath = procedure.homePath ? join(repoRoot, procedure.homePath, 'README.md') : null;
    const digest = readReadmeDigest(readmePath);
    return {
      ...procedure,
      migrationState: migrationState(procedure),
      buildState: audit?.state ?? 'unknown',
      portfolio: audit?.portfolio ?? { status: 'missing', count: 0, items: [] },
      manifest,
      title: digest.title,
      summary: digest.summary,
    };
  });

  return { workshops, procedures };
}

function commandLines(workshop) {
  const commands = Object.entries(workshop.commands ?? {})
    .filter(([, command]) => typeof command === 'string' && command.trim())
    .sort(([left], [right]) => left.localeCompare(right));
  if (commands.length === 0) return ['Исполнимые команды пока не объявлены.'];
  return commands.map(([name, command]) => {
    if (command.startsWith('planned:')) {
      return `- **${mdx(name)}:** план, не исполнимая дверь — \`${mdx(command.slice('planned:'.length).trim())}\``;
    }
    return `- **${mdx(name)}:** \`${mdx(command)}\``;
  });
}

function usageLines(workshop) {
  const entries = Object.entries(workshop.usage ?? {});
  if (entries.length === 0) {
    return [
      '<Warning>',
      'Для этой мастерской ещё нет проверенного примера вывода. Пробел входит в `workflow-examples-marathon`.',
      '</Warning>',
    ];
  }
  const lines = ['**Примеры использования**', ''];
  for (const [name, example] of entries) {
    const evidenceLabel = example.evidenceKind === 'run'
      ? 'прожитый run'
      : 'fixture — воспроизводимая искусственная форма';
    lines.push(`**${mdx(name)} — ${evidenceLabel}.** ${mdx(example.what)}`);
    lines.push('');
    lines.push(`Источник: [\`${mdx(example.source)}\`](${sourceUrl(example.source)})`);
    lines.push('');
    lines.push('```text');
    lines.push(String(example.sample ?? '').trim());
    lines.push('```');
    if (example.measuredAt) lines.push(`Замер: ${mdx(example.measuredAt)}.`);
    lines.push('');
  }
  return lines;
}

export function renderWorkshopsCatalog(workshops) {
  const lines = [
    '---',
    'title: Каталог мастерских',
    'description: Все живые мастерские Membrana, их предметы, команды и подтверждённые примеры.',
    '---',
    '',
    GENERATED_NOTICE,
    '',
    `Каталог собран из **${workshops.length}** живых манифестов. Мастерская — это оснастка дома: она помогает осмотреть предмет, разложить его и изучить один элемент. Сам дом может существовать без мастерской.`,
    '',
    '<Info>',
    'Источник истины каждой записи — её `README.md` и `workshop.manifest.json`. Здесь находится производная витрина.',
    '</Info>',
    '',
  ];

  for (const workshop of workshops) {
    lines.push(`## ${mdx(workshop.name)}`);
    lines.push('');
    if (workshop.summary) lines.push(mdx(workshop.summary), '');
    lines.push(`- **Дом:** [\`${mdx(workshop.home)}\`](${sourceUrl(`${workshop.home}/README.md`)})`);
    lines.push(`- **Работает над:** \`${mdx(workshop.worksOn)}\``);
    lines.push(`- **Плоскость:** ${mdx(workshop.plane)}`);
    lines.push(`- **Роль:** ${mdx(workshop.role ?? 'не объявлена')}`);
    lines.push(`- **Кит:** ${workshop.kit == null ? '`null` — отдельная поставка не заказана' : `\`${mdx(workshop.kit)}\``}`);
    const health = !workshop.valid
      ? 'манифест требует ремонта'
      : workshop.warnings.length > 0
        ? `валиден с предупреждениями: ${workshop.warnings.length}`
        : 'манифест валиден без предупреждений';
    lines.push(`- **Состояние:** ${health}`);
    lines.push(`- **Инвентарные глаголы:** ${workshop.verbs.length > 0 ? workshop.verbs.map((verb) => `\`${mdx(verb)}\``).join(', ') : 'не объявлены'}`);
    if (workshop.missingVerbs.length > 0) {
      lines.push(`- **Не живут в этой мастерской:** ${workshop.missingVerbs.map((verb) => `\`${mdx(verb)}\``).join(', ')}`);
    }
    lines.push('');
    lines.push('**Двери мастерской**', '');
    lines.push(...commandLines(workshop), '');
    const intentions = (workshop.domainTools ?? []).filter((item) => !item.tool);
    if (intentions.length > 0) {
      lines.push('**Доменные намерения без команды**', '');
      for (const item of intentions) {
        lines.push(`- \`${mdx(item.name)}\` работает над \`${mdx(item.worksOn)}\`, но \`tool\` не объявлен.`);
      }
      lines.push('');
    }
    lines.push(...usageLines(workshop), '');
  }

  return `${lines.join('\n').trim()}\n`;
}

function portfolioLines(procedure) {
  const items = procedure.portfolio?.items ?? [];
  if (items.length === 0) {
    return [
      '<Warning>',
      'Портфолио отсутствует: подтверждённый пример нельзя подменять иллюстрацией. Пробел входит в `workflow-examples-marathon`.',
      '</Warning>',
    ];
  }
  const lines = ['**Носители портфолио**', ''];
  for (const item of items) {
    const label = item.id ?? item.kind ?? item.path;
    if (item.path) lines.push(`- [${mdx(label)}](${sourceUrl(item.path)}) — ${mdx(item.kind ?? 'artifact')}`);
    else lines.push(`- ${mdx(label)} — ${mdx(item.kind ?? 'artifact')}`);
  }
  const exampleKinds = new Set(['run', 'precedent', 'protocol', 'journal']);
  const examples = items.filter((item) => exampleKinds.has(item.kind));
  lines.push('');
  if (examples.length === 0) {
    lines.push('<Warning>');
    lines.push('Портфолио есть, но прожитого примера в нём нет. Пробел входит в `workflow-examples-marathon`.');
    lines.push('</Warning>');
  } else {
    lines.push('**Прожитые примеры**', '');
    for (const item of examples) {
      const label = item.id ?? item.path;
      lines.push(`- [${mdx(label)}](${sourceUrl(item.path)}) — ${mdx(item.kind)}`);
    }
  }
  return lines;
}

function frameLines(procedure) {
  const frames = procedure.manifest?.frames ?? [];
  if (frames.length === 0) return ['Кадры не опубликованы.'];
  return frames.map((frame) => `- \`${mdx(frame.id)}\` — держатель **${mdx(frame.holder)}**`);
}

export function renderProceduresCatalog(procedures) {
  const built = procedures.filter((item) => item.buildState.startsWith('built-')).length;
  const portfolio = procedures.filter((item) => item.portfolio?.count > 0).length;
  const lines = [
    '---',
    'title: Каталог процедур',
    'description: Все процедуры Membrana с живым статусом, держателем, кадрами и портфолио.',
    '---',
    '',
    GENERATED_NOTICE,
    '',
    `Реестр содержит **${procedures.length}** процедуры. Построено **${built}**, портфолио есть у **${portfolio}**. Объявленная, но не построенная процедура — законный backlog, а не работающая дверь.`,
    '',
    '<Info>',
    'Статусы и держатели приходят из `docs/procedures/registry.json`; форма и примеры — из манифеста контейнера.',
    '</Info>',
    '',
  ];

  for (const kind of ['разработка', 'решение', 'ритм']) {
    lines.push(`## ${kind[0].toUpperCase()}${kind.slice(1)}`, '');
    for (const procedure of procedures.filter((item) => item.procedureKind === kind)) {
      lines.push(`### \`${mdx(procedure.id)}\``);
      lines.push('');
      if (procedure.summary) lines.push(mdx(procedure.summary), '');
      lines.push(`- **Держатель:** ${mdx(procedure.holder)}`);
      lines.push(`- **Состояние контейнера:** \`${mdx(procedure.buildState)}\``);
      lines.push(`- **Миграция:** \`${mdx(procedure.migrationState)}\``);
      lines.push(`- **Режим:** \`${mdx(procedure.manifest?.mode ?? 'не объявлен')}\``);
      if (procedure.homePath) {
        lines.push(`- **Канон:** [\`${mdx(procedure.homePath)}\`](${sourceUrl(`${procedure.homePath}/README.md`)})`);
      } else {
        lines.push('- **Канон:** контейнер ещё не построен.');
      }
      lines.push('');
      if (procedure.manifest?.trigger) {
        lines.push(`**Когда входить.** ${mdx(procedure.manifest.trigger.note ?? procedure.manifest.trigger.command ?? procedure.manifest.trigger.kind)}`);
        lines.push('');
      }
      lines.push('**Кадры**', '');
      lines.push(...frameLines(procedure), '');
      lines.push(...portfolioLines(procedure), '');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

export function renderWorkflowDocs(repoRoot) {
  const model = loadWorkflowDocsModel(repoRoot);
  return {
    [WORKFLOW_DOC_TARGETS.workshops]: renderWorkshopsCatalog(model.workshops),
    [WORKFLOW_DOC_TARGETS.procedures]: renderProceduresCatalog(model.procedures),
  };
}

export function writeWorkflowDocs(repoRoot) {
  const outputs = renderWorkflowDocs(repoRoot);
  for (const [relativePath, body] of Object.entries(outputs)) {
    const path = join(repoRoot, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, 'utf8');
  }
  return Object.keys(outputs);
}

export function checkWorkflowDocs(repoRoot) {
  const outputs = renderWorkflowDocs(repoRoot);
  return Object.entries(outputs)
    .filter(([relativePath, body]) => {
      const path = join(repoRoot, relativePath);
      return !existsSync(path) || readFileSync(path, 'utf8') !== body;
    })
    .map(([relativePath]) => relativePath);
}
