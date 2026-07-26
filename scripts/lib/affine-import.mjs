/**
 * Affine strategic-docs import — path mapping, doc prep, auth probe.
 *
 * v1: Affine stable self-host has no public GraphQL markdown-create mutation.
 * Live import writes a markdown bundle + owner UI checklist; dry-run validates auth/workspace.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CONTAINER_ROOT, GRANULES_DIR, TEMPLATES_DIR } from './strategic-docs-loader.mjs';
import { pureIoThrow } from './strategic-docs-generate.mjs';
import { loadRegistry } from './task-registry.mjs';
import { makeRegistryIo } from './tasks-readme-engine.mjs';

export { CONTAINER_ROOT as STRATEGIC_DOCS_ROOT };

/** Affine namespace folder = container id (not git `granules/` / `templates/` taxonomy). */
export const DEFAULT_CONTAINER_NAMESPACE = 'strategic-docs';

export const DEFAULT_BASE_URL = 'https://strategy.mmbrn.tech';

/** @typedef {'templates' | 'releases'} AffineTarget */

/** @typedef {'granule' | 'template' | 'release' | 'granule-meta' | 'template-meta' | 'release-meta' | 'file'} ImportKind */
/** @typedef {'content' | 'meta'} PairRole */

/** @typedef {{
 *   title: string,
 *   namespace: string,
 *   markdown: string,
 *   sourcePath: string,
 *   kind: ImportKind,
 *   id?: string,
 *   pairRole?: PairRole,
 *   pairTitle?: string,
 *   legacyTitles?: string[],
 * }} ImportEntry */

/**
 * @param {string[]} argv
 * @param {AffineTarget} [defaultTarget]
 */
export function parseImportArgs(argv, defaultTarget) {
  /** @type {{
   *   target?: AffineTarget,
   *   file?: string,
   *   title?: string,
   *   namespace?: string,
   *   dryRun: boolean,
   *   help: boolean,
   *   sync: boolean,
   * }} */
  const out = { dryRun: false, help: false, sync: false };
  const rest = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--sync') out.sync = true;
    else if (a === '--title') out.title = argv[++i];
    else if (a === '--namespace') out.namespace = argv[++i];
    else if (a === '--target') {
      const t = argv[++i];
      if (t !== 'templates' && t !== 'releases') {
        throw new Error(`--target must be templates|releases, got ${t}`);
      }
      out.target = t;
    } else if (a === '--') {
      // yarn passes `--` before script args; ignore
    } else rest.push(a);
  }

  out.target = out.target ?? defaultTarget;
  if (rest.length) out.file = resolve(rest[0]);
  return out;
}

/**
 * Resolve Affine workspace UUID for a publish target.
 *
 * Priority: target-specific env → AFFINE_WORKSPACE_ID fallback.
 * Never let AFFINE_WORKSPACE_ID override TEMPLATES/RELEASES when those are set —
 * that bug routed Templates docs into the Releases workspace.
 *
 * @param {AffineTarget} target
 * @param {{ allowMissing?: boolean }} [opts]
 * @returns {string | undefined}
 */
export function resolveWorkspaceId(target, opts = {}) {
  const templatesId = process.env.AFFINE_WORKSPACE_TEMPLATES_ID?.trim();
  const releasesId = process.env.AFFINE_WORKSPACE_RELEASES_ID?.trim();
  const generic = process.env.AFFINE_WORKSPACE_ID?.trim();

  if (target === 'templates') {
    if (templatesId) return templatesId;
    if (generic) return generic;
    if (opts.allowMissing) return undefined;
    throw new Error(
      'Missing AFFINE_WORKSPACE_TEMPLATES_ID (or AFFINE_WORKSPACE_ID fallback). Run yarn affine:workspace:list',
    );
  }

  if (releasesId) return releasesId;
  if (generic) return generic;
  if (opts.allowMissing) return undefined;
  throw new Error(
    'Missing AFFINE_WORKSPACE_RELEASES_ID (or AFFINE_WORKSPACE_ID fallback). Run yarn affine:workspace:list',
  );
}

/**
 * Normalize Affine namespace path (container folder inside workspace).
 * @param {string} namespace
 */
