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

export { CONTAINER_ROOT as STRATEGIC_DOCS_ROOT };

/** Affine namespace folder = container id (not git `granules/` / `templates/` taxonomy). */
export const DEFAULT_CONTAINER_NAMESPACE = 'strategic-docs';

export const DEFAULT_BASE_URL = 'https://strategy.mmbrn.tech';

/** @typedef {'templates' | 'releases'} AffineTarget */

/** @typedef {{
 *   title: string,
 *   namespace: string,
 *   markdown: string,
 *   sourcePath: string,
 *   kind: 'granule' | 'template' | 'release' | 'release-meta' | 'file',
 *   id?: string,
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
 * @param {AffineTarget} target
 * @param {{ allowMissing?: boolean }} [opts]
 * @returns {string | undefined}
 */
export function resolveWorkspaceId(target, opts = {}) {
  const generic = process.env.AFFINE_WORKSPACE_ID?.trim();
  if (generic) return generic;

  if (target === 'templates') {
    const id = process.env.AFFINE_WORKSPACE_TEMPLATES_ID?.trim();
    if (!id) {
      if (opts.allowMissing) return undefined;
      throw new Error(
        'Missing AFFINE_WORKSPACE_TEMPLATES_ID (or AFFINE_WORKSPACE_ID). Run yarn affine:workspace:list',
      );
    }
    return id;
  }

  const id = process.env.AFFINE_WORKSPACE_RELEASES_ID?.trim();
  if (!id) {
    if (opts.allowMissing) return undefined;
    throw new Error(
      'Missing AFFINE_WORKSPACE_RELEASES_ID (or AFFINE_WORKSPACE_ID). Run yarn affine:workspace:list',
    );
  }
  return id;
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
 * @param {'granule' | 'template' | 'release' | 'release-meta' | 'file'} kind
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
    case 'release-meta':
      return `Meta · ${id}`;
    default:
      return id;
  }
}

/**
 * @param {Record<string, unknown>} meta
 * @param {string} kindLabel
 */
export function buildMetadataBlock(meta, kindLabel) {
  const lines = [
    '<!-- affine-strategic-docs-metadata -->',
    '',
    `> **${kindLabel} metadata** (git SoT)`,
    '',
    '| Field | Value |',
    '| --- | --- |',
  ];
  const fields = [
    ['id', meta.id],
    ['version', meta.version ?? meta.templateVersion ?? meta.releaseId],
    ['kind', meta.kind],
    ['source', meta.source ?? meta.bodyPath ?? meta.repoPath],
  ];

  for (const [key, val] of fields) {
    if (val != null && val !== '') lines.push(`| ${key} | \`${String(val)}\` |`);
  }

  if (meta.description) lines.push('', meta.description);
  if (Array.isArray(meta.foundations) && meta.foundations.length) {
    lines.push('', '**Foundations:**');
    for (const f of meta.foundations) {
      if (typeof f === 'string') lines.push(`- ${f}`);
      else if (f && typeof f === 'object' && 'path' in f) lines.push(`- ${f.path}`);
    }
  }
  if (Array.isArray(meta.usedBy) && meta.usedBy.length) {
    lines.push('', '**Used by:**');
    for (const u of meta.usedBy) {
      if (u && typeof u === 'object') {
        lines.push(`- template \`${u.templateId}\` slot \`${u.placeholder}\` pin \`${u.pin}\``);
      }
    }
  }

  lines.push('', '<!-- /affine-strategic-docs-metadata -->', '');
  return lines.join('\n');
}

/**
 * @param {string} body
 * @param {string} metadataBlock
 */
export function composeMarkdown(body, metadataBlock) {
  const trimmed = body.replace(/^\uFEFF/, '').trimEnd();
  return `${metadataBlock}\n${trimmed}\n`;
}

/**
 * @param {Record<string, unknown>} granuleJson
 * @param {string} granuleDir
 */
export async function resolveGranuleBody(granuleJson, granuleDir) {
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
      pureIoThrow,
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
 * @returns {Promise<ImportEntry>}
 */
export async function prepareGranuleEntry(granuleDir, repoRoot, opts = {}) {
  const metaPath = join(granuleDir, 'granule.json');
  if (!existsSync(metaPath)) throw new Error(`Missing granule.json: ${granuleDir}`);
  const granuleJson = JSON.parse(readFileSync(metaPath, 'utf8'));
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), granuleDir).replace(/\\/g, '/');
  const namespace = mapGitPathToAffineNamespace(rel, 'templates', opts.namespace);
  const body = await resolveGranuleBody(granuleJson, granuleDir);
  const meta = {
    ...granuleJson,
    source: `docs/containers/strategic-docs/${rel}/body.md`,
  };
  const markdown = composeMarkdown(body, buildMetadataBlock(meta, 'Granule'));
  return {
    kind: 'granule',
    id: granuleJson.id,
    title: buildDocTitle('granule', granuleJson.id, opts.title),
    namespace,
    markdown,
    sourcePath: granuleDir,
  };
}

