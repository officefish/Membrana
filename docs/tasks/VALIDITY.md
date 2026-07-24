# validateTask / validateRegistry — валидность карточки

> Фаза V5 спринта tasks-workshop · Issue [#1061](https://github.com/officefish/Membrana/issues/1061) ·
> вердикт [`tasks-workshop-m4b-validity-2026-07-23.md`](../seanses/tasks-workshop-m4b-validity-2026-07-23.md).

## Контракт

```ts
validateTask(card, links) → { ok, level, findings[] }
validateRegistry(cards, links) → { ok, level, byCard, groupFindings[], findings[] }
```

- **Чистые функции** в [`scripts/lib/task-validity.mjs`](../../scripts/lib/task-validity.mjs):
  без сети и без fs.
- **Слепок `links`** собирает грязный слой
  [`scripts/lib/task-validity-links.mjs`](../../scripts/lib/task-validity-links.mjs).
  Недоступность внешней системы → `unknown`, не ошибка.
- **Уровни:** `blocker` (работа не начинается) · `warning` (можно, след неполон) ·
  `note` (заметка). `unknown` не поднимает уровень выше `warning`.
- **Находка** всегда с адресом: `cardId` + `field`.

### Слепок карточки

| Поле | Значения |
|------|----------|
| `issueState` | `open` / `closed` / `missing` / `unknown` / `null` (нет githubIssue) |
| `linearState` | то же для linearId |
| `promptExists` | `true` / `false` / `unknown` |
| `promptIsStub` | `true` / `false` / `unknown` |
| `insightExists` | `true` / `false` / `unknown` / `null` |

### Элемент vs группа

| Слой | Что проверяет |
|------|----------------|
| Элемент | поля карточки, согласованность status/дат, живость связей по слепку |
| Группа | дубликаты `id`, зонтик active→одна иссью, целостность `parentEpic`, README↔registry |

Групповая проверка, выполнимая на одной карточке, запрещена (тест-инвариант).

### Граница с `tasks:audit`

| | `tasks:audit` | валидность |
|--|---------------|------------|
| Вопрос | что из `active` закрыто на самом деле | цела ли карточка как запись |
| Поглощение | нет | нет |
| Направление | audit **может** использовать предикат | обратное — нет |

`scripts/lib/tasks-audit.mjs` оставлен как есть: другой вопрос, другой носитель.

### Зрение, не забор

Предикат и CLI дают вердикт, но **не останавливают ритуал**. Exit `0` при любом
наборе находок; `2` — только ошибка CLI / нет карточки.

## CLI

```bash
yarn task:validate [cardId] [--json] [--offline]
```

- без `cardId` — весь реестр;
- offline (default): prompt/insight/README с диска; issue/linear → `unknown`;
- `--online` пока = offline для issue/linear в этом CLI; полный сетевой слепок
  сцепки — [`yarn task:invariants --full`](./SYNC_INVARIANTS.md) (фаза v6).

Оболочка: [`scripts/task-validate.mjs`](../../scripts/task-validate.mjs).
