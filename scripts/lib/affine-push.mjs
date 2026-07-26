/**
 * affine-push — programmatic import via external affine-cli (W3).
 *
 * Requires `affine-cli` on PATH, GOPATH/bin, or AFFINE_CLI_PATH.
 * https://github.com/tomohiro-owada/affine-cli
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { resolveBaseUrl } from './affine-import.mjs';

/**
 * Env for affine-cli child processes — inherits root .env, ensures base URL.
 * @returns {NodeJS.ProcessEnv}
 */
export function buildAffineCliEnv() {
  const env = { ...process.env };
  if (!env.AFFINE_BASE_URL?.trim()) {
    env.AFFINE_BASE_URL = resolveBaseUrl();
  }
  return env;
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
        'affine-cli not authenticated. Set AFFINE_BASE_URL + AFFINE_API_TOKEN (or AFFINE_PASSWORD) in root .env, then run: affine-cli auth status',
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
    `GraphQL auth OK; doc content needs WebSocket (socket.io) to ${root}. ` +
    'If timeout from dev machine — VPN/firewall or Caddy WS on strategy VDS. ' +
    'Bundle is saved — use Import → Markdown in Affine UI (see JSON bundleDir).'
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
 * @returns {{ ok: boolean, cli: string, results: object[], error?: string }}
 */
export function pushImportBundle(opts) {
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

  /** @type {object[]} */
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!dryRun) {
      console.error(`[affine-push] ${i + 1}/${entries.length}: ${entry.title}`);
    }
    const filePath = join(bundleDir, entry.file);
    if (!existsSync(filePath)) {
      results.push({ title: entry.title, ok: false, error: `file missing: ${entry.file}` });
      continue;
    }
    const markdown = readFileSync(filePath, 'utf8');
    const existingId = byTitle.get(entry.title);
    try {
      const r = pushOneDoc(cli, workspaceId, entry.title, markdown, existingId, dryRun);
      results.push({ ...r, ok: true, namespace: entry.namespace });
    } catch (err) {
      results.push({
        title: entry.title,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const baseUrl = buildAffineCliEnv().AFFINE_BASE_URL;
  return {
    ok: failed.length === 0,
    cli,
    results,
    socketIoBlocked: detectSocketIoBlocked(results),
    error: failed.length ? summarizePushFailures(results, { baseUrl }) : undefined,
  };
}
