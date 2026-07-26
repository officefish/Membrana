# Affine Surface Policy

**Purpose:** формальная политика маршрутизации strategic-docs в Affine — где живут шаблоны, гранулы и релизы; как workspace и namespace отображаются из git.

**Канон (git):** [`SURFACE.md`](../../SURFACE.md) · контейнер `docs/containers/strategic-docs/`

**Live:** https://strategy.mmbrn.tech


## Workspaces

В Affine — **ровно два** top-level workspace:

| Workspace | Роль |
|-----------|------|
| **Templates** | Конструктор: редактируемые granules + template skeletons + metadata |
| **Releases** | Опубликованные read-only snapshots после `yarn strategic-docs:generate` |

**Неправильно (отменено):** зеркалить git-папки `granules/`, `templates/`, `releases/` как подпапки в Affine.


## Namespaces

**Namespace** — папка внутри workspace с именем **container id** (не git-тип артефакта).

| Git-контейнер | Affine namespace |
|---------------|------------------|
| `docs/containers/strategic-docs/` | `strategic-docs` |

Документы контейнера живут в namespace `strategic-docs/` (UI-папка).  
`--push` дополнительно вешает **tag** с тем же именем — у affine-cli нет folder/collection API.

Тип документа задаётся **title** (content + meta pair), не подпапкой `granules/` / `templates/`.

Паттерн: [`GROUP_CONTAINERIZATION`](../../../../patterns/GROUP_CONTAINERIZATION.md) — один git-контейнер → один namespace.


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
