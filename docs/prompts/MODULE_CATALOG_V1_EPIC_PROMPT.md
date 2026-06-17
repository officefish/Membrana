# Промпт (эпик): Module & plugin catalog v1 — реестр и живые спецификации client

> **Стратегический task-промпт (эпик)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (фазы MC-0…MC-9, спринт ~1 неделя).
> Ветка: **`ozhegov/module-catalog-v1`** → merge в **`main`** после LGTM.
> Реестр: `id` = **`module-catalog-v1`** в [`docs/tasks/registry.json`](../tasks/registry.json).
> Основание: консилиум виртуальной команды 2026-06-17.

---

## Контекст

Знание о модулях и плагинах `apps/client` размазано между `MODULE_AND_PLUGIN_UI.md` (общие правила), archived task-промптами (`docs/prompts/*_PROMPT.md`) и кодом `registerClientModules.ts`. AI-агенты не получают **живую продуктово-архитектурную спецификацию** конкретной сущности перед правками.

**Цель эпика:** ввести **каталог (catalog)** — отдельный от task-реестра слой:

| Артефакт | Назначение | Жизненный цикл |
|----------|------------|----------------|
| `docs/tasks/registry.json` | Очередь работ M/L | active → archived |
| `docs/catalog/client/registry.json` | Индекс модулей/плагинов | draft → stable → deprecated |
| `docs/catalog/client/prompts/**/*.md` | Живая спецификация сущности | обновляется при существенных PR |

**Фаза 2 (out of scope эпика):** `docs/catalog/cabinet/` — отдельный эпик `module-catalog-cabinet-v1`.

**Инвентарь client (на старт эпика):**

- **7 модулей:** `microphone`, `sample-library`, `telemetry-journal`, `fft-analyzer`, `spectrum-3d`, `audio-file-upload`, `oscilloscope`
- **12 плагинов:** 8 на `microphone`, 4 на `sample-library`

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Регистрация, UI, install/teardown |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов, audio-engine |
| [`DESIGN.md`](../DESIGN.md) | UI-токены |
| [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) | Live-детекторы |
| [`SERVICES.md`](../SERVICES.md) | Сервисы analyzer/foundation |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Отличие catalog vs task prompt |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли |

