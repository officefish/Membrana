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
import { guardAffinePublishFreeze } from './lib/strategic-docs-affine-freeze.mjs';

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
 *   targetExplicit: boolean,
 *   namespace: string,
 * }} */
  const out = {
    dryRun: false,
    push: false,
    skipGenerate: false,
    target: 'all',
    targetExplicit: false,
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
      out.targetExplicit = true;
    } else if (a.startsWith('--target=')) {
      const t = a.slice('--target='.length);
      if (t !== 'all' && t !== 'templates' && t !== 'releases') {
        throw new Error(`--target: expected all|templates|releases, got ${t}`);
      }
      out.target = t;
      out.targetExplicit = true;
    } else if (a === '--namespace') out.namespace = argv[++i];
    else if (a.startsWith('--namespace=')) out.namespace = a.slice('--namespace='.length);
    else throw new Error(`Unknown arg: ${a}`);
  }

  // Publishing a named template without --target means "this release", not "all
  // granules+templates into whatever workspace". Prevents Templates→Releases mixups.
  if (out.template && !out.targetExplicit) {
    out.target = 'releases';
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

  const envKey =
    target === 'templates' ? 'AFFINE_WORKSPACE_TEMPLATES_ID' : 'AFFINE_WORKSPACE_RELEASES_ID';

  if (opts.dryRun && !opts.push) {
    return {
      ok: true,
      dryRun: true,
      target,
      base,
      user,
      authError,
      workspaceId: workspaceId ?? null,
      workspaceEnv: envKey,
      workspaceMissing: !workspaceId,
      entryCount: entries.length,
      entries: entries.map((e) => ({
        title: e.title,
        namespace: e.namespace,
        kind: e.kind,
        pairRole: e.pairRole,
        pairTitle: e.pairTitle,
        sourcePath: e.sourcePath,
      })),
      ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
      pushAvailable: Boolean(resolveAffineCliPath()),
      limitation:
        'Plan only. Use --push for affine-cli upsert (pass --dry-run --push to probe without write).',
    };
  }

  if (!workspaceId) {
    throw new Error(
      `Missing ${envKey} (target=${target}). Set it in root .env — do not point AFFINE_WORKSPACE_ID at Releases for Templates. Run yarn affine:workspace:list`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(
    repoRoot,
    'scripts/cache/affine-import',
    `publish-${target}${opts.dryRun ? '-dry' : ''}-${stamp}`,
  );
  const { manifest } = writeImportBundle(entries, outDir);

  /** @type {object} */
  const result = {
    ok: true,
    status: opts.push ? (opts.dryRun ? 'push-dry-run' : 'push') : 'bundle-export',
    dryRun: opts.dryRun,
    target,
    base,
    user,
    workspaceId,
    workspaceEnv: envKey,
    workspaceUrl: `${base}/workspace/${workspaceId}`,
    namespace: opts.namespace,
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
      `[strategic-docs:publish] ${opts.dryRun ? 'dry-run push' : 'pushing'} ${entries.length} doc(s) → ${target} via ${envKey}=${workspaceId} (namespace tag: ${opts.namespace})`,
    );
    const push = await pushImportBundle({
      bundleDir: outDir,
      workspaceId,
      dryRun: opts.dryRun,
    });
    result.push = push;
    result.ok = push.ok;
    if (!push.ok) {
      result.status = opts.dryRun ? 'push-dry-run-failed' : 'push-failed-bundle-ready';
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
  --template <id>           Run generate before publish (unless --skip-generate).
                            Without --target, implies --target releases.
  --target all|templates|releases   Default: all (or releases if --template set)
  --dry-run                 Plan only; with --push probes affine-cli without write
  --push                    Push via affine-cli (upsert by title + namespace tag)
  --skip-generate           Skip generate step
  --namespace <id>          Namespace tag / UI folder (default: strategic-docs)

Workspaces (root .env):
  AFFINE_WORKSPACE_TEMPLATES_ID  → granules + templates (content + meta)
  AFFINE_WORKSPACE_RELEASES_ID   → releases (content + meta)
  AFFINE_WORKSPACE_ID            → fallback only (does NOT override the two above)

Examples:
  yarn strategic-docs:publish --dry-run --template readme-main
  yarn strategic-docs:publish --push --target templates --skip-generate
  yarn strategic-docs:publish --push --target releases --template affine-surface-policy --skip-generate
  yarn strategic-docs:publish --push --dry-run --target templates --skip-generate

See docs/containers/strategic-docs/PUBLISH.md`);
}

/**
 * @param {string[]} [argv]
 */
export async function runStrategicDocsPublish(argv = process.argv.slice(2)) {
  const opts = parsePublishArgs(guardAffinePublishFreeze(repoRoot, argv, 'strategic-docs:publish'));
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
