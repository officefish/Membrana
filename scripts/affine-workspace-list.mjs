#!/usr/bin/env node
/**
 * List Affine workspaces (GraphQL) — discover IDs for .env.
 *
 *   yarn affine:workspace:list
 *   yarn affine:workspace:list --dry-run   # skip network, print env hints only
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import { listWorkspacesDetailed, resolveBaseUrl } from './lib/affine-import.mjs';

loadDotEnv();

function usage() {
  console.log(`Affine workspace discovery

  yarn affine:workspace:list [--dry-run]

After creating workspaces «Templates» and «Releases» in UI, copy ids to root .env:
  AFFINE_WORKSPACE_TEMPLATES_ID=<uuid>
  AFFINE_WORKSPACE_RELEASES_ID=<uuid>

Optional override: AFFINE_WORKSPACE_ID=<uuid> + --target on import commands.
Env: AFFINE_BASE_URL (default https://strategy.mmbrn.tech)`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
    return;
  }

  const base = resolveBaseUrl();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          base,
          envKeys: ['AFFINE_WORKSPACE_TEMPLATES_ID', 'AFFINE_WORKSPACE_RELEASES_ID'],
          note: 'Create workspaces in UI first; Affine may not allow rename — use new names.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const { user, workspaces } = await listWorkspacesDetailed(base);
  console.log(
    JSON.stringify(
      {
        ok: true,
        base,
        user,
        workspaces,
        envHint: {
          AFFINE_WORKSPACE_TEMPLATES_ID: '<pick Templates workspace id>',
          AFFINE_WORKSPACE_RELEASES_ID: '<pick Releases workspace id>',
        },
        urls: workspaces.map((/** @type {{ id: string }} */ w) => `${base}/workspace/${w.id}`),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('[affine-workspace-list]', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
