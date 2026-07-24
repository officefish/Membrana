# inspectElement — паспорт карточки реестра задач

> Фаза V4 спринта tasks-workshop · Issue [#1060](https://github.com/officefish/Membrana/issues/1060) ·
> вердикт [`tasks-workshop-m4a-inspect-2026-07-23.md`](../seanses/tasks-workshop-m4a-inspect-2026-07-23.md).

## Контракт

```ts
inspectElement(registry, cardId, { depth?: 1 | 2 }): CardInspection | null
```

- **Без сети.** Читает только объект реестра (`docs/tasks/registry.json` в CLI).
- **Живые данные** Linear/GitHub — отдельная команда/флаг `--refresh` **вне** inspect
  (внутри `yarn task:inspect --refresh` → отказ).
- **База рекурсии:** только карточки со `status: active`. В архив спуска нет.
- **depth:** `1` — self + живые children; `2` (default) — + grandchildren по каждому
  живому child.

## Паспорт

| Поле | Источник |
|------|----------|
| `id` / `slug` | `task.id` |
| `status` | `task.status` |
| `owner` | `task.leadPersona` |
| `parentEpicId` | `task.parentEpic` |
| `updatedAt` | `archivedAt ?? createdAt` |
| `links[]` | github / linear / prompt / insight как URN без fetch |
| `orphaned` | parent задан, но id нет в реестре → маркер `[ORPHANED]` |
| `inconsistent` | мёртвый родитель при живом ребёнке, или мёртвый эпик с живыми детьми → `[INCONSISTENT]` |

## CLI

```bash
yarn task:inspect <cardId> [--depth=1|2] [--json]
```

- stdout — tree-view (или JSON при `--json`);
- stderr — предупреждения по маркерам;
- exit `0` — паспорт без маркеров; `1` — есть `[ORPHANED]`/`[INCONSISTENT]`; `2` — ошибка CLI / нет карточки.

Чистая логика: [`scripts/lib/task-inspect.mjs`](../../scripts/lib/task-inspect.mjs).
Оболочка: [`scripts/task-inspect.mjs`](../../scripts/task-inspect.mjs).

## Пример

```text
task:inspect tasks-workshop (depth=2)

tasks-workshop [active] · vesnin — Эпик: …
  (дочерние active с отступом; архивные фазы не показываются)
```