export function normalizeNamespace(namespace) {
  return namespace.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** @deprecated Use normalizeNamespace */
export const normalizeFolder = normalizeNamespace;

/**
 * Map git strategic-docs artifact → Affine namespace (container id by default).
 * Git `granules/` · `templates/` · `releases/` are doc types, not Affine folders.
 * @param {string} relativePath path under strategic-docs/ (or arbitrary import path)
 * @param {AffineTarget} target
 * @param {string | undefined} explicitNamespace
 */
export function mapGitPathToAffineNamespace(relativePath, target, explicitNamespace) {
  if (explicitNamespace) return normalizeNamespace(explicitNamespace);

  const p = normalizeNamespace(relativePath.replace(/^\.\//, ''));

  if (p.startsWith('granules/') && target === 'templates') {
    return DEFAULT_CONTAINER_NAMESPACE;
  }
  if (p.startsWith('templates/') && target === 'templates') {
    return DEFAULT_CONTAINER_NAMESPACE;
  }
  if (p.startsWith('releases/') && target === 'releases') {
    return DEFAULT_CONTAINER_NAMESPACE;
  }

  throw new Error(
    `Cannot map "${relativePath}" to Affine namespace for target "${target}". Use --namespace explicitly.`,
  );
}

/** @deprecated Use mapGitPathToAffineNamespace */
export const mapGitPathToAffineFolder = mapGitPathToAffineNamespace;

/**
 * @param {ImportKind} kind
 * @param {string} id
 * @param {string | undefined} explicitTitle
 */
export function buildDocTitle(kind, id, explicitTitle) {
  if (explicitTitle?.trim()) return explicitTitle.trim();
  switch (kind) {
    case 'granule':
      return `Granule · ${id}`;
    case 'template':
      return `Template · ${id}`;
    case 'release':
      return `Release · ${id}`;
    case 'granule-meta':
      return `Meta · Granule · ${id}`;
    case 'template-meta':
      return `Meta · Template · ${id}`;
    case 'release-meta':
      return `Meta · Release · ${id}`;
    default:
      return id;
  }
}

/**
 * Short pair-link banner (content ↔ meta). Affine has no first-class doc links via CLI.
 * @param {string} contentTitle
 * @param {string} metaTitle
 * @param {PairRole} role
 * @param {string} namespace
 */
export function buildPairLinkBanner(contentTitle, metaTitle, role, namespace) {
  const other = role === 'content' ? metaTitle : contentTitle;
  const otherLabel = role === 'content' ? 'Meta' : 'Content';
  return [
    `> **Granule pair** · namespace \`${namespace}\``,
    `>`,
    `> This page is **${role}**. Linked ${otherLabel}: **${other}**`,
    '',
  ].join('\n');
}

/**
 * Human-editable meta page (not a JSON dump).
 * @param {{
 *   kindLabel: string,
 *   id: string,
 *   contentTitle: string,
 *   metaTitle: string,
 *   namespace: string,
 *   fields: Array<[string, unknown]>,
 *   purpose?: string,
 *   sections?: Array<{ heading: string, lines: string[] }>,
 * }} opts
 */
export function buildMetaMarkdown(opts) {
  const {
    kindLabel,
    id,
    contentTitle,
    metaTitle,
    namespace,
    fields,
    purpose,
    sections = [],
  } = opts;

  const lines = [
    buildPairLinkBanner(contentTitle, metaTitle, 'meta', namespace).trimEnd(),
    '',
    `# Meta · ${kindLabel} · ${id}`,
    '',
    'Provenance and purpose for the linked content page. Edit in Affine; git remains SoT.',
    '',
  ];

  if (purpose?.trim()) {
    lines.push('## Purpose', '', purpose.trim(), '');
  }

  lines.push('## Identity', '', '| Field | Value |', '| --- | --- |');
  for (const [key, val] of fields) {
    if (val != null && val !== '') lines.push(`| ${key} | \`${String(val)}\` |`);
  }
  lines.push('');

  for (const section of sections) {
    if (!section.lines.length) continue;
    lines.push(`## ${section.heading}`, '', ...section.lines, '');
  }

  lines.push('<!-- affine-strategic-docs-meta -->', '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}`;
}

/**
 * @param {Record<string, unknown>} meta
 * @param {string} kindLabel
 * @deprecated Prefer buildMetaMarkdown for dual content/meta pages
 */
export function buildMetadataBlock(meta, kindLabel) {
  return buildMetaMarkdown({
    kindLabel,
    id: String(meta.id ?? ''),
    contentTitle: String(meta.id ?? ''),
    metaTitle: `Meta · ${kindLabel} · ${meta.id ?? ''}`,
    namespace: DEFAULT_CONTAINER_NAMESPACE,
    fields: [
      ['id', meta.id],
      ['version', meta.version ?? meta.templateVersion ?? meta.releaseId],
      ['kind', meta.kind],
      ['source', meta.source ?? meta.bodyPath ?? meta.repoPath],
    ],
    purpose: typeof meta.description === 'string' ? meta.description : undefined,
  });
}

/**
 * @param {string} body
 * @param {string} contentTitle
 * @param {string} metaTitle
 * @param {string} namespace
 */
export function composeContentMarkdown(body, contentTitle, metaTitle, namespace) {
  const trimmed = body.replace(/^\uFEFF/, '').trimEnd();
  return `${buildPairLinkBanner(contentTitle, metaTitle, 'content', namespace)}${trimmed}\n`;
}

/**
 * @param {string} body
 * @param {string} metadataBlock
 * @deprecated Prefer composeContentMarkdown + separate meta entry
 */
export function composeMarkdown(body, metadataBlock) {
  const trimmed = body.replace(/^\uFEFF/, '').trimEnd();
  return `${metadataBlock}\n${trimmed}\n`;
}

/**
 * IO adapter for function granules during Affine sync — same contract as
 * `strategic-docs-generate.mjs` (registry via `loadRegistry`, no direct fs in granules).
 * @param {string} repoRoot
 */
export function makeAffineSyncIo(repoRoot) {
  return makeRegistryIo(loadRegistry(repoRoot));
}

/**
 * @param {Record<string, unknown>} granuleJson
 * @param {string} granuleDir
 * @param {{ exec: (req: { op: string, args?: object }) => Promise<unknown> }} [io]
 */
export async function resolveGranuleBody(granuleJson, granuleDir, io = pureIoThrow) {
  if (granuleJson.kind === 'literal') {
    const bodyPath = String(granuleJson.bodyPath ?? './body.md').replace(/^\.\//, '');
    const file = join(granuleDir, bodyPath);
    if (!existsSync(file)) throw new Error(`Granule body not found: ${file}`);
    return readFileSync(file, 'utf8');
  }

  if (granuleJson.kind === 'function') {
    const modulePath = join(
      granuleDir,
      String(granuleJson.modulePath ?? './render.mjs').replace(/^\.\//, ''),
    );
    const mod = await import(pathToFileURL(modulePath).href);
    const fnName = String(granuleJson.fn);
    const fn = mod[fnName];
    if (typeof fn !== 'function') {
      throw new Error(`Granule function export missing: ${fnName} in ${modulePath}`);
    }
    const out = await fn(
      { pin: {}, ctx: { granuleId: granuleJson.id, version: granuleJson.version } },
      io,
    );
    if (!out?.body) throw new Error(`Granule ${granuleJson.id} returned no body`);
    return out.body;
  }

  throw new Error(`Unsupported granule kind: ${granuleJson.kind}`);
}

/**
 * @param {string} granuleDir
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {Promise<ImportEntry[]>}
 */
export async function prepareGranuleEntry(granuleDir, repoRoot, opts = {}) {
  const metaPath = join(granuleDir, 'granule.json');
  if (!existsSync(metaPath)) throw new Error(`Missing granule.json: ${granuleDir}`);
  const granuleJson = JSON.parse(readFileSync(metaPath, 'utf8'));
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), granuleDir).replace(
    /\\/g,
    '/',
  );
  const namespace = mapGitPathToAffineNamespace(rel, 'templates', opts.namespace);
  const body = await resolveGranuleBody(granuleJson, granuleDir, makeAffineSyncIo(repoRoot));
  const id = String(granuleJson.id);
  const contentTitle = buildDocTitle('granule', id, opts.title);
  const metaTitle = buildDocTitle('granule-meta', id);

  const sourcePath =
    granuleJson.kind === 'function'
      ? `docs/containers/strategic-docs/${rel}/${String(granuleJson.modulePath ?? './render.mjs').replace(/^\.\//, '')}`
      : `docs/containers/strategic-docs/${rel}/${String(granuleJson.bodyPath ?? './body.md').replace(/^\.\//, '')}`;

  /** @type {Array<{ heading: string, lines: string[] }>} */
  const sections = [];
  if (Array.isArray(granuleJson.foundations) && granuleJson.foundations.length) {
    sections.push({
      heading: 'Foundations',
      lines: granuleJson.foundations.map((/** @type {unknown} */ f) => {
        if (typeof f === 'string') return `- ${f}`;
        if (f && typeof f === 'object' && 'path' in f) {
          const role = 'role' in f && f.role ? ` (${f.role})` : '';
          return `- \`${f.path}\`${role}`;
        }
        return `- ${String(f)}`;
      }),
    });
  }
  if (Array.isArray(granuleJson.usedBy) && granuleJson.usedBy.length) {
    sections.push({
      heading: 'Used by',
      lines: granuleJson.usedBy.map((/** @type {unknown} */ u) => {
        if (u && typeof u === 'object') {
          return `- template \`${u.templateId}\` slot \`${u.placeholder}\` pin \`${u.pin}\``;
        }
        return `- ${String(u)}`;
      }),
    });
  }

  return [
    {
      kind: 'granule',
      id,
      title: contentTitle,
      namespace,
      markdown: composeContentMarkdown(body, contentTitle, metaTitle, namespace),
      sourcePath: granuleDir,
      pairRole: 'content',
      pairTitle: metaTitle,
    },
    {
      kind: 'granule-meta',
      id,
      title: metaTitle,
      namespace,
      markdown: buildMetaMarkdown({
        kindLabel: 'Granule',
        id,
        contentTitle,
        metaTitle,
        namespace,
        fields: [
          ['id', id],
          ['version', granuleJson.version],
          ['kind', granuleJson.kind],
          ['content', granuleJson.kind === 'function' ? 'pure function' : 'literal'],
          ['source', sourcePath],
        ],
        purpose:
          typeof granuleJson.description === 'string'
            ? granuleJson.description
            : `Granule ${id}: ${granuleJson.kind === 'function' ? 'pure function output' : 'literal markdown'}`,
        sections,
      }),
      sourcePath: metaPath,
      pairRole: 'meta',
      pairTitle: contentTitle,
      legacyTitles: [`Meta · ${id}`],
    },
  ];
}

/**
 * @param {string} templateDir
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {ImportEntry[]}
 */
export function prepareTemplateEntry(templateDir, repoRoot, opts = {}) {
  const metaPath = join(templateDir, 'template.json');
  if (!existsSync(metaPath)) throw new Error(`Missing template.json: ${templateDir}`);
  const templateJson = JSON.parse(readFileSync(metaPath, 'utf8'));
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), templateDir).replace(
    /\\/g,
    '/',
  );
  const namespace = mapGitPathToAffineNamespace(rel, 'templates', opts.namespace);
  const id = String(templateJson.id);
  const contentTitle = buildDocTitle('template', id, opts.title);
  const metaTitle = buildDocTitle('template-meta', id);

  const slots = Array.isArray(templateJson.slots) ? templateJson.slots : [];
  const slotsTable =
    '| Slot | Granule | Pin |\n| --- | --- | --- |\n' +
    slots
      .map(
        (/** @type {{ placeholder?: string, granuleId?: string, pin?: string }} */ s) =>
          `| \`${s.placeholder ?? ''}\` | \`${s.granuleId ?? ''}\` | \`${s.pin ?? ''}\` |`,
      )
      .join('\n');

  // Editable markdown body — skeleton as live markdown, not an opaque JSON/code dump.
  const contentBody = [
    `# ${templateJson.meta?.title ?? id}`,
    '',
    '<!-- strategic-docs-template-skeleton: edit placeholders; regenerate release via yarn strategic-docs:generate -->',
    '',
    String(templateJson.skeleton ?? '').trim(),
    '',
  ].join('\n');

  const purpose =
    typeof templateJson.meta?.description === 'string'
      ? templateJson.meta.description
      : `Template ${id}@${templateJson.version}`;

  return [
    {
      kind: 'template',
      id,
      title: contentTitle,
      namespace,
      markdown: composeContentMarkdown(contentBody, contentTitle, metaTitle, namespace),
      sourcePath: templateDir,
      pairRole: 'content',
      pairTitle: metaTitle,
    },
    {
      kind: 'template-meta',
      id,
      title: metaTitle,
      namespace,
      markdown: buildMetaMarkdown({
        kindLabel: 'Template',
        id,
        contentTitle,
        metaTitle,
        namespace,
        fields: [
          ['id', id],
          ['version', templateJson.version],
          ['target', templateJson.target],
          ['source', `docs/containers/strategic-docs/${rel}/template.json`],
          ['status', templateJson.meta?.status],
          ['surface', Array.isArray(templateJson.meta?.surface) ? templateJson.meta.surface.join(', ') : undefined],
        ],
        purpose,
        sections: [
          {
            heading: 'Slots',
            lines: [slotsTable],
          },
        ],
      }),
      sourcePath: metaPath,
      pairRole: 'meta',
      pairTitle: contentTitle,
      legacyTitles: [`Meta · ${id}`, `Template · ${id} (json)`],
    },
  ];
}

/**
 * @param {string} releaseDir
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {ImportEntry[]}
 */
export function prepareReleaseEntries(releaseDir, repoRoot, opts = {}) {
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), releaseDir).replace(
    /\\/g,
    '/',
  );
  const namespace = mapGitPathToAffineNamespace(rel, 'releases', opts.namespace);
  const releaseJsonPath = join(releaseDir, 'release.json');
  const readmePath = join(releaseDir, 'README.md');

  if (!existsSync(readmePath)) throw new Error(`Missing README.md: ${readmePath}`);

  const readme = readFileSync(readmePath, 'utf8');
  /** @type {Record<string, unknown> | null} */
  let releaseJson = null;
  if (existsSync(releaseJsonPath)) {
    releaseJson = JSON.parse(readFileSync(releaseJsonPath, 'utf8'));
  }

  const releaseId = String(releaseJson?.releaseId ?? basename(releaseDir));
  const contentTitle = opts.title?.trim() || buildDocTitle('release', releaseId);
  const metaTitle = buildDocTitle('release-meta', releaseId);

  /** @type {ImportEntry[]} */
  const entries = [
    {
      kind: 'release',
      id: releaseId,
      title: contentTitle,
      namespace,
      markdown: composeContentMarkdown(
        readme.endsWith('\n') ? readme.trimEnd() : readme,
        contentTitle,
        metaTitle,
        namespace,
      ),
      sourcePath: readmePath,
      pairRole: 'content',
      pairTitle: metaTitle,
    },
  ];

  if (releaseJson) {
    const pins = releaseJson.pins;
    /** @type {string[]} */
    const pinLines = [];
    if (pins && typeof pins === 'object') {
      for (const [slot, pin] of Object.entries(pins)) {
        pinLines.push(`- \`${slot}\` → \`${pin}\``);
      }
    }

    entries.push({
      kind: 'release-meta',
      id: releaseId,
      title: metaTitle,
      namespace,
      markdown: buildMetaMarkdown({
        kindLabel: 'Release',
        id: releaseId,
        contentTitle,
        metaTitle,
        namespace,
        fields: [
          ['releaseId', releaseJson.releaseId ?? releaseId],
          ['templateId', releaseJson.templateId],
          ['templateVersion', releaseJson.templateVersion],
          ['generatedAt', releaseJson.generatedAt],
          ['source', `docs/containers/strategic-docs/${rel}/`],
        ],
        purpose: `Published snapshot of template \`${releaseJson.templateId ?? releaseId}\` for Affine Releases.`,
        sections: [
          { heading: 'Pins', lines: pinLines.length ? pinLines : ['- _(none)_'] },
        ],
      }),
      sourcePath: releaseJsonPath,
      pairRole: 'meta',
      pairTitle: contentTitle,
      // Prior publish used flat `Meta · <id>` titles
      legacyTitles: [`Meta · ${releaseId}`],
    });
  }

  return entries;
}

