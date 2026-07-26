/**
 * affine-push — programmatic import via external affine-cli (W3).
 *
 * Requires `affine-cli` on PATH, GOPATH/bin, or AFFINE_CLI_PATH.
 * https://github.com/tomohiro-owada/affine-cli
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { resolveBaseUrl, signIn } from './affine-import.mjs';

/** @type {NodeJS.ProcessEnv | null} */
let pushCliEnv = null;

/**
 * Env for affine-cli child processes — inherits root .env, ensures base URL.
 * @returns {NodeJS.ProcessEnv}
 */
export function buildAffineCliEnv() {
  if (pushCliEnv) return { ...pushCliEnv };

  const env = { ...process.env };
  if (!env.AFFINE_BASE_URL?.trim()) {
    env.AFFINE_BASE_URL = resolveBaseUrl();
  }
  if (!env.AFFINE_PASSWORD?.trim() && env.AFFINE_ADMIN_PASSWORD?.trim()) {
    env.AFFINE_PASSWORD = env.AFFINE_ADMIN_PASSWORD.trim();
  }
  return env;
}

/**
 * AFFiNE socket.io auth reads session cookies from the WebSocket upgrade request.
 * GraphQL bearer tokens alone make affine-cli fail with `missing 'data' field`.
 *
 * @param {{ cookieHeader: string, token?: string }} auth
 * @returns {NodeJS.ProcessEnv}
 */
export function buildAffineCliEnvFromAuth(auth) {
  const env = buildAffineCliEnv();
  if (auth.cookieHeader) {
    env.AFFINE_COOKIE = auth.cookieHeader;
    delete env.AFFINE_API_TOKEN;
  } else if (auth.token) {
    env.AFFINE_API_TOKEN = auth.token;
  }
  return env;
}

/**
 * Resolve session cookies for socket.io doc writes (prefers password sign-in).
 * @returns {Promise<NodeJS.ProcessEnv>}
 */
export async function prepareAffineCliPushEnv() {
  if (pushCliEnv) return pushCliEnv;

  const base = resolveBaseUrl();
  const hasPassword = Boolean(
    process.env.AFFINE_PASSWORD?.trim() || process.env.AFFINE_ADMIN_PASSWORD?.trim(),
  );

  /** @type {{ cookieHeader: string, token?: string }} */
  let auth;
  if (hasPassword) {
    const savedToken = process.env.AFFINE_API_TOKEN;
    delete process.env.AFFINE_API_TOKEN;
    auth = await signIn(base);
    if (savedToken) process.env.AFFINE_API_TOKEN = savedToken;
  } else {
    auth = await signIn(base);
  }

  if (!auth.cookieHeader && !auth.token) {
    throw new Error(
      'Affine push auth missing: set AFFINE_PASSWORD / AFFINE_ADMIN_PASSWORD (preferred for socket.io) or AFFINE_API_TOKEN in root .env',
    );
  }

  pushCliEnv = buildAffineCliEnvFromAuth(auth);
  return pushCliEnv;
}

/** Reset cached push env (tests). */
export function resetAffineCliPushEnv() {
  pushCliEnv = null;
}

/** Windows CreateProcess argv budget; larger bodies need a follow-up (temp file). */
const MAX_CONTENT_ARG_CHARS = 30_000;

/**
 * @param {string} cli
 * @param {string[]} args
 */
function runAffineCli(cli, args) {
  return spawnSync(cli, args, {
    encoding: 'utf8',
    env: buildAffineCliEnv(),
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
  });
}

/**
 * affine-cli on Windows does not reliably read piped stdin from Node; use --content.
 *
 * @param {string} cli
 * @param {string[]} argsWithoutContent
 * @param {string} markdown
 */
function runAffineCliWithMarkdown(cli, argsWithoutContent, markdown) {
  if (markdown.length > MAX_CONTENT_ARG_CHARS) {
    throw new Error(
      `markdown too large for affine-cli --content (${markdown.length} chars > ${MAX_CONTENT_ARG_CHARS})`,
    );
  }
  return runAffineCli(cli, [...argsWithoutContent, '--content', markdown]);
}

/**
 * @param {string} cli
 */
