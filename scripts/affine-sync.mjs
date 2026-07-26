#!/usr/bin/env node
/**
 * Batch sync strategic-docs git tree → Affine import bundle.
 *
 *   yarn affine:sync:templates --dry-run
 *   yarn affine:sync:releases --dry-run
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import { repoRoot } from './_ssh-office-config.mjs';
import {
  discoverSyncPlan,
  listWorkspacesDetailed,
  ownerUiSteps,
  parseImportArgs,
  resolveBaseUrl,
  resolveWorkspaceId,
  signIn,
  writeImportBundle,
} from './lib/affine-import.mjs';

loadDotEnv();

/** @param {import('./lib/affine-import.mjs').AffineTarget} defaultTarget */
function usage(defaultTarget) {
  console.log(`Affine strategic-docs sync (${defaultTarget})

  yarn affine:sync:${defaultTarget} --dry-run
  yarn affine:sync:${defaultTarget}

Always run --dry-run first. Live mode writes markdown bundle under scripts/cache/affine-import/.

Env: AFFINE_WORKSPACE_${defaultTarget === 'templates' ? 'TEMPLATES' : 'RELEASES'}_ID`);
}

/**
 * @param {import('./lib/affine-import.mjs').AffineTarget} defaultTarget
 */
export async function runAffineSync(defaultTarget, argv = process.argv.slice(2)) {
  const args = parseImportArgs(argv, defaultTarget);
  args.sync = true;
  if (args.help) {
    usage(defaultTarget);
    return;
  }

  const target = args.target ?? defaultTarget;
  const base = resolveBaseUrl();
  const entries = await discoverSyncPlan(target, repoRoot);
  const workspaceId = resolveWorkspaceId(target, { allowMissing: args.dryRun });

  /** @type {{ id?: string, email?: string, name?: string } | null} */
  let user = null;
  /** @type {Array<{ id: string, name?: string }>} */
  let workspaces = [];
  /** @type {string | undefined} */
  let authError;

  if (args.dryRun) {
    try {
      const auth = await signIn(base);
      const listed = await listWorkspacesDetailed(base, auth);
      user = listed.user;
      workspaces = listed.workspaces;
    } catch (err) {
      authError = err instanceof Error ? err.message : String(err);
    }
  } else {
    const auth = await signIn(base);
    const listed = await listWorkspacesDetailed(base, auth);
    user = listed.user;
    workspaces = listed.workspaces;
  }

  const wsKnown = workspaceId
    ? workspaces.some((/** @type {{ id: string }} */ w) => w.id === workspaceId)
    : false;

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          target,
          base,
          user,
          authError,
          workspaceId: workspaceId ?? null,
          workspaceMissing: !workspaceId,
          workspaceResolved: wsKnown,
          entryCount: entries.length,
          namespaces: [...new Set(entries.map((e) => e.namespace))],
          entries: entries.map((e) => ({
            title: e.title,
            namespace: e.namespace,
            kind: e.kind,
            sourcePath: e.sourcePath,
          })),
          ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
          limitation:
            'v1 exports markdown bundle; programmatic push needs UI Import or affine-cli follow-up.',
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!workspaceId) {
    throw new Error(
      'Missing workspace id for live import. Set AFFINE_WORKSPACE_TEMPLATES_ID / RELEASES_ID.',
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = `${repoRoot}/scripts/cache/affine-import/${target}-sync-${stamp}`;
  const { manifest } = writeImportBundle(entries, outDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: 'bundle-export',
        target,
        base,
        user,
        workspaceId,
        workspaceUrl: `${base}/workspace/${workspaceId}`,
        bundleDir: outDir,
        entryCount: manifest.length,
        manifest: `${outDir}/manifest.json`,
        ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
      },
      null,
      2,
    ),
  );
}

function inferSyncTarget() {
  const idx = process.argv.indexOf('--target');
  if (idx >= 0 && process.argv[idx + 1] === 'releases') return 'releases';
  return 'templates';
}

async function main() {
  await runAffineSync(inferSyncTarget());
}

main().catch((err) => {
  console.error('[affine-sync]', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
