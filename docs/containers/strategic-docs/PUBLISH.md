# Publish: git → Affine

> Domain-verb мастерской **`publish`**. Канон: [`WORKSHOP.md`](./WORKSHOP.md) · [`SURFACE.md`](./SURFACE.md).

## Команда

```bash
yarn strategic-docs:publish [options]
```

| Флаг | Default | Смысл |
|------|---------|--------|
| `--template <id>` | — | Перед publish вызвать `yarn strategic-docs:generate --template <id>` |
| `--target all\|templates\|releases` | `all` | Куда export bundle |
| `--dry-run` | off | Auth + plan без записи bundle / generate |
| `--push` | off | Push через **affine-cli** (после bundle); требует `affine` на PATH |
| `--skip-generate` | off | Не вызывать generate (только export) |
| `--namespace <id>` | `strategic-docs` | Affine namespace (= container id) |

## Примеры

```bash
# Полный цикл readme-main
yarn strategic-docs:publish --dry-run --template readme-main
yarn strategic-docs:publish --template readme-main

# Только Templates (все granules + templates)
yarn strategic-docs:publish --target templates --skip-generate --dry-run
yarn strategic-docs:publish --target templates --skip-generate

# Один release
yarn strategic-docs:publish --target releases --template affine-surface-policy --skip-generate

# Все releases/
yarn strategic-docs:publish --target releases --skip-generate
```

## v2 — programmatic push (`--push`)

Требует [affine-cli](https://github.com/tomohiro-owada/affine-cli):

```bash
go install github.com/tomohiro-owada/affine-cli@latest
affine auth status
```

```bash
yarn strategic-docs:publish --push --target templates --skip-generate
yarn strategic-docs:publish --push --template affine-surface-policy
```

Env те же + per-target workspace ID. Upsert: существующий doc с тем же **title** → `replace-markdown`.

**Namespace folders:** affine-cli создаёт docs flat; папку `strategic-docs/` в UI расставьте вручную или follow-up.

## v1 limitation (без `--push`)

Stable self-host Affine **не** принимает markdown через публичный GraphQL create.  
`publish` = **validate + markdown bundle** в `scripts/cache/affine-import/` + `ownerUiSteps` в JSON.

Owner finish в UI:

1. Открыть workspace URL из вывода
2. **Import → Markdown** (batch или по файлам из `manifest.json`)
3. Папка namespace **`strategic-docs`**
4. Titles по manifest: `Granule · …`, `Template · …`, `Release · …`, `Meta · …`

## Mapping

| Git | Affine workspace | Namespace | Doc title |
|-----|------------------|-----------|-----------|
| `granules/<id>/` | Templates | container id | `Granule · <id>` |
| `templates/<id>/` | Templates | container id | `Template · <id>` |
| `releases/<id>/` | Releases | container id | `Release · <id>` + `Meta · <id>` |

## Follow-up (v2)

- Programmatic push (affine-cli / DocWriter / Playwright UI-import)
- Idempotent upsert по title
- `publish --check` drift git vs last manifest
- CI gate после generate
