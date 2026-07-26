## Automation

### Generate

    yarn strategic-docs:generate --template affine-surface-policy
    yarn strategic-docs:generate --template readme-main --dry-run

### Publish (сначала `--dry-run`)

    yarn affine:workspace:list
    # Releases only (--template implies --target releases)
    yarn strategic-docs:publish --dry-run --template affine-surface-policy --skip-generate
    yarn strategic-docs:publish --push --template affine-surface-policy --skip-generate
    # Templates constructor (content + meta)
    yarn strategic-docs:publish --push --target templates --skip-generate
    # Probe push without write
    yarn strategic-docs:publish --push --dry-run --target templates --skip-generate

### Env (dev `.env`, см. [`deploy/affine/.env.example`](../../../../deploy/affine/.env.example))

| Variable | Purpose |
|----------|---------|
| `AFFINE_BASE_URL` | default `https://strategy.mmbrn.tech` |
| `AFFINE_API_TOKEN` | Bearer (Settings → Access tokens) |
| `AFFINE_WORKSPACE_TEMPLATES_ID` | UUID workspace **Templates** |
| `AFFINE_WORKSPACE_RELEASES_ID` | UUID workspace **Releases** |
| `AFFINE_WORKSPACE_ID` | fallback only — does **not** override the two above |

`--push` upserts by title and tags docs with namespace (`strategic-docs`). UI folder still manual (no folder API in affine-cli).
