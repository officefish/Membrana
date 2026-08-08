# Affine read-only inventory

`affine:inventory` builds a deterministic, sealed inventory from an explicitly
provided offline source bundle. It does not connect to Affine, PostgreSQL, SSH or
the network, does not load `.env`, and has no production default.

## Input contract

The JSON input uses schema `affine-inventory-source/1` and contains:

- one `snapshotId` and `capturedAt`;
- source `databaseId` and a non-empty `workspaceIds` list;
- separate database and export fences tied to that snapshot;
- exact `databaseObjects` and `exportObjects` sets;
- for each object: `id`, `kind`, SHA-256 `hash`, timestamps, relations and grants;
- for each exported object: `byteSize` and a relative `contentPath`.

Unknown fields are rejected. Content paths cannot be absolute or escape the input
directory. The extractor recomputes content hashes and sizes, compares both exact
sets and metadata, rejects duplicate keys and dangling relations, and requires at
least one grant per object.

The synthetic example is
[`scripts/fixtures/affine-inventory/source.json`](../../scripts/fixtures/affine-inventory/source.json).

## Run

Use a fresh output directory. Keep live source bundles and outputs outside Git,
for example under the ignored `scripts/cache/affine-inventory/` tree.

```powershell
yarn affine:inventory --input scripts/fixtures/affine-inventory/source.json `
  --out scripts/cache/affine-inventory/fixture-run `
  --git-sha dddddddddddddddddddddddddddddddddddddddd
```

The command writes only:

- `manifest.json` — canonical inventory without raw document content or source paths;
- `manifest.sha256` — detached SHA-256 seal over the exact manifest bytes.

Run the same fenced input into a second new directory and compare both files
byte-for-byte. Counts are informative only: the known `82 pages / 57 assets`
baseline is not fenced proof, and `affine-cli doc list = 0` is never accepted as
evidence of emptiness or completeness.

## Stop conditions

Stop on any incomplete set, fence mismatch, unknown field, missing grant, dangling
relation, metadata drift, content hash mismatch or non-deterministic output. Do not
invoke `affine:import`, `affine:sync`, strategic publishing, SSH or a freeze bypass
as part of this phase.

This task proves the offline tool with synthetic fixtures. A live read-only source
snapshot is a separate owner/ops-authorized act. Migration export, disposition,
rehydration and copying bytes belong to later phases; live INV-1 therefore remains
`NOT_PERFORMED` until that act is completed.