export function assertAffineCliAuth(cli) {
  const res = runAffineCli(cli, ['auth', 'status']);
  const text = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim();
  try {
    const parsed = JSON.parse((res.stdout ?? '').trim());
    if (parsed.authenticated === true) return;
    throw new Error(
      parsed.error ??
        'affine-cli not authenticated. Set AFFINE_BASE_URL + AFFINE_PASSWORD (or AFFINE_API_TOKEN) in root .env, then run: affine-cli auth status',
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes('affine-cli not authenticated')) throw err;
    if (err instanceof Error && err.message.includes('AFFINE_BASE_URL')) throw err;
    throw new Error(
      `affine-cli auth check failed (${res.status ?? 1}): ${text.slice(0, 400)}`,
    );
  }
}

/**
 * @param {string} message
 */
export function isSocketIoPushError(message) {
  const m = String(message ?? '').toLowerCase();
  return m.includes('socket.io') || m.includes("missing 'data' field");
}

/**
 * @param {object[]} results
 */
export function detectSocketIoBlocked(results) {
  const failed = results.filter((r) => !r.ok);
  if (!failed.length) return false;
  return failed.every((r) => isSocketIoPushError(r.error));
}

/**
 * Human hint when GraphQL works but socket.io doc writes fail.
 * @param {string} [baseUrl]
 */
export function socketIoPushHint(baseUrl = resolveBaseUrl()) {
  const root = baseUrl.replace(/\/graphql\/?$/u, '').replace(/\/$/u, '');
  return (
    `Doc writes use socket.io at ${root}/socket.io/ (not /graphql). ` +
    'GraphQL bearer tokens alone often fail — set AFFINE_PASSWORD / AFFINE_ADMIN_PASSWORD for session cookies. ' +
    `Probe: curl.exe -s "${root}/socket.io/?EIO=4&transport=polling" (expect sid JSON). ` +
    'Bundle saved — use Import → Markdown in Affine UI (see JSON bundleDir).'
  );
}

/**
 * @param {object[]} results
 * @param {{ baseUrl?: string }} [opts]
 */
function summarizePushFailures(results, opts = {}) {
  const failed = results.filter((r) => !r.ok);
  if (!failed.length) return '';
  const sample = failed
    .slice(0, 3)
    .map((r) => `  - ${r.title}: ${r.error ?? 'unknown'}`)
    .join('\n');
  let msg = `${failed.length} doc(s) failed:\n${sample}`;
  if (detectSocketIoBlocked(results)) {
    msg += `\n\n${socketIoPushHint(opts.baseUrl)}`;
  }
  return msg;
}

/**
 * @returns {string | null} CLI command or absolute path to invoke
 */
export function resolveAffineCliPath() {
  const custom = process.env.AFFINE_CLI_PATH?.trim();
  if (custom) return custom;

  const candidates =
    process.platform === 'win32'
      ? ['affine-cli', 'affine']
      : ['affine', 'affine-cli'];

  for (const name of candidates) {
    const probe = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
    const res = spawnSync(probe, [], { shell: true, encoding: 'utf8' });
    if (res.status === 0 && res.stdout.trim()) {
      const first = res.stdout.trim().split(/\r?\n/u)[0]?.trim();
      return first || name;
    }
  }

  const gopath = process.env.GOPATH?.trim();
  if (gopath) {
    const exe = process.platform === 'win32' ? 'affine-cli.exe' : 'affine-cli';
    const fallback = join(gopath, 'bin', exe);
    if (existsSync(fallback)) return fallback;
  }

  return null;
}

/**
 * @param {string} cli
 * @param {string} workspaceId
 * @returns {Map<string, string>} title → docId
 */
export function listDocsByTitle(cli, workspaceId) {
  const res = runAffineCli(cli, ['doc', 'list', '--fields', 'id,title', '-w', workspaceId]);
  if (res.status !== 0) {
    throw new Error(
      `affine doc list failed (${res.status}): ${(res.stderr || res.stdout || '').slice(0, 300)}`,
    );
  }

  /** @type {Map<string, string>} */
  const map = new Map();
  const text = (res.stdout || '').trim();
  if (!text) return map;

  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.docs ?? parsed.data ?? [];
    for (const row of rows) {
      if (row?.title && row?.id) map.set(String(row.title), String(row.id));
    }
    return map;
  } catch {
    for (const line of text.split(/\r?\n/u)) {
      const m = line.match(/([0-9a-f-]{36})\s+(.+)/iu);
      if (m) map.set(m[2].trim(), m[1]);
    }
    return map;
  }
}

