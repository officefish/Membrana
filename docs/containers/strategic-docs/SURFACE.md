# Surface: strategic-docs — где что живёт

> Git = SoT (`granules/` · `templates/` · `releases/`). Полный git↔Affine sync — вне scope v1.

**Исправление модели (2026-07):** harness/атлас — **не** канал публикации strategic-docs релизов.
Релизы (`readme-main` и др.) публикуются в **Affine Releases** (`strategy.mmbrn.tech`).
Harness остаётся атласом **контейнеров** и ops-документации.

---

## Терминология Affine

| Уровень | Что это | Примеры |
|---------|---------|---------|
| **Workspace** | Только **два** top-level workspace в Affine | **Templates**, **Releases** |
| **Namespace** | Папка внутри workspace = **id контейнера**, документы в ней **управляют** этим контейнером | `strategic-docs/` |
| **Document** | Пара **content + meta** в namespace; тип задаётся **title**, не git-папкой | `Granule · readme-principles` ↔ `Meta · Granule · readme-principles` |

**Неправильно (отменено):** зеркалить git-структуру `granules/…`, `templates/…`, `releases/…` как папки в Affine.
В git `granules/` · `templates/` · `releases/` — **типы артефактов** и каталоги SoT; в Affine — flat namespace на контейнер.

Контейнер strategic-docs: `docs/containers/strategic-docs/` → namespace **`strategic-docs`**.

---

## Где что живёт

| Поверхность | URL | Роль | Что публикуется |
|-------------|-----|------|-----------------|
| **Git (канон)** | репо | Источник истины | `docs/containers/strategic-docs/` — `granules/`, `templates/`, `releases/` |
| **Атлас (harness Mintlify)** | **https://harness.mmbrn.tech** | Документация **по контейнерам** и ops-tooling | `tooling/containers`, bestiary, llm-calls, git cookbooks — **не** strategic-docs релизы |
| **Affine · Шаблоны** | **https://strategy.mmbrn.tech** (workspace **Templates**) | **Конструктор:** template + granules + metadata | docs в namespace `strategic-docs/` |
| **Affine · Релизы** | **https://strategy.mmbrn.tech** (workspace **Releases**) | **Опубликованные snapshots** для чтения | docs в namespace `strategic-docs/` |
| **GitHub** | корень репо | Пока ручной `README.md` (не generated) | корневой `README.md` **не трогаем** в v1 |

Product Mintlify (`product.mmbrn.tech` / `apps/docs`) — Device Board, узлы и тарифы;
strategic-docs туда **не** кладём.

---

## Git — источник истины

| Каталог git | Содержимое | Affine |
|-------------|------------|--------|
| [`granules/`](./granules/) | `granule.json` + `body.md` / `render.mjs` | **Templates** → `Granule · <id>` (content) + `Meta · Granule · <id>` |
| [`templates/`](./templates/) | `template.json` (skeleton + slots) | **Templates** → `Template · <id>` (editable md) + `Meta · Template · <id>` |
| [`releases/`](./releases/) | `README.md` + `release.json` после generate | **Releases** → `Release · <id>` + `Meta · Release · <id>` |

Generate: `yarn strategic-docs:generate --template readme-main` → запись в `releases/readme-main/`.

**Formal policy (granulated):** шаблон [`templates/affine-surface-policy/`](./templates/affine-surface-policy/template.json) → generate → [`releases/affine-surface-policy/`](./releases/affine-surface-policy/) → Affine **Releases** / namespace `strategic-docs`. Гранулы: `affine-surface-*` в [`granules/`](./granules/).

---

## Атлас (harness) — контейнеры, не strategic-docs

| Поле | Значение |
|------|----------|
| Mintlify root | `apps/docs-harness/` |
| Live | **https://harness.mmbrn.tech** |
| Назначение | tooling atlas, containers, bestiary, llm-calls, git cookbooks |
| Производная | `yarn tooling:atlas --render` → `apps/docs-harness/tooling/containers.mdx` |
| Preview | `yarn docs-harness:dev` → http://localhost:3334 |
| Verify | `yarn docs:verify:all` · `yarn tooling:atlas --check` |

