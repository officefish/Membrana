#!/usr/bin/env node
/**
 * Import markdown from git strategic-docs into Affine workspaces (Templates / Releases).
 *
 * v1: validates auth + workspace, maps git paths → Affine folders, exports markdown bundle.
 * Live push via GraphQL is unavailable on stable self-host — use bundle + UI Import.
 *
 *   yarn affine:import:templates --dry-run -- docs/containers/strategic-docs/granules/readme-principles
 *   yarn affine:import:releases --dry-run -- docs/containers/strategic-docs/releases/readme-main
 *   yarn affine:import:templates -- --namespace strategic-docs path/to/body.md
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import { repoRoot } from './_ssh-office-config.mjs';
import {
  STRATEGIC_DOCS_ROOT,
  listWorkspacesDetailed,
  ownerUiSteps,
  parseImportArgs,
  resolveBaseUrl,
  resolveImportEntries,
  resolveWorkspaceId,
  signIn,
  writeImportBundle,
} from './lib/affine-import.mjs';

loadDotEnv();

const DEFAULT_RELEASE_PATH = 'docs/containers/strategic-docs/releases/readme-main';

/** @param {import('./lib/affine-import.mjs').AffineTarget | undefined} defaultTarget */
function usage(defaultTarget) {
  console.log(`Affine strategic-docs import${defaultTarget ? ` (${defaultTarget})` : ''}

  yarn affine:workspace:list
  yarn affine:import:${defaultTarget ?? 'templates|releases'} --dry-run [--namespace NS] [--title T] <path>
  yarn affine:sync:${defaultTarget ?? 'templates|releases'} --dry-run

Examples:
  yarn affine:import:templates --dry-run -- docs/containers/strategic-docs/granules/readme-principles
  yarn affine:import:releases --dry-run -- docs/containers/strategic-docs/releases/readme-main
  yarn affine:import:templates -- --namespace strategic-docs --title "Granule · readme-principles" path

Env:
  AFFINE_BASE_URL (default https://strategy.mmbrn.tech)
  AFFINE_API_TOKEN | AFFINE_PASSWORD | AFFINE_ADMIN_PASSWORD
  AFFINE_WORKSPACE_TEMPLATES_ID | AFFINE_WORKSPACE_RELEASES_ID
  AFFINE_WORKSPACE_ID (override both)

Always run --dry-run before live import.`);
}

/**
 * @param {import('./lib/affine-import.mjs').AffineTarget | undefined} defaultTarget
 * @param {string[]} [argv]
 */
export async function runAffineImport(defaultTarget, argv = process.argv.slice(2)) {
  const args = parseImportArgs(argv, defaultTarget);
  if (args.help) {
    usage(defaultTarget);
    return;
  }

  const target = args.target;
  if (!target) {
    throw new Error('Missing target: use yarn affine:import:templates or affine:import:releases');
  }

  const inputPath = args.file ?? `${repoRoot}/${DEFAULT_RELEASE_PATH}`;
  const base = resolveBaseUrl();
  const workspaceId = resolveWorkspaceId(target, { allowMissing: args.dryRun });
  const entries = await resolveImportEntries(inputPath, target, repoRoot, {
    namespace: args.namespace,
    title: args.title,
  });

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
          workspaceUrl: workspaceId ? `${base}/workspace/${workspaceId}` : null,
          inputPath,
          strategicDocsRoot: STRATEGIC_DOCS_ROOT,
          entries: entries.map((e) => ({
            title: e.title,
            namespace: e.namespace,
            kind: e.kind,
            bytes: Buffer.byteLength(e.markdown, 'utf8'),
            sourcePath: e.sourcePath,
          })),
          ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
          limitation:
            'v1: no GraphQL markdown-create on stable self-host. Live import writes bundle; push via UI Import.',
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
  const leaf = entries.length === 1 ? entries[0].namespace.replace(/\//g, '-') : 'batch';
  const outDir = `${repoRoot}/scripts/cache/affine-import/${target}-${leaf}-${stamp}`;
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
        inputPath,
        bundleDir: outDir,
        manifest: `${outDir}/manifest.json`,
        entries: manifest,
        ownerUiSteps: ownerUiSteps(base, workspaceId, entries),
      },
      null,
      2,
    ),
  );
}

/** Infer default target from --target flag (set by yarn script aliases). */
function inferDefaultTarget() {
  const idx = process.argv.indexOf('--target');
  if (idx >= 0) {
    const t = process.argv[idx + 1];
    if (t === 'templates' || t === 'releases') return t;
  }
  return undefined;
}

async function main() {
  await runAffineImport(inferDefaultTarget());
}

main().catch((err) => {
  console.error('[affine-import]', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