/**
 * Resolve existing doc id by preferred title, then legacy titles (upsert without dupes).
 * @param {Map<string, string>} byTitle
 * @param {string} title
 * @param {string[]} [legacyTitles]
 */
export function resolveExistingDocId(byTitle, title, legacyTitles = []) {
  if (byTitle.has(title)) return byTitle.get(title);
  for (const legacy of legacyTitles) {
    if (legacy && byTitle.has(legacy)) return byTitle.get(legacy);
  }
  return undefined;
}

/**
 * Ensure a workspace tag exists for the namespace (best available Affine grouping —
 * affine-cli has no folder/collection/parent API).
 *
 * @param {string} cli
 * @param {string} workspaceId
 * @param {string} namespace
 * @param {boolean} dryRun
 * @param {Set<string>} ensured
 */
export function ensureNamespaceTag(cli, workspaceId, namespace, dryRun, ensured) {
  const tag = String(namespace || '').trim();
  if (!tag || ensured.has(tag)) return;
  const baseArgs = ['-w', workspaceId];
  if (dryRun) baseArgs.push('--dry-run');

  const list = runAffineCli(cli, ['tag', 'list', ...baseArgs]);
  const text = `${list.stdout ?? ''}\n${list.stderr ?? ''}`;
  if (list.status === 0 && text.toLowerCase().includes(tag.toLowerCase())) {
    ensured.add(tag);
    return;
  }

  const create = runAffineCli(cli, ['tag', 'create', '--name', tag, ...baseArgs]);
  if (create.status !== 0) {
    const err = `${create.stderr || create.stdout || ''}`.toLowerCase();
    // Idempotent: tag may already exist under another list format
    if (!err.includes('already') && !err.includes('exist')) {
      throw new Error(
        `tag create «${tag}» failed: ${(create.stderr || create.stdout || '').slice(0, 300)}`,
      );
    }
  }
  ensured.add(tag);
}

/**
 * @param {string} cli
 * @param {string} workspaceId
 * @param {string} docId
 * @param {string} namespace
 * @param {boolean} dryRun
 */
export function tagDocWithNamespace(cli, workspaceId, docId, namespace, dryRun) {
  const tag = String(namespace || '').trim();
  if (!tag || !docId) return;
  const args = ['tag', 'add', '--tag', tag, '--doc-id', docId, '-w', workspaceId];
  if (dryRun) args.push('--dry-run');
  const res = runAffineCli(cli, args);
  if (res.status !== 0) {
    const err = `${res.stderr || res.stdout || ''}`.toLowerCase();
    if (err.includes('already') || err.includes('exist')) return;
    throw new Error(
      `tag add «${tag}» → ${docId} failed: ${(res.stderr || res.stdout || '').slice(0, 300)}`,
    );
  }
}

/**
 * @param {string} cli
 * @param {string} workspaceId
 * @param {string} title
 * @param {string} markdown
 * @param {string | undefined} existingDocId
 * @param {boolean} dryRun
 */
export function pushOneDoc(cli, workspaceId, title, markdown, existingDocId, dryRun) {
  const baseArgs = ['-w', workspaceId];
  if (dryRun) baseArgs.push('--dry-run');

  if (existingDocId) {
    const res = runAffineCliWithMarkdown(
      cli,
      ['doc', 'replace-markdown', '--doc-id', existingDocId, ...baseArgs],
      markdown,
    );
    if (res.status !== 0) {
      throw new Error(
        `replace-markdown «${title}» failed: ${(res.stderr || res.stdout || '').slice(0, 300)}`,
      );
    }
    return { action: 'updated', docId: existingDocId, title };
  }

  const res = runAffineCliWithMarkdown(
    cli,
    ['doc', 'create-from-markdown', '--title', title, ...baseArgs],
    markdown,
  );
  if (res.status !== 0) {
    throw new Error(
      `create-from-markdown «${title}» failed: ${(res.stderr || res.stdout || '').slice(0, 300)}`,
    );
  }

  let docId;
  try {
    const out = JSON.parse((res.stdout || '').trim());
    docId = out.id ?? out.docId ?? out.doc_id;
  } catch {
    docId = undefined;
  }
  return { action: 'created', docId, title };
}