/**
 * @param {string} inputPath
 * @param {AffineTarget} target
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {Promise<ImportEntry[]>}
 */
export async function resolveImportEntries(inputPath, target, repoRoot, opts = {}) {
  const strategicRoot = join(repoRoot, 'docs/containers/strategic-docs');
  const abs = resolve(inputPath);
  const rel = relative(strategicRoot, abs).replace(/\\/g, '/');

  if (rel.startsWith('..')) {
    if (statSync(abs).isFile() && abs.endsWith('.md')) {
      const namespace = opts.namespace ? normalizeNamespace(opts.namespace) : 'imports';
      const title = opts.title ?? basename(abs, '.md');
      return [
        {
          kind: 'file',
          title,
          namespace,
          markdown: readFileSync(abs, 'utf8'),
          sourcePath: abs,
        },
      ];
    }
    throw new Error(`Path must be under docs/containers/strategic-docs/: ${inputPath}`);
  }

  if (target === 'templates') {
    if (rel.startsWith('granules/')) {
      const granuleDir = statSync(abs).isDirectory() ? abs : resolve(abs, '..');
      return prepareGranuleEntry(granuleDir, repoRoot, opts);
    }
    if (rel.startsWith('templates/')) {
      const templateDir = statSync(abs).isDirectory() ? abs : resolve(abs, '..');
      return prepareTemplateEntry(templateDir, repoRoot, opts);
    }
    if (statSync(abs).isDirectory()) {
      if (existsSync(join(abs, 'granule.json'))) {
        return prepareGranuleEntry(abs, repoRoot, opts);
      }
      if (existsSync(join(abs, 'template.json'))) {
        return prepareTemplateEntry(abs, repoRoot, opts);
      }
    }
  }

  if (target === 'releases') {
    const releaseDir = statSync(abs).isDirectory() ? abs : resolve(abs, '..');
    return prepareReleaseEntries(releaseDir, repoRoot, opts);
  }

  throw new Error(`Unsupported import path for target ${target}: ${rel}`);
}