**Не делать:** `apps/docs-harness/strategic-docs/readme-main.mdx` и nav-группа Strategic docs для релизов —
это отменённая модель. Harness **не** зеркало `releases/`.

Канон атласа: [`docs/tooling-atlas/README.md`](../../tooling-atlas/README.md) · harness README: [`apps/docs-harness/README.md`](../../../apps/docs-harness/README.md).

---

## Affine (strategy.mmbrn.tech) — workspace · namespace · documents

| Поле | Значение |
|------|----------|
| URL | **https://strategy.mmbrn.tech** |
| Движок | Affine self-host на office VDS |
| DNS / deploy | [`DNS_DOMAIN_POLICY.md`](../../deploy/DNS_DOMAIN_POLICY.md) · [`STRATEGY_AFFINE_DEPLOY.md`](../../deploy/STRATEGY_AFFINE_DEPLOY.md) |
| Panel | раздел «Стратегия» → кнопка на URL |
| Admin | druid · `feedback@mmbrn.ru` (`AFFINE_ADMIN_PASSWORD` в корневом `.env`) |

### Workspace «Templates» — конструктор

```text
Templates/                          ← workspace (не категория)
└── strategic-docs/                 ← namespace = container id (UI folder + push tag)
    ├── Granule · readme-principles          ← content (literal / fn output)
    ├── Meta · Granule · readme-principles   ← purpose + provenance
    ├── Template · readme-main               ← editable skeleton markdown
    ├── Meta · Template · readme-main        ← slots + purpose
    ├── Template · affine-surface-policy
    └── Meta · Template · affine-surface-policy
```

Каждая гранула / шаблон = **две linked** страницы (content ↔ meta). Не JSON dump.

### Workspace «Releases» — опубликованные snapshots

```text
Releases/                           ← workspace
└── strategic-docs/                 ← namespace = container id
    ├── Release · readme-main
    ├── Meta · Release · readme-main
    ├── Release · affine-surface-policy
    └── Meta · Release · affine-surface-policy
```

Источник после generate:

- readme-main: [`releases/readme-main/README.md`](./releases/readme-main/README.md) · [`release.json`](./releases/readme-main/release.json)
- affine-surface-policy: [`releases/affine-surface-policy/README.md`](./releases/affine-surface-policy/README.md) · [`release.json`](./releases/affine-surface-policy/release.json)

**Не путать:** единый `releases/readme-main/README.md` — **релиз для Releases workspace**, не единственный doc в Templates.

### Metadata block (в granule doc, Templates)

Руками или из `granule.json` (см. [`design/README-GRANULATION-DESIGN.md`](./design/README-GRANULATION-DESIGN.md)):

| Поле | Пример |
|------|--------|
| `id` | `readme-strategic-context` |
| `version` | `1.0.0` |
| `kind` | `literal` \| `function` |
| `source` | git path к `body.md` / `render.mjs` |
| `foundations` | `docs/ARCHITECTURE.md`, `docs/BACKGROUND_SERVERS.md`, … |
| `usedBy` | `readme-main` slot `{{strategic_context}}` pin `1.0.0` |

### Автоматизация

**v1 pragmatic:** git → markdown bundle + UI Import (нет стабильного GraphQL markdown-create на self-host stable).
Programmatic push через `@affine/native` / socket.io — follow-up (`affine-cli` или server DocWriter).

#### Env (корневой `.env`, см. [`deploy/affine/.env.example`](../../../deploy/affine/.env.example))

| Переменная | Назначение |
|------------|------------|
| `AFFINE_BASE_URL` | default `https://strategy.mmbrn.tech` |
| `AFFINE_API_TOKEN` | Bearer token (Settings → Access tokens) |
| `AFFINE_PASSWORD` / `AFFINE_ADMIN_PASSWORD` | sign-in fallback |
| `AFFINE_WORKSPACE_TEMPLATES_ID` | UUID workspace **Templates** (обязателен для `--target templates`) |
| `AFFINE_WORKSPACE_RELEASES_ID` | UUID workspace **Releases** (обязателен для `--target releases`) |
| `AFFINE_WORKSPACE_ID` | fallback **только если** target-specific не задан; **не** перекрывает два выше |

