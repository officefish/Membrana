#!/usr/bin/env node
/**
 * yarn strategic-docs:publish — мастерская: generate (опц.) + export/push → Affine.
 *
 *   yarn strategic-docs:publish --dry-run --template readme-main
 *   yarn strategic-docs:publish --push --target templates --skip-generate
 *
 * Канон: docs/containers/strategic-docs/PUBLISH.md
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';
import {
  DEFAULT_CONTAINER_NAMESPACE,
  discoverSyncPlan,
  listWorkspacesDetailed,
  ownerUiSteps,
  resolveBaseUrl,
  resolveImportEntries,
  resolveWorkspaceId,
  signIn,
  writeImportBundle,
} from './lib/affine-import.mjs';
import { pushImportBundle, resolveAffineCliPath, socketIoPushHint } from './lib/affine-push.mjs';

loadDotEnv();

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTAINER_ROOT = 'docs/containers/strategic-docs';

/** @typedef {'all' | 'templates' | 'releases'} PublishTarget */
/** @typedef {'templates' | 'releases'} AffineTarget */

/**
 * @param {string[]} argv
 */
export function parsePublishArgs(argv) {
  /** @type {{
 *   help?: boolean,
 *   dryRun: boolean,
 *   push: boolean,
 *   skipGenerate: boolean,
 *   template?: string,
 *   target: PublishTarget,
 *   namespace: string,
 * }} */
  const out = {
    dryRun: false,
    push: false,
    skipGenerate: false,
    target: 'all',
    namespace: DEFAULT_CONTAINER_NAMESPACE,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--push') out.push = true;
    else if (a === '--skip-generate') out.skipGenerate = true;
    else if (a === '--template') out.template = argv[++i];
    else if (a.startsWith('--template=')) out.template = a.slice('--template='.length);
    else if (a === '--target') {
      const t = argv[++i];
      if (t !== 'all' && t !== 'templates' && t !== 'releases') {
        throw new Error(`--target: expected all|templates|releases, got ${t}`);
      }
      out.target = t;
    } else if (a.startsWith('--target=')) {
      const t = a.slice('--target='.length);
      if (t !== 'all' && t !== 'templates' && t !== 'releases') {
        throw new Error(`--target: expected all|templates|releases, got ${t}`);
      }
      out.target = t;
    } else if (a === '--namespace') out.namespace = argv[++i];
    else if (a.startsWith('--namespace=')) out.namespace = a.slice('--namespace='.length);
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

/**
 * @param {string} templateId
 * @param {boolean} dryRun
 */
function runGenerate(templateId, dryRun) {
  const script = join(repoRoot, 'scripts/strategic-docs-generate.mjs');
  const args = ['--template', templateId];
  if (dryRun) args.push('--dry-run');
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`strategic-docs:generate failed (exit ${res.status ?? 1})`);
  }
}

/**
 * @param {AffineTarget} target
 * @param {ReturnType<typeof parsePublishArgs>} opts
 * @param {string | undefined} releaseTemplate
 */
