# Publish: git → Affine

> Domain-verb мастерской **`publish`**. Канон: [`WORKSHOP.md`](./WORKSHOP.md) · [`SURFACE.md`](./SURFACE.md).

## Команда

```bash
yarn strategic-docs:publish [options]
```

> **STOP:** Affine publish is frozen by `workshop.catalog.json#surfaceStatus.affinePublish`.
> Commands refuse unless rerun with `--allow-affine-frozen-publish`; see
> `docs/precedents/2026-07-26-affine-editor-paradigm-impedance.md`.

| Флаг | Default | Смысл |
|------|---------|--------|
| `--template <id>` | — | Перед publish вызвать `yarn strategic-docs:generate --template <id>`. **Без** `--target` подразумевает `--target releases` |
| `--target all\|templates\|releases` | `all` (или `releases` если задан `--template`) | Куда export / push |
| `--dry-run` | off | Auth + plan без записи; с `--push` — probe affine-cli **без** live write |
| `--push` | off | Push через **affine-cli** (после bundle); требует `affine` на PATH |
| `--skip-generate` | off | Не вызывать generate (только export) |
| `--namespace <id>` | `strategic-docs` | Namespace (= container id): tag при `--push` + UI-папка при Import |

## Примеры

```bash
# Один release (Templates workspace НЕ трогаем)
yarn strategic-docs:publish --dry-run --template affine-surface-policy --skip-generate
yarn strategic-docs:publish --push --template affine-surface-policy --skip-generate

# Только Templates (все granules + templates, content + meta)
yarn strategic-docs:publish --target templates --skip-generate --dry-run
yarn strategic-docs:publish --push --target templates --skip-generate

# Все releases/
yarn strategic-docs:publish --target releases --skip-generate

# Оба workspace явно
yarn strategic-docs:publish --target all --skip-generate --dry-run

# Probe push без записи
yarn strategic-docs:publish --push --dry-run --target templates --skip-generate
```

## Workspace routing (критично)

| Git | Env | Workspace |
|-----|-----|-----------|
| `granules/` + `templates/` | `AFFINE_WORKSPACE_TEMPLATES_ID` | **Templates** |
| `releases/` | `AFFINE_WORKSPACE_RELEASES_ID` | **Releases** |

- Expected IDs (owner): Templates `04deee42-187d-41ae-89d6-c7ff1e3dd80c`, Releases `fa8b440d-0d43-42c9-a9f9-b27baba5ddd4` — сверьте через `yarn affine:workspace:list`.
- `AFFINE_WORKSPACE_ID` — **только fallback**, если target-specific не задан. Он **не** перекрывает `TEMPLATES` / `RELEASES`.
- `--template X` без `--target` → только **Releases** (раньше default `all` заливал конструктор туда же, куда и snapshot).

## Granule model: content + meta

Каждый артефакт → **две связанные** Affine-страницы (editable markdown, не JSON dump):

| Role | Title | Содержимое |
|------|-------|------------|
| **content** | `Granule · <id>` / `Template · <id>` / `Release · <id>` | literal body **или** результат pure function / skeleton / README |
| **meta** | `Meta · Granule · <id>` / `Meta · Template · <id>` / `Meta · Release · <id>` | кто/зачем: purpose, identity, foundations, slots/pins |

В теле каждой страницы — banner со ссылкой на pair (по title). Upsert: существующий doc с тем же title (или legacy `Meta · <id>`) → `replace-markdown`.

## v2 — programmatic push (`--push`)

Требует [affine-cli](https://github.com/tomohiro-owada/affine-cli):

```bash
go install github.com/tomohiro-owada/affine-cli@latest
affine auth status   # needs AFFINE_BASE_URL + token/password in root .env
```

Windows: бинарь — `%USERPROFILE%\go\bin\affine-cli.exe`; при необходимости `AFFINE_CLI_PATH` в `.env`.

```bash
yarn strategic-docs:publish --push --target templates --skip-generate
yarn strategic-docs:publish --push --template affine-surface-policy --skip-generate
yarn strategic-docs:publish --push --dry-run --target releases --template affine-surface-policy --skip-generate
```

### GraphQL vs WebSocket (`--push`)

| Этап | Протокол | Что проверяет |
|------|----------|----------------|
| `auth status`, `doc list`, dry-run | **GraphQL** HTTPS | токен/пароль, workspace id |
| `create-from-markdown`, `replace-markdown` | **socket.io** at `/socket.io/` | запись Y.js-тела документа |

affine-cli подключается к **корню** `AFFINE_BASE_URL` (не `/graphql`); путь socket.io — **`/socket.io/`**.
`yarn strategic-docs:publish --push` перед вызовом affine-cli делает password sign-in и передаёт **`AFFINE_COOKIE`** (session cookies). GraphQL-only bearer token без cookie часто даёт `missing 'data' field`.

Типичные ошибки push:

- `socket.io connect timeout after 10s` — WS не доходит (VPN, firewall, proxy)
- `missing 'data' field` — socket.io connect отклонён (часто: только `AFFINE_API_TOKEN` без session cookie; или обрыв handshake)

**Auth для `--push`:** предпочтительно `AFFINE_PASSWORD` / `AFFINE_ADMIN_PASSWORD` в root `.env` (не только access token).

**Probe (infra OK если sid JSON):**

```bash
curl.exe -s "https://strategy.mmbrn.tech/socket.io/?EIO=4&transport=polling"
# → 0{"sid":"…","upgrades":["websocket"],…}
```

**Fallback:** даже при падении `--push` bundle **уже записан** в `scripts/cache/affine-import/publish-*-*/` — в stderr будет `bundleDir` + `manifest`. Дальше v1 UI Import (см. ниже).

### Namespace (папки vs tags)

| Механизм | Статус |
|----------|--------|
| UI folder `strategic-docs/` | **Канон визуально** — создайте папку вручную, перетащите docs |
| affine-cli folder/collection/parent | **Нет API** (проверено: только `doc` + `tag`) |
| `--push` namespace tag | Создаёт/вешает tag с именем namespace (`strategic-docs`) на каждый doc |

Follow-up: когда Affine/affine-cli даст parent folder — перейти с tag на folder placement.

## v1 limitation (без `--push`)

Stable self-host Affine **не** принимает markdown через публичный GraphQL create.  
`publish` = **validate + markdown bundle** в `scripts/cache/affine-import/` + `ownerUiSteps` в JSON.

Owner finish в UI:

1. Открыть workspace URL из вывода (**Templates** vs **Releases** — разные env)
2. **Import → Markdown** (batch или по файлам из `manifest.json`)
3. Папка namespace **`strategic-docs`**
4. Titles: content + linked meta (см. таблицу выше)

## Mapping

| Git | Affine workspace | Namespace | Docs |
|-----|------------------|-----------|------|
| `granules/<id>/` | Templates | container id | `Granule · <id>` + `Meta · Granule · <id>` |
| `templates/<id>/` | Templates | container id | `Template · <id>` + `Meta · Template · <id>` |
| `releases/<id>/` | Releases | container id | `Release · <id>` + `Meta · Release · <id>` |

## Follow-up

- Folder/collection API → programmatic namespace placement (сейчас tag + UI folder)
- `publish --check` drift git vs last manifest
- CI gate после generate
- Issue note: affine-cli namespace folders