После создания workspace в UI (Affine не даёт переименовать — ок, новые имена):

```bash
yarn affine:workspace:list
# → скопировать id в AFFINE_WORKSPACE_TEMPLATES_ID / AFFINE_WORKSPACE_RELEASES_ID
```

#### Команды

| Команда | Назначение |
|---------|------------|
| `yarn affine:workspace:list` | GraphQL: список workspace + URL |
| `yarn affine:import:templates --dry-run -- <path>` | один doc/каталог → **Templates** |
| `yarn affine:import:releases --dry-run -- <path>` | release dir → **Releases** (+ Meta doc) |
| `yarn affine:sync:templates --dry-run` | все `granules/` + `templates/` → bundle |
| `yarn affine:sync:releases --dry-run` | все `releases/` → bundle |

Флаги: `--namespace strategic-docs` (override container namespace), `--title "…"`.

**Всегда сначала `--dry-run`.** Live import пишет bundle в `scripts/cache/affine-import/` + чеклист UI Import.

#### Mapping git → Affine (defaults)

| Git path (тип артефакта) | Workspace | Namespace | Doc title |
|--------------------------|-----------|-----------|-----------|
| `granules/<id>/` | Templates | `strategic-docs` | `Granule · <id>` + `Meta · Granule · <id>` |
| `templates/<id>/` | Templates | `strategic-docs` | `Template · <id>` + `Meta · Template · <id>` |
| `releases/<id>/` | Releases | `strategic-docs` | `Release · <id>` + `Meta · Release · <id>` |

Content = literal / pure function / skeleton / README. Meta = purpose + provenance (editable markdown).  
`--push` вешает tag namespace; UI-папку `strategic-docs/` создайте вручную (у affine-cli нет folder API).

#### Примеры (owner)

```bash
# 1) Discover workspace IDs
yarn affine:workspace:list

# 2) Dry-run bulk Templates (granules + templates → namespace strategic-docs)
yarn affine:sync:templates --dry-run

# 3) Dry-run single release
yarn affine:import:releases --dry-run -- docs/containers/strategic-docs/releases/readme-main

# 4) Live export bundle (then UI Import → Markdown in Releases workspace, folder strategic-docs)
yarn affine:import:releases -- docs/containers/strategic-docs/releases/readme-main

# 5) Explicit namespace override (другой контейнер в будущем)
yarn affine:import:templates -- --namespace strategic-docs --title "Granule · readme-principles" \
  docs/containers/strategic-docs/granules/readme-principles
```

- `strategic-docs-render-adapter.mjs` — **stub only** (не пушит в Affine).
- `yarn affine:import` — legacy alias; предпочитайте `:templates` / `:releases`.

---

## v1 flow (кратко)

1. Редактирование гранул/шаблона → git `granules/` · `templates/` (+ зеркало в Affine **Templates** / namespace `strategic-docs`).
2. `yarn strategic-docs:generate --template readme-main` → git `releases/readme-main/`.
3. Публикация snapshot → Affine **Releases** / namespace `strategic-docs` (ручной import / owner UI).
4. Harness — только при изменении контейнерного атласа (`yarn tooling:atlas --render`), не при каждом релизе readme-main.

---

## Связи

- **Formal Affine policy:** [`templates/affine-surface-policy/template.json`](./templates/affine-surface-policy/template.json) · [`releases/affine-surface-policy/`](./releases/affine-surface-policy/) · гранулы `affine-surface-*`
- Дизайн грануляции: [`design/README-GRANULATION-DESIGN.md`](./design/README-GRANULATION-DESIGN.md)
- Generate CLI: `yarn strategic-docs:generate [--template readme-main|affine-surface-policy] [--dry-run]`
- Tooling atlas: [`docs/tooling-atlas/README.md`](../../tooling-atlas/README.md)
- Паттерн контейнера: [`docs/patterns/GROUP_CONTAINERIZATION.md`](../../patterns/GROUP_CONTAINERIZATION.md)
