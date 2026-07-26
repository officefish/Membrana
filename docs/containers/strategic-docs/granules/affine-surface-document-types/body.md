## Document types

Префикс title + metadata определяют kind:

| Type | Title prefix | Git source | Workspace |
|------|--------------|------------|-----------|
| Granule | `Granule · <id>` | `granules/<id>/` | Templates |
| Template | `Template · <id>` | `templates/<id>/template.json` | Templates |
| Release | `Release · <id>` | `releases/<id>/README.md` | Releases |
| Meta | `Meta · <id>` | `releases/<id>/release.json` | Releases |

Пример namespace `strategic-docs/`:

- **Templates:** `Granule · readme-principles`, `Template · readme-main`, `Template · affine-surface-policy`
- **Releases:** `Release · readme-main`, `Meta · readme-main`, `Release · affine-surface-policy`, `Meta · affine-surface-policy`