/**
 * @param {AffineTarget} target
 * @param {string} repoRoot
 * @returns {Promise<ImportEntry[]>}
 */
export async function discoverSyncPlan(target, repoRoot) {
  /** @type {ImportEntry[]} */
  const entries = [];

  if (target === 'templates') {
    for (const name of readdirSync(GRANULES_DIR)) {
      const dir = join(GRANULES_DIR, name);
      if (!statSync(dir).isDirectory()) continue;
      if (!existsSync(join(dir, 'granule.json'))) continue;
      entries.push(...(await prepareGranuleEntry(dir, repoRoot)));
    }
    for (const name of readdirSync(TEMPLATES_DIR)) {
      const dir = join(TEMPLATES_DIR, name);
      if (!statSync(dir).isDirectory()) continue;
      if (!existsSync(join(dir, 'template.json'))) continue;
      entries.push(...prepareTemplateEntry(dir, repoRoot));
    }
    entries.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.title.localeCompare(b.title));
    return entries;
  }

  const releasesDir = join(CONTAINER_ROOT, 'releases');
  for (const name of readdirSync(releasesDir)) {
    const dir = join(releasesDir, name);
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(join(dir, 'README.md'))) continue;
    entries.push(...prepareReleaseEntries(dir, repoRoot));
  }
  entries.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.title.localeCompare(b.title));
  return entries;
}