/**
 * @param {string} templateDir
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {ImportEntry}
 */
export function prepareTemplateEntry(templateDir, repoRoot, opts = {}) {
  const metaPath = join(templateDir, 'template.json');
  if (!existsSync(metaPath)) throw new Error(`Missing template.json: ${templateDir}`);
  const templateJson = JSON.parse(readFileSync(metaPath, 'utf8'));
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), templateDir).replace(/\\/g, '/');
  const namespace = mapGitPathToAffineNamespace(rel, 'templates', opts.namespace);

  const slotsTable =
    '| Slot | Granule | Pin |\n| --- | --- | --- |\n' +
    (templateJson.slots ?? [])
      .map(
        (/** @type {{ placeholder?: string, granuleId?: string, pin?: string }} */ s) =>
          `| ${s.placeholder ?? ''} | ${s.granuleId ?? ''} | ${s.pin ?? ''} |`,
      )
      .join('\n');

  const body = [
    `# ${templateJson.id}@${templateJson.version}`,
    '',
    templateJson.meta?.description ?? '',
    '',
    '## Skeleton',
    '',
    '```text',
    templateJson.skeleton ?? '',
    '```',
    '',
    '## Slots',
    '',
    slotsTable,
  ].join('\n');

  const markdown = composeMarkdown(body, buildMetadataBlock(templateJson, 'Template'));
  return {
    kind: 'template',
    id: templateJson.id,
    title: buildDocTitle('template', templateJson.id, opts.title),
    namespace,
    markdown,
    sourcePath: templateDir,
  };
}

/**
 * @param {string} releaseDir
 * @param {string} repoRoot
 * @param {{ namespace?: string, title?: string }} [opts]
 * @returns {ImportEntry[]}
 */
export function prepareReleaseEntries(releaseDir, repoRoot, opts = {}) {
  const rel = relative(join(repoRoot, 'docs/containers/strategic-docs'), releaseDir).replace(/\\/g, '/');
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
  const releaseTitle = opts.title?.trim() || buildDocTitle('release', releaseId);

  /** @type {ImportEntry[]} */
  const entries = [
    {
      kind: 'release',
      id: releaseId,
      title: releaseTitle,
      namespace,
      markdown: readme.endsWith('\n') ? readme : `${readme}\n`,
      sourcePath: readmePath,
    },
  ];

  if (releaseJson) {
    const metaBody = [
      `# Meta · ${releaseId}`,
      '',
      '```json',
      JSON.stringify(releaseJson, null, 2),
      '```',
    ].join('\n');
    entries.push({
      kind: 'release-meta',
      id: releaseId,
      title: buildDocTitle('release-meta', releaseId),
      namespace,
      markdown: metaBody,
      sourcePath: releaseJsonPath,
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
      return [await prepareGranuleEntry(granuleDir, repoRoot, opts)];
    }
    if (rel.startsWith('templates/')) {
      const templateDir = statSync(abs).isDirectory() ? abs : resolve(abs, '..');
      return [prepareTemplateEntry(templateDir, repoRoot, opts)];
    }
    if (statSync(abs).isDirectory()) {
      const name = basename(abs);
      if (existsSync(join(abs, 'granule.json'))) {
        return [await prepareGranuleEntry(abs, repoRoot, opts)];
      }
      if (existsSync(join(abs, 'template.json'))) {
        return [prepareTemplateEntry(abs, repoRoot, opts)];
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
      entries.push(await prepareGranuleEntry(dir, repoRoot));
    }
    for (const name of readdirSync(TEMPLATES_DIR)) {
      const dir = join(TEMPLATES_DIR, name);
      if (!statSync(dir).isDirectory()) continue;
      if (!existsSync(join(dir, 'template.json'))) continue;
      entries.push(prepareTemplateEntry(dir, repoRoot));
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
  /** @type {Array<{ title: string, namespace: string, file: string, sourcePath: string, kind: string }>} */
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
    });
  }

  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify({ entries: manifest }, null, 2)}\n`, 'utf8');
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
  return [
    `1. Sign in: ${base}/`,
    `2. Open workspace: ${ws}`,
    '3. Sidebar → Import → Markdown (per doc or batch from bundle folder)',
    `4. Place docs under namespace folder(s): ${[...new Set(entries.map((e) => e.namespace))].slice(0, 5).join(', ')}${entries.length > 5 ? '…' : ''}`,
    '5. Match doc titles from manifest.json (Granule · id / Release · id / Meta · id)',
    '6. Copy imported doc URLs back into SURFACE.md if needed',
    '',
    'Limitation (v1): no stable GraphQL markdown-create on self-host stable — bundle export + UI import.',
    'Follow-up: affine-cli create-from-markdown or server DocWriter when exposed.',
  ];
}
