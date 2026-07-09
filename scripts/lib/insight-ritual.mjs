/**
 * Insight ritual — paths, registry, templates, Perplexity cascade helpers.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';

export const REGULATION_PATH = 'docs/prompts/INSIGHT_REGULATION.md';
export const REVIEW_PROMPT_PATH = 'docs/prompts/INSIGHT_REVIEW_PROMPT.md';
export const VIRTUAL_TEAM_PATH = 'docs/VIRTUAL_TEAM_PROMPT.md';
export const REGISTRY_PATH = 'docs/insights/registry.json';
export const INSIGHTS_DIR = 'docs/insights';
export const TEMPLATE_DIR = 'docs/insights/_template';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {string} slug */
export function normalizeInsightId(slug) {
  const raw = slug.trim().replace(/^insight-/, '');
  const id = `insight-${raw}`;
  if (!SLUG_RE.test(raw)) {
    throw new Error(`Invalid insight slug "${slug}" — use kebab-case`);
  }
  return id;
}

/** @param {string} repoRoot @param {string} id */
export function insightDir(repoRoot, id) {
  return join(resolve(repoRoot), INSIGHTS_DIR, id);
}

/** @param {string} repoRoot */
export function readRegistry(repoRoot) {
  const path = join(resolve(repoRoot), REGISTRY_PATH);
  if (!existsSync(path)) {
    return { version: 1, updatedAt: null, insights: [] };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** @param {string} repoRoot @param {object} registry */
export function writeRegistry(repoRoot, registry) {
  const path = join(resolve(repoRoot), REGISTRY_PATH);
  registry.updatedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

/** @param {string} template @param {Record<string, string>} vars */
export function fillTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

/**
 * @param {string} repoRoot
 * @param {{ id: string; title: string; source?: string; tags?: string[] }} input
 */
export function createInsight(repoRoot, input) {
  const root = resolve(repoRoot);
  const id = normalizeInsightId(input.id);
  const dir = insightDir(root, id);
  if (existsSync(dir)) {
    throw new Error(`Insight already exists: ${id}`);
  }
  mkdirSync(dir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const source = input.source ?? 'user';
  const vars = { ID: id, TITLE: input.title, SOURCE: source, DATE: date };

  for (const file of ['INSIGHT.md', 'RESEARCH.md', 'REVIEW.md', 'meta.json']) {
    const tpl = readFileSync(join(root, TEMPLATE_DIR, file), 'utf8');
    writeFileSync(join(dir, file), fillTemplate(tpl, vars), 'utf8');
  }

  const registry = readRegistry(root);
  registry.insights.push({
    id,
    title: input.title,
    status: 'draft',
    source,
    sprintPhase: null,
    horizon: null,
    weight: null,
    createdAt: date,
    tags: input.tags ?? [],
  });
  writeRegistry(root, registry);
  return { id, dir };
}

/**
 * Явные Q1–Q3 из секции «Вопросы для research» INSIGHT.md, если она есть.
 * Заголовок инсайта — плохой запрос: «Hermes — вестник-лиазон» Perplexity понимает
 * как модный дом Hermès / бога Гермеса. Автор пишет доменно-конкретные вопросы —
 * их и надо слать в поиск.
 * @param {string} insightMd
 */
function parseResearchQuestions(insightMd) {
  // Терминатор — следующий заголовок H2 или конец файла. НЕ `\n*$` c флагом `m`:
  // между заголовком секции и списком есть пустая строка, и `$` (multiline) матчит
  // её конец сразу → пустой захват.
  const section = insightMd.match(
    /##\s+Вопросы для research[^\n]*\n([\s\S]*?)(?=\n##\s|$)/,
  );
  if (!section) return [];
  const items = [];
  const re = /^\s*(\d+)\.\s+(?:\*\*(.+?):\*\*\s*)?(.+)$/gm;
  let m;
  while ((m = re.exec(section[1])) !== null) {
    const label = (m[2] ?? '').trim();
    const text = m[3].replace(/\*\*/g, '').trim();
    items.push({
      key: `Q${m[1]}`,
      label: label || `Q${m[1]}`,
      query: label ? `${label}: ${text}` : text,
    });
  }
  return items;
}

/** @param {string} insightMd */
export function buildResearchQueries(insightMd) {
  const explicit = parseResearchQuestions(insightMd);
  if (explicit.length > 0) return explicit;

  const titleMatch = insightMd.match(/^#\s+INSIGHT:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? 'Membrana insight topic';
  return [
    {
      key: 'Q1',
      label: 'Landscape',
      query: `${title}: industry landscape, open-source approaches 2024-2026`,
    },
    {
      key: 'Q2',
      label: 'Fit (Membrana)',
      query: `${title}: fit with Web Audio, edge recording, zero-shot audio, TypeScript monorepo`,
    },
    {
      key: 'Q3',
      label: 'Risk',
      query: `${title}: risks latency cost privacy licensing flakiness team velocity`,
    },
  ];
}

/**
 * Прокси для исходящих HTTP (proxy-aware окружение Membrana, ср. `scripts/_anthropic-env.mjs`).
 * Голый глобальный `fetch` игнорирует HTTPS_PROXY → «fetch failed» за прокси; используем
 * undici c ProxyAgent, как в anthropicPost.
 */
function perplexityProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.PERPLEXITY_HTTPS_PROXY?.trim() ||
    ''
  );
}

/** @param {string} apiKey @param {string} query */
export async function perplexityAsk(apiKey, query) {
  const proxy = perplexityProxyUrl();
  const dispatcher = proxy
    ? new ProxyAgent({ uri: proxy, connectTimeout: 60_000 })
    : new Agent({ connectTimeout: 60_000 });
  let response;
  let text;
  try {
    response = await undiciFetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: query }],
      }),
      dispatcher,
    });
    text = await response.text();
  } finally {
    try {
      await dispatcher.close();
    } catch {
      /* ignore */
    }
  }
  if (!response.ok) {
    throw new Error(`Perplexity HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('Perplexity returned empty content');
  }
  return content.trim();
}

/** @param {string} repoRoot @param {string} id @param {{ apiKey?: string; dryRun?: boolean }} options */
export async function runInsightResearch(repoRoot, id, options = {}) {
  const root = resolve(repoRoot);
  const normalizedId = normalizeInsightId(id);
  const dir = insightDir(root, normalizedId);
  const insightPath = join(dir, 'INSIGHT.md');
  if (!existsSync(insightPath)) {
    throw new Error(`Insight not found: ${normalizedId}`);
  }
  const insightMd = readFileSync(insightPath, 'utf8');
  const queries = buildResearchQueries(insightMd);

  if (options.dryRun) {
    return { mode: 'dry-run', queries };
  }

  const sections = [];
  let mode = 'manual';

  if (options.apiKey) {
    try {
      mode = 'perplexity-api';
      for (const item of queries) {
        const answer = await perplexityAsk(options.apiKey, item.query);
        sections.push(
          `## ${item.key} — ${item.label}\n\n**Запрос:** ${item.query}\n\n**Выжимка:**\n\n${answer}\n`,
        );
      }
    } catch (error) {
      mode = 'api-failed-fallback';
      sections.push(
        `<!-- API failed: ${error instanceof Error ? error.message : String(error)} -->\n`,
      );
      for (const item of queries) {
        sections.push(
          `## ${item.key} — ${item.label}\n\n**Запрос:** ${item.query}\n\n**Выжимка:** _(MCP Perplexity или вручную)_\n`,
        );
      }
    }
  } else {
    for (const item of queries) {
      sections.push(
        `## ${item.key} — ${item.label}\n\n**Запрос:** ${item.query}\n\n**Выжимка:** _(нет PERPLEXITY_API_KEY — MCP или вручную)_\n`,
      );
    }
  }

  const titleMatch = insightMd.match(/^#\s+INSIGHT:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? normalizedId;
  writeFileSync(
    join(dir, 'RESEARCH.md'),
    `# Research: ${title}\n\n> Источник: ${mode}\n\n${sections.join('\n')}`,
    'utf8',
  );

  if (mode === 'perplexity-api') {
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    meta.status = 'researched';
    meta.researchedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    const registry = readRegistry(root);
    const entry = registry.insights.find((item) => item.id === normalizedId);
    if (entry) {
      entry.status = 'researched';
    }
    writeRegistry(root, registry);
  }

  return { mode, queries };
}

