/**
 * affine-push — programmatic import via external affine-cli (W3).
 *
 * Requires `affine` on PATH or AFFINE_CLI_PATH (https://github.com/tomohiro-owada/affine-cli).
 * Falls back with clear error when CLI missing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * @returns {string | null}
 */
export function resolveAffineCliPath() {
  const custom = process.env.AFFINE_CLI_PATH?.trim();
  if (custom) return custom;

  const probe = process.platform === 'win32' ? 'where affine' : 'which affine';
  const res = spawnSync(probe, [], { shell: true, encoding: 'utf8' });
  if (res.status === 0 && res.stdout.trim()) {
    return 'affine';
  }
  return null;
}

/**
 * @param {string} cli
 * @param {string} workspaceId
 * @returns {Map<string, string>} title → docId
 */
export function listDocsByTitle(cli, workspaceId) {
  const res = spawnSync(
    cli,
    ['doc', 'list', '--fields', 'id,title', '-w', workspaceId],
    {
      encoding: 'utf8',
      env: process.env,
      shell: process.platform === 'win32',
    },
  );
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
    // Plain text fallback: lines "id\ttitle" or similar
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
    const res = spawnSync(
      cli,
      ['doc', 'replace-markdown', '--doc-id', existingDocId, '--content', markdown, ...baseArgs],
      { encoding: 'utf8', env: process.env, shell: process.platform === 'win32' },
    );
    if (res.status !== 0) {
      throw new Error(
        `replace-markdown «${title}» failed: ${(res.stderr || res.stdout || '').slice(0, 300)}`,
      );
    }
    return { action: 'updated', docId: existingDocId, title };
  }

  const res = spawnSync(
    cli,
    ['doc', 'create-from-markdown', '--title', title, '--content', markdown, ...baseArgs],
    { encoding: 'utf8', env: process.env, shell: process.platform === 'win32' },
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
  for (const entry of entries) {
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
  return {
    ok: failed.length === 0,
    cli,
    results,
    error: failed.length ? `${failed.length} doc(s) failed` : undefined,
  };
}
