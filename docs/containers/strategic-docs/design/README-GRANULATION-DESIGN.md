# Дизайн: грануляция корневого README

> Phase: проектирование (до интеграции). Git = SoT.
> **Surface routing:** harness (`harness.mmbrn.tech`) = атлас **контейнеров** (не strategic-docs релизы); Affine (`strategy.mmbrn.tech`) = **Templates** (конструктор) + **Releases** (snapshots). См. [`SURFACE.md`](../SURFACE.md).
> Реальный `README.md` в корне **не трогаем** — только черновики в этом контейнере.

## Завершение оборванной фразы владельца

**«Спроектируй его шаблон в»** → `docs/containers/strategic-docs/templates/readme-main/template.json`

Целевой релиз (после generate + office-валидации): `docs/containers/strategic-docs/releases/readme-main/` (read-only в git; публикация — Affine **Releases** workspace; в интеграции — зеркало или замена корневого `README.md`).

---

## Outline шаблона `readme-main`

| # | Секция skeleton | Placeholder | Источник |
|---|-----------------|-------------|----------|
| 0 | `# Membrana` + tagline | `{{title_tagline}}` | literal |
| 1 | Стратегический контекст (blockquote) | `{{strategic_context}}` | literal |
| 2 | `## Архитектура` + дерево + границы | `{{architecture}}` | literal |
| 3 | `## Принципы` | `{{principles}}` | literal |
| 4 | `## Быстрый старт` | `{{quickstart}}` | literal |
| 5 | `### Фоновые серверы` | `{{background_servers}}` | **function** |
| 6 | `## Ритм разработки` | `{{developer_rhythm}}` | literal |
| 7 | `## Полезные yarn-команды` | `{{yarn_hints}}` | literal |
| 8 | `## Структура пакетов` | `{{package_layers}}` | **function** |
| 9 | `## Инструменты разработки` | `{{dev_tools}}` | literal |
| 10 | `## Виртуальная команда AI` | `{{virtual_team}}` | literal |
| 11 | `## Документация` | `{{documentation}}` | literal |

**Skeleton** (каркас остаётся в шаблоне — порядок секций, заголовки между слотами):

```markdown
{{title_tagline}}

{{strategic_context}}

{{architecture}}

{{principles}}

{{quickstart}}

{{background_servers}}

{{developer_rhythm}}

{{yarn_hints}}

{{package_layers}}

{{dev_tools}}

{{virtual_team}}

{{documentation}}
```

---

## Таблица: блок README → granule