/** @param {string} repoRoot @param {string} [statusFilter] */
export function formatInsightList(repoRoot, statusFilter) {
  const items = readRegistry(repoRoot).insights ?? [];
  const filtered = statusFilter ? items.filter((i) => i.status === statusFilter) : items;
  if (filtered.length === 0) {
    return `Нет инсайтов${statusFilter ? ` (${statusFilter})` : ''}`;
  }
  return [
    'ID | status | weight | title',
    '--- | --- | --- | ---',
    ...filtered.map((i) => `${i.id} | ${i.status} | ${i.weight ?? '—'} | ${i.title}`),
  ].join('\n');
}

/** @param {string} repoRoot @param {number} minWeight */
export function collectInsightsForWeeklyPlan(repoRoot, minWeight = 6) {
  return (readRegistry(repoRoot).insights ?? []).filter(
    (item) =>
      item.weight !== null &&
      item.weight >= minWeight &&
      (item.status === 'adopted' || item.status === 'reviewed'),
  );
}

/** @param {string} repoRoot @param {number} minWeight */
export function formatInsightsWeeklyBlock(repoRoot, minWeight = 6) {
  const items = collectInsightsForWeeklyPlan(repoRoot, minWeight);
  if (items.length === 0) {
    return '';
  }
  return [
    `## Активные инсайты (weight ≥ ${minWeight})`,
    '',
    ...items.map(
      (item) =>
        `- **${item.id}** (${item.weight}, ${item.status}): ${item.title} — docs/insights/${item.id}/`,
    ),
  ].join('\n');
}

