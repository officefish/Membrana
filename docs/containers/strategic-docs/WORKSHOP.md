# Мастерская strategic-docs

Дом: [`docs/containers/strategic-docs/`](./) · гранулы [`granules/`](./granules/) · шаблоны [`templates/`](./templates/) · релизы [`releases/`](./releases/).  
Манифест: [`workshop.manifest.json`](./workshop.manifest.json) · каталог [`workshop.catalog.json`](./workshop.catalog.json).  
Поверхность Affine: [`SURFACE.md`](./SURFACE.md) · publish: [`PUBLISH.md`](./PUBLISH.md).

## Холодный старт

```bash
yarn strategic-docs:tools              # таблица инструментов
yarn strategic-docs:tools --json
yarn strategic-docs:tools --zone workshop
yarn strategic-docs:tools --doc publish
```

## Граница

| В мастерской | Вне |
|--------------|-----|
| `generate` — сборка релиза из template + granules | Harness atlas (`yarn tooling:atlas`) — документация **контейнеров**, не strategic-docs релизы |
| `publish*` — export git → Affine; `--push` via affine-cli (W3) | Deploy Affine на VDS (`yarn affine:install`) |
| | `audit` / `decompose` — нет отдельного audit-контура (⚠ null в manifest) |

## Типовой цикл

```bash
# 1) Редактирование в git: granules/ · templates/

# 2) Сборка релиза
yarn strategic-docs:generate --template readme-main

# 3) Публикация в Affine
yarn strategic-docs:publish --dry-run --template readme-main
yarn strategic-docs:publish --template readme-main              # bundle + UI Import
yarn strategic-docs:publish --push --template readme-main       # affine-cli (W3)
```

Workspace **Templates** — конструктор (granules + templates).  
Workspace **Releases** — snapshots (`Release ·` + `Meta ·`).  
Namespace в Affine = **id контейнера** (`strategic-docs`), не git-папки `granules/`.

## Env

См. [`deploy/affine/.env.example`](../../../deploy/affine/.env.example):

- `AFFINE_WORKSPACE_TEMPLATES_ID`
- `AFFINE_WORKSPACE_RELEASES_ID`

```bash
yarn affine:workspace:list
```

## Formal policy artifact

Шаблон [`templates/affine-surface-policy/`](./templates/affine-surface-policy/template.json) документирует модель workspace / namespace / document types.  
Generate → [`releases/affine-surface-policy/`](./releases/affine-surface-policy/) → publish в Affine.
