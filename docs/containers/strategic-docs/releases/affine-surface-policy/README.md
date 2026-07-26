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

Документы контейнера лежат **flat** под `strategic-docs/` — **тип** задаётся **title + metadata**, не Affine-папкой.

Паттерн: [`GROUP_CONTAINERIZATION`](../../../../patterns/GROUP_CONTAINERIZATION.md) — один git-контейнер → один namespace.


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