export function printInsightHelp() {
  console.log(`yarn insight — Membrana Insight process

  help
  create <slug> --title "…" [--source user]
  list [--status draft]
  research <id> [--dry-run]
  review <id> [--dry-run]
  close <id> --status adopted|deferred|rejected [--weight N]

Regulation: ${REGULATION_PATH}
`);
}

/** @param {string[]} argv */
export function parseInsightCli(argv) {
  if (!argv[0] || argv[0] === 'help' || argv[0] === '--help') {
    return { command: 'help' };
  }
  const command = argv[0];
  let title = '';
  let source = 'user';
  let status = '';
  let weight = null;
  let statusFilter = '';
  let dryRun = false;
  let id = '';

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--title') {
      title = argv[++i] ?? '';
    } else if (arg.startsWith('--title=')) {
      title = arg.slice(8);
    } else if (arg === '--source') {
      source = argv[++i] ?? source;
    } else if (arg.startsWith('--source=')) {
      source = arg.slice(9);
    } else if (arg === '--status') {
      status = argv[++i] ?? '';
    } else if (arg.startsWith('--status=')) {
      status = arg.slice(9);
    } else if (arg === '--weight') {
      weight = Number(argv[++i]);
    } else if (arg.startsWith('--weight=')) {
      weight = Number(arg.slice(9));
    } else if (!arg.startsWith('--') && !id) {
      id = arg;
    }
  }

  const si = argv.indexOf('--status');
  if (command === 'list' && si >= 0 && argv[si + 1] && !argv[si + 1].startsWith('--')) {
    statusFilter = argv[si + 1];
  }

  return { command, id, title, source, status, weight, statusFilter, dryRun };
}