**GitHub Issue:** [#90](https://github.com/officefish/Membrana/issues/90) — «Создать catalog v1: реестр модулей и плагинов client + промпты-спецификации».

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Реализуй эпик **module-catalog-v1** по фазам MC-0…MC-9.
>
> **Цель:** `docs/catalog/` с регламентом, `client/registry.json`, промптами для всех 7 модулей и 12 плагинов, verify-скриптом в CI, правилом для агентов «читай catalog prompt перед правкой module/plugin».
>
> **Запрещено:** смешивать catalog-реестр с `docs/tasks/registry.json`; удалять archived task-промпты; дублировать бизнес-логику в markdown вместо ссылок на `@membrana/*-service`; прямой Web Audio вне audio-engine; коммитить `generated/`.
>
> **Порядок фаз (зависимости):**
> 1. **MC-0** — `docs/catalog/README.md` + ссылка в `CONTRIBUTING.md`
> 2. **MC-1** — шаблоны `MODULE_PROMPT.template.md`, `PLUGIN_PROMPT.template.md`
> 3. **MC-2** — `client/registry.json` v1 + stable промпт **`microphone`** (модуль)
> 4. **MC-3** — stable промпты **`microphone-stream-viz`**, **`trends-fft-analyzer`** (плагины)
> 5. **MC-4** — stable промпт **`telemetry-journal`** + parity note для cabinet
> 6. **MC-5** — draft-промпты остальных 5 модулей
> 7. **MC-6** — draft-промпты остальных 10 плагинов (дистилляция из archived task prompts где есть)
> 8. **MC-7** — `scripts/verify-client-catalog.mjs` + `yarn catalog:verify-client` в CI
> 9. **MC-8** — `.cursorrules` + `AGENTS.md`: обязательное чтение catalog prompt
> 10. **MC-9** — ревью: 2 модуля stable, LGTM Vesnin
>
> **Закрытие:** PR в `main`, отчёт в Issue, `yarn task:archive module-catalog-v1` + подзадачи MC-*.

---

## Распределение по виртуальной команде

| Фаза | ID | Lead | Support | Артефакт |
|------|-----|------|---------|----------|
| **MC-0** | `mc-0-catalog-regulation` | **Vesnin** | Ozhegov | `docs/catalog/README.md` |
| **MC-1** | `mc-1-prompt-templates` | **Ozhegov** | Vesnin | `_templates/*.template.md` |
| **MC-2** | `mc-2-registry-microphone-pilot` | **Ozhegov** | Музыкант | registry + `modules/microphone.md` stable |
| **MC-3** | `mc-3-pilot-plugins` | **Ozhegov** | Dynin | 2 plugin prompts stable |
| **MC-4** | `mc-4-telemetry-journal-stable` | **Rodchenko** | Ozhegov | `modules/telemetry-journal.md` + journal-report-views |
| **MC-5** | `mc-5-remaining-modules-draft` | **Vesnin** | все | 5 draft module prompts |
| **MC-6** | `mc-6-remaining-plugins-draft` | **Ozhegov** | Dynin | 10 draft plugin prompts |
| **MC-7** | `mc-7-verify-script-ci` | **Ozhegov** | Vesnin | verify script + CI step |
| **MC-8** | `mc-8-agent-rules-integration` | **Vesnin** | — | `.cursorrules`, `AGENTS.md` |
| **MC-9** | `mc-9-stable-review` | **Vesnin** | все | status stable в registry |

---

## Архитектурный контракт каталога

### Структура `docs/catalog/`

```text
docs/catalog/
├── README.md                         # регламент: catalog ≠ tasks
├── _templates/
│   ├── MODULE_PROMPT.template.md
│   └── PLUGIN_PROMPT.template.md
└── client/
    ├── registry.json
    └── prompts/
        ├── modules/
        │   └── <module-id>.md
        └── plugins/
            └── <plugin-id>.md
```

### Запись `client/registry.json` (схема v1)

```json
{
  "version": 1,
  "app": "client",
  "entries": [
    {
      "id": "microphone",
      "kind": "module",
      "name": "Микрофон",
      "status": "stable",
      "promptPath": "docs/catalog/client/prompts/modules/microphone.md",
      "code": {
        "registerId": "microphone",
        "moduleFile": "apps/client/src/modules/microphone/MicrophoneModule.tsx"
      },
      "plugins": ["microphone-stream-viz", "trends-fft-analyzer"],
      "services": ["@membrana/audio-engine-service"],
      "relatedTasks": ["dsp-drone-detector", "trends-fft-microphone-plugin"]
    }
  ]
}
```

`kind`: `module` | `plugin`.  
`status`: `draft` | `stable` | `deprecated`.

### Обязательные секции catalog-промпта (модуль / плагин)

1. Идентичность (`id`, версия, категория, lead-роль)
2. Зачем пользователю (сценарий 3–5 шагов)
3. UX-состояния (idle / loading / active / error / empty)
4. Архитектура (таблица слой → путь → ответственность)
5. Запрещённые импорты
6. Конфиг (`defaultConfig`, persist, sidebar)
7. Потоки данных (hub / engine / journal) — mermaid по необходимости
8. Дочерние плагины (для модуля) или parent module (для плагина)
9. Сервисы `@membrana/*`
10. Тестирование (unit + ручной чеклист)
11. Связанные archived task-промпты
12. Changelog (дата + кратко)

### Verify-скрипт `yarn catalog:verify-client`

- Все `registerLazyModule` / `registerPlugin` id из `registerClientModules.ts` ∈ registry
- У каждой записи существует файл `promptPath`
- `plugins[].parentModuleId` (или поле в module entry) согласовано с `registerPlugin('parent', …)`
- Exit code 1 при рассинхроне

**Запрещено в реализации эпика:**

- Автогенерация промптов из AST без ревью
- Storybook / скриншоты (фаза 2)
- Cabinet catalog (отдельный эпик)

---

## Фазы и DoD

### MC-0 — Регламент каталога (S) — Vesnin

- [ ] `docs/catalog/README.md`: отличие catalog vs task registry vs `MODULE_AND_PLUGIN_UI.md`
- [ ] Lifecycle `draft` → `stable` → `deprecated`
- [ ] Правило: после merge task-PR по module/plugin — обновить catalog prompt
- [ ] Ссылка из `docs/CONTRIBUTING.md` (раздел документации)

### MC-1 — Шаблоны промптов (S) — Ozhegov

- [ ] `docs/catalog/_templates/MODULE_PROMPT.template.md` — 12 секций из контракта
- [ ] `docs/catalog/_templates/PLUGIN_PROMPT.template.md` — + install/teardown, parent module
- [ ] Пример заполнения (комментарии `<!-- example -->`, не реальный модуль)

### MC-2 — Пилот: microphone + registry v1 (M) — Ozhegov + Музыкант

- [ ] `docs/catalog/client/registry.json` создан, `version: 1`
- [ ] `prompts/modules/microphone.md` — **stable**
- [ ] Описаны: `microphoneStreamHub`, `microphoneCaptureCoordinator`, 8 child plugin ids
- [ ] Аудио-контракт: только `@membrana/audio-engine-service`

### MC-3 — Пилот: 2 плагина stable (M) — Ozhegov + Dynin

- [ ] `prompts/plugins/microphone-stream-viz.md` — stable (install/teardown, hub)
- [ ] `prompts/plugins/trends-fft-analyzer.md` — stable (engine, journal sink, DRONE_TIGHT)
- [ ] Записи в registry, связь с parent `microphone`

### MC-4 — telemetry-journal stable (M) — Rodchenko

- [ ] `prompts/modules/telemetry-journal.md` — stable
- [ ] Report types, `@membrana/journal-report-views`, parity note для cabinet
- [ ] UX: фильтры, live refresh, empty states

### MC-5 — Остальные модули draft (M) — Vesnin

- [ ] Draft-промпты: `fft-analyzer`, `spectrum-3d`, `audio-file-upload`, `oscilloscope`, `sample-library`
- [ ] Все 7 module id в registry, status `draft` кроме stable из MC-2/MC-4

### MC-6 — Остальные плагины draft (M) — Ozhegov

- [ ] 10 plugin prompts — draft; дистилляция из archived prompts (`fft-indices-viz`, `sound-quality-viz`, …) где применимо
- [ ] Все 12 plugin id в registry

### MC-7 — Verify + CI (M) — Ozhegov

- [ ] `scripts/verify-client-catalog.mjs`
- [ ] `package.json`: `"catalog:verify-client": "node scripts/verify-client-catalog.mjs"`
- [ ] `.github/workflows/ci.yml`: шаг после install (или в turbo pipeline doc)
- [ ] `yarn catalog:verify-client` зелёный на текущем дереве

### MC-8 — Правила агентов (S) — Vesnin

- [ ] `.cursorrules`: перед правкой `apps/client/src/modules/*` или `plugins/*` — читать catalog prompt
- [ ] `AGENTS.md`: одна строка в Gotchas

### MC-9 — Stable review (S) — Vesnin

- [ ] `microphone`, `telemetry-journal` — `status: stable` в registry
- [ ] Teamlead LGTM на 2 pilot plugin prompts
- [ ] Чеклист: новый агент находит контекст микрофона без полного обхода `apps/client`

---

## DoD эпика

- [ ] `docs/catalog/` по структуре выше
- [ ] 7 modules + 12 plugins в `client/registry.json`
- [ ] ≥3 stable prompts (microphone, telemetry-journal, +2 plugins)
- [ ] Остальные — `draft`, но файл и обязательные секции заполнены
- [ ] `yarn catalog:verify-client` в CI
- [ ] `yarn turbo run lint typecheck test build --continue` зелёный
- [ ] Отчёт в GitHub Issue + `yarn task:archive module-catalog-v1`

---

## Out of scope

- `docs/catalog/cabinet/` (эпик `module-catalog-cabinet-v1`)
- Автогенерация из кода
- Storybook / скриншоты
- Переписывание archived task prompts
- Изменение runtime-кода модулей (только docs + verify script)

---

## Порядок работы ролей

1. **Vesnin** — MC-0, MC-5 координация, MC-8, MC-9 LGTM
2. **Ozhegov** — структура catalog, registry, verify, большинство prompts
3. **Dynin** — секции метрик/детекторов в plugin prompts
4. **Музыкант** — аудио-контракт в microphone и mic plugins
5. **Rodchenko** — telemetry-journal UX и report cards

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) + ссылка на этот файл и `id: module-catalog-v1`
2. Записи в `docs/tasks/registry.json` (эпик + MC-0…MC-9)
3. `yarn task:sync-readme`
4. Утро: `yarn main-day-issue` с `primaryFocusId: mc-0-catalog-regulation` или `mc-1-prompt-templates`
5. После merge: `yarn task:archive module-catalog-v1 --notes "PR #…"`

### Проверка после PR

```bash
yarn catalog:verify-client
yarn task:list
yarn turbo run lint typecheck test build --continue
```

---

## Связь с дорожной картой

- Снижает стоимость онбординга агентов и людей на `apps/client`
- Подготовка к cabinet catalog и parity client↔cabinet
- Дополняет `MODULE_AND_PLUGIN_UI.md` (как) спецификациями (что и зачем)
