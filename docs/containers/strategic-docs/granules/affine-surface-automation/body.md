## Automation

### Generate

    yarn strategic-docs:generate --template affine-surface-policy
    yarn strategic-docs:generate --template readme-main --dry-run

### Affine import (сначала `--dry-run`)

    yarn affine:workspace:list
    yarn affine:sync:templates --dry-run
    yarn affine:sync:templates
    yarn affine:import:releases -- docs/containers/strategic-docs/releases/affine-surface-policy

### Env (dev `.env`, см. [`deploy/affine/.env.example`](../../../../deploy/affine/.env.example))

| Variable | Purpose |
|----------|---------|
| `AFFINE_BASE_URL` | default `https://strategy.mmbrn.tech` |
| `AFFINE_API_TOKEN` | Bearer (Settings → Access tokens) |
| `AFFINE_WORKSPACE_TEMPLATES_ID` | UUID workspace **Templates** |
| `AFFINE_WORKSPACE_RELEASES_ID` | UUID workspace **Releases** |

v1: CLI пишет markdown bundle → owner UI Import в нужный workspace/namespace. Programmatic push — follow-up.