/**
 * Push all entries from import bundle manifest via affine-cli.
 *
 * @param {{ bundleDir: string, workspaceId: string, dryRun?: boolean }} opts
 * @returns {Promise<{ ok: boolean, cli: string, results: object[], error?: string }>}
 */
export async function pushImportBundle(opts) {
  const { bundleDir, workspaceId, dryRun = false } = opts;
  const cli = resolveAffineCliPath();
  if (!cli) {
    return {
      ok: false,
      cli: '',
      results: [],
      error:
        'affine-cli not found. Install: go install github.com/tomohiro-owada/affine-cli@latest — or set AFFINE_CLI_PATH',
    };
  }

  const manifestPath = join(bundleDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return { ok: false, cli, results: [], error: `manifest missing: ${manifestPath}` };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entries = manifest.entries ?? manifest;
  if (!Array.isArray(entries)) {
    return { ok: false, cli, results: [], error: 'manifest.entries — not array' };
  }

  if (!dryRun) {
    try {
      await prepareAffineCliPushEnv();
    } catch (err) {
      return {
        ok: false,
        cli,
        dryRun: false,
        results: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
    assertAffineCliAuth(cli);
  }

  /** @type {Map<string, string>} */
  let byTitle = new Map();
  if (!dryRun) {
    try {
      byTitle = listDocsByTitle(cli, workspaceId);
    } catch {
      byTitle = new Map();
    }
  }

  /** @type {Set<string>} */
  const ensuredTags = new Set();
  /** @type {object[]} */
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!dryRun) {
      console.error(`[affine-push] ${i + 1}/${entries.length}: ${entry.title}`);
    } else {
      console.error(`[affine-push] dry-run ${i + 1}/${entries.length}: ${entry.title}`);
    }
    const filePath = join(bundleDir, entry.file);
    if (!existsSync(filePath)) {
      results.push({ title: entry.title, ok: false, error: `file missing: ${entry.file}` });
      continue;
    }
    const markdown = readFileSync(filePath, 'utf8');
    const legacyTitles = Array.isArray(entry.legacyTitles) ? entry.legacyTitles : [];
    const existingId = resolveExistingDocId(byTitle, entry.title, legacyTitles);
    try {
      if (entry.namespace) {
        try {
          ensureNamespaceTag(cli, workspaceId, entry.namespace, dryRun, ensuredTags);
        } catch (tagErr) {
          // Tag API is best-effort grouping; do not block content push.
          console.error(
            `[affine-push] namespace tag warn: ${tagErr instanceof Error ? tagErr.message : tagErr}`,
          );
        }
      }

      const r = pushOneDoc(cli, workspaceId, entry.title, markdown, existingId, dryRun);
      if (r.docId && entry.namespace) {
        try {
          tagDocWithNamespace(cli, workspaceId, r.docId, entry.namespace, dryRun);
        } catch (tagErr) {
          console.error(
            `[affine-push] tag add warn: ${tagErr instanceof Error ? tagErr.message : tagErr}`,
          );
        }
      }
      if (r.docId) byTitle.set(entry.title, r.docId);
      results.push({
        ...r,
        ok: true,
        namespace: entry.namespace,
        pairRole: entry.pairRole,
        pairTitle: entry.pairTitle,
        dryRun: Boolean(dryRun),
      });
    } catch (err) {
      results.push({
        title: entry.title,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        dryRun: Boolean(dryRun),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const baseUrl = buildAffineCliEnv().AFFINE_BASE_URL;
  return {
    ok: failed.length === 0,
    cli,
    dryRun: Boolean(dryRun),
    results,
    socketIoBlocked: detectSocketIoBlocked(results),
    namespaceStrategy:
      'tag (affine-cli has no folder/collection API; create UI folder manually if needed)',
    error: failed.length ? summarizePushFailures(results, { baseUrl }) : undefined,
  };
}