async function exportTarget(target, opts, releaseTemplate) {
  const base = resolveBaseUrl();
  const workspaceId = resolveWorkspaceId(target, { allowMissing: opts.dryRun && !opts.push });

  let entries;
  if (target === 'templates') {
    entries = await discoverSyncPlan('templates', repoRoot);
    if (opts.namespace) {
      entries = entries.map((e) => ({ ...e, namespace: opts.namespace }));
    }
  } else if (releaseTemplate) {
    const releasePath = join(repoRoot, CONTAINER_ROOT, 'releases', releaseTemplate);
    entries = await resolveImportEntries(releasePath, 'releases', repoRoot, {
      namespace: opts.namespace,
    });
  } else {
    entries = await discoverSyncPlan('releases', repoRoot);
    if (opts.namespace) {
      entries = entries.map((e) => ({ ...e, namespace: opts.namespace }));
    }
  }

  /** @type {{ id?: string, email?: string, name?: string } | null} */
  let user = null;
  let authError;
  try {
    const auth = await signIn(base);
    const listed = await listWorkspacesDetailed(base, auth);
    user = listed.user;
  } catch (err) {
    authError = err instanceof Error ? err.message : String(err);
  }

  if (opts.dryRun && !opts.push) {
    return {
      ok: true,
      dryRun: true,
      target,
      base,
      user,
      authError,
      workspaceId: workspaceId ?? null,
      workspaceMissing: !workspaceId,
      entryCount: entries.length,
      entries: entries.map((e) => ({
        title: e.title,
        namespace: e.namespace,
        kind: e.kind,
        sourcePath: e.sourcePath,
      })),
      ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
      pushAvailable: Boolean(resolveAffineCliPath()),
      limitation: opts.push
        ? null
        : 'v1 default: bundle + UI Import. Use --push with affine-cli installed.',
    };
  }

  if (!workspaceId) {
    throw new Error(
      `Missing AFFINE_WORKSPACE_${target === 'templates' ? 'TEMPLATES' : 'RELEASES'}_ID`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(repoRoot, 'scripts/cache/affine-import', `publish-${target}-${stamp}`);
  const { manifest } = writeImportBundle(entries, outDir);

  /** @type {object} */
  const result = {
    ok: true,
    status: opts.push ? 'push' : 'bundle-export',
    target,
    base,
    user,
    workspaceId,
    workspaceUrl: `${base}/workspace/${workspaceId}`,
    bundleDir: outDir,
    entryCount: manifest.length,
    manifest: join(outDir, 'manifest.json'),
    ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
  };

  if (opts.push) {
    const cli = resolveAffineCliPath();
    if (!cli) {
      throw new Error(
        'affine-cli not found for --push. Install: go install github.com/tomohiro-owada/affine-cli@latest',
      );
    }
    console.error(
      `[strategic-docs:publish] pushing ${entries.length} doc(s) → ${target} workspace ${workspaceId}`,
    );
    const push = pushImportBundle({ bundleDir: outDir, workspaceId, dryRun: false });
    result.push = push;
    result.ok = push.ok;
    if (!push.ok) {
      result.status = 'push-failed-bundle-ready';
      result.pushFailed = true;
      result.socketIoBlocked = push.socketIoBlocked === true;
      if (result.socketIoBlocked) {
        result.pushHint = socketIoPushHint(base);
      }
      return result;
    }
  }

  return result;
}

/**
 * @param {PublishTarget} target
 * @param {ReturnType<typeof parsePublishArgs>} opts
 */
async function runPublishSteps(target, opts) {
  /** @type {object[]} */
  const reports = [];

  if (target === 'all' || target === 'templates') {
    reports.push(await exportTarget('templates', opts, undefined));
  }

  if (target === 'all' || target === 'releases') {
    reports.push(await exportTarget('releases', opts, opts.template));
  }

  for (const r of reports) {
    console.log(JSON.stringify(r, null, 2));
  }

  const pushFailed = reports.filter((r) => r.pushFailed);
  if (pushFailed.length) {
    for (const r of pushFailed) {
      console.error('');
      console.error('[strategic-docs:publish] push failed — bundle saved for UI Import:');
      console.error(`  bundleDir: ${r.bundleDir}`);
      console.error(`  manifest:  ${r.manifest}`);
      console.error(`  workspace: ${r.workspaceUrl}`);
      if (r.pushHint) console.error(`  hint: ${r.pushHint}`);
    }
    throw new Error(pushFailed[0].push?.error ?? 'affine push failed');
  }

  return reports;
}

function usage() {
  console.log(`Usage: yarn strategic-docs:publish [options]

Options:
  --template <id>           Run generate before publish (unless --skip-generate)
  --target all|templates|releases   Default: all
  --dry-run                 Plan only (add --push to probe affine-cli)
  --push                    Push via affine-cli (requires install on PATH)
  --skip-generate           Skip generate step
  --namespace <id>          Affine namespace (default: strategic-docs)

Examples:
  yarn strategic-docs:publish --dry-run --template readme-main
  yarn strategic-docs:publish --push --target templates --skip-generate
  yarn strategic-docs:publish --push --template affine-surface-policy

See docs/containers/strategic-docs/PUBLISH.md`);
}

/**
 * @param {string[]} [argv]
 */
export async function runStrategicDocsPublish(argv = process.argv.slice(2)) {
  const opts = parsePublishArgs(argv);
  if (opts.help) {
    usage();
    return;
  }

  if (opts.template && !opts.skipGenerate) {
    runGenerate(opts.template, opts.dryRun);
  }

  const reports = await runPublishSteps(opts.target, opts);

  const needsUi = reports.some((r) => r.status === 'bundle-export');
  if (needsUi && !opts.dryRun) {
    console.error('');
    console.error('[strategic-docs:publish] bundle ready — finish via Import → Markdown or rerun with --push');
  }
}

async function main() {
  await runStrategicDocsPublish();
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error('[strategic-docs:publish]', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
