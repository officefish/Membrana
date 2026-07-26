## Document types

Каждый артефакт = **две linked** страницы: **content** + **meta**.  
Тип задаётся title-префиксом (не Affine-папкой).

| Type | Content title | Meta title | Git source | Workspace |
|------|---------------|------------|------------|-----------|
| Granule | `Granule · <id>` | `Meta · Granule · <id>` | `granules/<id>/` | Templates |
| Template | `Template · <id>` | `Meta · Template · <id>` | `templates/<id>/` | Templates |
| Release | `Release · <id>` | `Meta · Release · <id>` | `releases/<id>/` | Releases |

- **content** — literal markdown **или** результат pure function (для template — editable skeleton; для release — собранный README).
- **meta** — кто создал / зачем: purpose, identity, foundations, slots/pins. Editable markdown, **не** JSON dump.

Пример namespace `strategic-docs/`:

- **Templates:** `Granule · readme-principles` ↔ `Meta · Granule · readme-principles`, `Template · affine-surface-policy` ↔ `Meta · Template · affine-surface-policy`
- **Releases:** `Release · affine-surface-policy` ↔ `Meta · Release · affine-surface-policy`