/**
 * @param {ImportEntry[]} entries
 * @param {string} outDir
 */
export function writeImportBundle(entries, outDir) {
  mkdirSync(outDir, { recursive: true });
  /** @type {Array<{
   *   title: string,
   *   namespace: string,
   *   file: string,
   *   sourcePath: string,
   *   kind: string,
   *   pairRole?: string,
   *   pairTitle?: string,
   *   legacyTitles?: string[],
   * }>} */
  const manifest = [];

  for (const entry of entries) {
    const dir = join(outDir, entry.namespace);
    mkdirSync(dir, { recursive: true });
    const safeName = entry.title.replace(/[<>:"/\\|?*]/g, '-');
    const file = join(dir, `${safeName}.md`);
    writeFileSync(file, entry.markdown, 'utf8');
    manifest.push({
      title: entry.title,
      namespace: entry.namespace,
      file: relative(outDir, file).replace(/\\/g, '/'),
      sourcePath: entry.sourcePath,
      kind: entry.kind,
      pairRole: entry.pairRole,
      pairTitle: entry.pairTitle,
      legacyTitles: entry.legacyTitles,
    });
  }

  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify({ entries: manifest, model: 'content+meta' }, null, 2)}\n`,
    'utf8',
  );
  return { outDir, manifest };
}

/** @returns {Promise<{ cookieHeader: string, csrf?: string, token?: string }>} */
export async function signIn(base = resolveBaseUrl()) {
  const token = process.env.AFFINE_API_TOKEN?.trim();
  if (token) return { cookieHeader: '', token };

  const email = process.env.AFFINE_EMAIL?.trim() || 'feedback@mmbrn.ru';
  const password =
    process.env.AFFINE_PASSWORD?.trim() ||
    process.env.AFFINE_ADMIN_PASSWORD?.trim() ||
    process.env.BACKGROUND_OFFICE_PASSWORD?.trim();

  if (!password) {
    throw new Error(
      'Affine auth missing: set AFFINE_API_TOKEN or AFFINE_PASSWORD / AFFINE_ADMIN_PASSWORD in root .env',
    );
  }

  const res = await fetch(`${base}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Affine sign-in failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
  const csrf = setCookies
    .find((c) => c.startsWith('affine_csrf_token='))
    ?.split(';')[0]
    ?.split('=')[1];
  return { cookieHeader, csrf };
}

export function resolveBaseUrl() {
  return (process.env.AFFINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

/** @param {string} base @param {{ cookieHeader: string, token?: string, csrf?: string }} auth */
export async function gql(base, auth, query, variables = {}) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth.cookieHeader) headers.cookie = auth.cookieHeader;
  if (auth.csrf) headers['x-affine-csrf-token'] = auth.csrf;

  const res = await fetch(`${base}/graphql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((/** @type {{ message: string }} */ e) => e.message).join('; '));
  }
  return json.data;
}

export async function listWorkspacesDetailed(base = resolveBaseUrl(), auth) {
  const session = auth ?? (await signIn(base));
  const me = await gql(base, session, 'query { currentUser { id email name } }');
  let workspaces;
  try {
    workspaces = await gql(
      base,
      session,
      'query { workspaces { id name createdAt } }',
    );
  } catch {
    workspaces = await gql(base, session, 'query { workspaces { id } }');
  }
  return { user: me.currentUser, workspaces: workspaces.workspaces ?? [] };
}

/**
 * @param {string} base
 * @param {string | undefined} workspaceId
 * @param {ImportEntry[]} entries
 */
export function ownerUiSteps(base, workspaceId, entries) {
  const ws = workspaceId ? `${base}/workspace/${workspaceId}` : `${base}/`;
  const namespaces = [...new Set(entries.map((e) => e.namespace))];
  return [
    `1. Sign in: ${base}/`,
    `2. Open workspace: ${ws}`,
    '3. Sidebar → Import → Markdown (per doc or batch from bundle folder)',
    `4. Create/open folder (namespace) named: ${namespaces.slice(0, 5).join(', ')}${namespaces.length > 5 ? '…' : ''} — affine-cli cannot create folders; UI Import or drag into the folder`,
    '5. Titles: Content (`Granule ·` / `Template ·` / `Release ·`) + linked Meta (`Meta · Granule ·` / `Meta · Template ·` / `Meta · Release ·`)',
    '6. Prefer `--push` (upsert by title + namespace tag). Re-import updates existing titles.',
    '',
    'Limitation: affine-cli has no folder/collection API — programmatic push tags docs with the namespace name; folder placement is UI-only until Affine exposes it.',
  ];
}