| Блок README (строки) | Тип | granule id | Rationale |
|----------------------|-----|------------|-----------|
| Заголовок + tagline (1–3) | literal | `readme-title-tagline` | Стабильная идентичность продукта; редко меняется |
| Стратегический контекст (5–7) | literal | `readme-strategic-context` | North-star + ссылки на WHITE_PAPER / MEMBRANE_PLATFORM; один факт — одна гранула (моат syncGranule) |
| Архитектура: дерево + границы (8–29) | literal | `readme-architecture` | Курируемая карта монорепо; не выводится из fs без I/O |
| Принципы (31–37) | literal | `readme-principles` | Нормативные инварианты; shared с AGENTS/.cursorrules позже |
| Быстрый старт (39–70) | literal | `readme-quickstart` | Команды yarn; при drift — отдельная fn-гранула v2 из package.json |
| Фоновые серверы — таблица (72–80) | **function** | `readme-background-servers-table` | Порты/команды/эпики (#58, #67) дрейфуют; fn держит канон рядом с BACKGROUND_SERVERS |
| Ритм разработки (82–94) | literal | `readme-developer-rhythm` | Ссылается на DEVELOPER_RHYTHM; таблица ритуалов — prose |
| Полезные yarn-команды (96–108) | literal | `readme-yarn-workspace-hints` | Образовательный блок workspace foreach |
| Структура пакетов — таблица (110–119) | **function** | `readme-package-layers-table` | Слои/зависимости; v1 — pure constants, v2 — pin.rows из template |
| Инструменты (121–126) | literal | `readme-dev-tools` | Короткий список stack |
| Виртуальная команда AI (128–132) | literal | `readme-virtual-team` | Ссылка на docs/ + workflow |
| Документация — таблица (134–145) | literal | `readme-documentation-index` | Навигация; Mintlify vs normative docs |

### Кандидаты на function (v2, не в первом generate)

| granule id | Зачем |
|------------|-------|
| `readme-quickstart-scripts` | Список `yarn build/lint/test` из корневого `package.json` scripts |
| `readme-badges-header` | Shields.io / CI status (если появятся в README) |
| `readme-doc-links-table` | Агрегация ссылок из `docs/README.md` через io.exec на краю generate |

---

## Файловая структура (канон)

```
docs/containers/strategic-docs/
├── design/
│   └── README-GRANULATION-DESIGN.md    ← этот документ
├── granules/
│   ├── readme-strategic-context/
│   │   ├── granule.json
│   │   └── body.md
│   ├── readme-principles/
│   │   ├── granule.json
│   │   └── body.md
│   └── readme-background-servers-table/
│       ├── granule.json
│       └── render.mjs                  ← export renderBackgroundServersTable
├── templates/
│   └── readme-main/
│       └── template.json
├── releases/                           ← после generate (read-only)
├── experiments/                        ← invalid / карантин
└── stubs/                              ← пруф syncGranule (существует)
```

---

## Surface routing (не schema)

| Артефакт | Git (SoT) | Affine workspace | Affine namespace | Harness |
|----------|-----------|------------------|------------------|---------|
| Granule | `granules/<id>/` | **Templates** — doc `Granule · <id>` + metadata | `strategic-docs` | — |
| Template | `templates/<id>/template.json` | **Templates** — doc `Template · <id>` | `strategic-docs` | — |
| Release | `releases/<id>/` | **Releases** — `Release · <id>` + `Meta · <id>` | `strategic-docs` | — |
| Container atlas | `docs/tooling-atlas/` | — | — | `tooling/containers.mdx` |

Git `granules/` · `templates/` · `releases/` — типы артефактов, **не** папки в Affine. См. [`SURFACE.md`](../SURFACE.md).

Поле `meta.surface` в `template.json` — куда **целится** собранный релиз (`github`, `strategy.mmbrn.tech`), не harness.

---

## Schema шаблона (valid(template))

Согласовано с `scripts/lib/strategic-docs-model.mjs` и INTERFACE_CONTRACT Phase 3.

```json
{
  "id": "readme-main",
  "version": "0.1.0",
  "target": "README.md",
  "skeleton": "... {{placeholders}} ...",
  "slots": [
    {
      "granuleId": "readme-strategic-context",
      "pin": "1.0.0",
      "placeholder": "{{strategic_context}}"
    }
  ],
  "meta": {
    "owner": "product",
    "surface": ["github", "strategy.mmbrn.tech"]
  }
}
```

### Schema гранулы (v1.1 — metadata для Affine)

Поля loader/model уже знают (`id`, `version`, `kind`, `bodyPath` / `fn` + `modulePath`). Для конструктора в Affine добавляем provenance (опционально до первого owner import):

```json
{
  "id": "readme-strategic-context",
  "version": "1.0.0",
  "kind": "literal",
  "bodyPath": "./body.md",
  "description": "…",
  "source": {
    "repoPath": "docs/containers/strategic-docs/granules/readme-strategic-context/body.md"
  },
  "foundations": [
    { "path": "docs/WHITE_PAPER.md", "role": "north-star" },
    { "path": "docs/MEMBRANE_PLATFORM.md", "role": "platform" }
  ],
  "usedBy": [
    { "templateId": "readme-main", "placeholder": "{{strategic_context}}", "pin": "1.0.0" }
  ]
}
```

| Поле | Обязательно | Назначение |
|------|-------------|------------|
| `id`, `version` | да | ключ `id@version` в index |
| `kind` | да | `literal` \| `function` |
| `bodyPath` / `fn`+`modulePath` | по kind | откуда рендерится тело |
| `source.repoPath` | v1.1 | git-путь для Affine metadata block |
| `foundations[]` | v1.1 | основания / provenance (нормативные docs) |
| `usedBy[]` | v1.1 | обратная ссылка: какой template slot потребляет |

**Правила valid:**

- `template.version` и каждый `slot.pin` — exact semver (`x.y.z`)
- Ключ гранулы в index: `granuleId@pin`
- Каждый `{{...}}` в skeleton ↔ ровно один slot
- literal → `bodyPath`; function → `fn` + module (generators: `kind: "fn"`, `modulePath`)

---

## Function granule: контракт

```js
/**
 * @param {{ pin?: object, ctx: { granuleId: string, version: string } }} input
 * @param {{ exec: (req) => Promise<any> }} io  — pureIoThrow по умолчанию
 * @returns {Promise<{ body: string, trace?: object }>}
 */
export async function renderBackgroundServersTable({ pin, ctx }, io) {
  // pure: константы или pin.rows, без fs/network
  return { body: '...markdown table...' };
}
```

---

## Что нужно от владельца (следующий шаг)

1. ~~**Ратификация резки**~~ — **OK** (12 слотов, `readme-*` prefix, draft → полный набор).
2. ~~**Ратификация id**~~ — **OK** (`readme-*` kebab-case).
3. **Первый generate** — `yarn strategic-docs:generate --template readme-main` (или `--dry-run` для проверки без записи).
4. **Office-валидация** — подтвердить stub vs prod endpoint перед записью в `releases/` (локально: `valid(template)` + stub route).
5. **Интеграция с корнем** — когда переключать корневой README на generated copy (отдельный ADR/интеграция sprint)

---

## Связи

- Шторм: [`docs/storm/storm-strategic-docs-container-2026-07-24/THESES.md`](../../storm/storm-strategic-docs-container-2026-07-24/THESES.md)
- Cowork brief: [`docs/cowork-sprint/cowork-strategic-docs-container/COWORK_SPRINT_BRIEF.md`](../../cowork-sprint/cowork-strategic-docs-container/COWORK_SPRINT_BRIEF.md)
- Модель: [`scripts/lib/strategic-docs-model.mjs`](../../../scripts/lib/strategic-docs-model.mjs)
- Surface: [`SURFACE.md`](../SURFACE.md)
