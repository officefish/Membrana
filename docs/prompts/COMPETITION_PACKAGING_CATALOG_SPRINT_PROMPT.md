# Промпт: Competition packaging — catalog publish async v2

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR** — три async-v2 fork в picker + `comp:publish-catalog` + skill.
> Реестр: `id` = `comp-packaging-catalog-2026-06-25` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Competition Sprint `comp-mvp-async-v2-2026-06-25` **закрыт** (winner Beta). Operator нужны **все три** fork в списке системных UserCase device-board для browser debug. Bundled MVP не меняем.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`COMPETITION_CATALOG_PUBLISH_REGULATION.md`](./COMPETITION_CATALOG_PUBLISH_REGULATION.md) | Канон publish/unpublish |
| [`COMPETITION_SPRINT_REGULATION.md`](../COMPETITION_SPRINT_REGULATION.md) | Phase 5b |
| [`comp-mvp-async-v2 CLOSURE.md`](../competition-sprint/comp-mvp-async-v2-2026-06-25/CLOSURE.md) | Источник fork |
| [`.cursor/skills/membrana-competition-packaging/SKILL.md`](../.cursor/skills/membrana-competition-packaging/SKILL.md) | Playbook агента |

**GitHub Issue:** null (internal sprint).

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Координатор виртуальной команды Membrana под **Vesnin**. Соблюдай границы `@membrana/device-board` и `@membrana/usercase-catalog-service`.

---

### Что построить

1. Три id в picker: `usercase-mvp-microphone-{alpha,beta,gamma}-async-v2` (`tier: community`, badge Sprint).
2. Скрипт `yarn comp:publish-catalog --id <sprint-id>` + `CATALOG_PUBLISH.json`.
3. Skill `membrana-competition-packaging` + раздел Phase 5b в регламенте.
4. (Optional) `yarn competition:synthesis-async-v2` → `COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md`.

---

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Catalog entries | `packages/device-board/src/catalog/community-competition-user-case-entries.ts` | Generated picker rows |
| Bundled list | `bundled-user-case-entries.ts` | MVP + spread community |
| Loaders | `default-usercase-mvp-microphone-*-async-v2.ts` | Lazy parse embedded |
| Entitlement | `@membrana/usercase-catalog-service` | `community` → `canApply: true` |
| Publish | `scripts/comp-publish-catalog.mjs` | verify + codegen |

**Запрещено:** merge winner в bundled MVP; правка generated TS вручную.

---

### Definition of Done

- [x] `yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25` green
- [x] Catalog tests: device-board + usercase-catalog-service
- [x] Skill + `COMPETITION_CATALOG_PUBLISH_REGULATION.md`
- [ ] `COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md` (DeepSeek/Anthropic — optional)
- [ ] Operator F7 smoke logs (human — optional)

---

### Out of scope

- Merge Beta → bundled `usercase-mvp-microphone`
- Новое соревнование трёх команд
- Picker для archived v1 forks

---

### Порядок ролей

1. **Teamlead** — регламент + registry + ACTIVE
2. **Структурщик** — catalog boundaries, generated file
3. **Математик** — verify-async-v2 gate
4. **Верстальщик** — operator picker UX (Sprint badge)

---

## Заметки для постановщика

1. Registry: `comp-packaging-catalog-2026-06-25` active; archive `comp-mvp-async-v2-2026-06-25`.
2. После operator debug: `yarn task:archive comp-packaging-catalog-2026-06-25`.

### Проверка

```bash
yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25
yarn workspace @membrana/device-board test -- src/catalog/user-case-catalog.test.ts
yarn workspace @membrana/usercase-catalog-service test
yarn workspace @membrana/client dev
```
