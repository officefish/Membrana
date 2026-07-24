# Инварианты сцепки карточки (Linear / GitHub / closedAt)

> Фаза V6 спринта tasks-workshop · Issue [#1062](https://github.com/officefish/Membrana/issues/1062) ·
> Linear [DRU-410](https://linear.app/techies68/issue/DRU-410) ·
> вердикт [`tasks-workshop-m4c-invariants-2026-07-23.md`](../seanses/tasks-workshop-m4c-invariants-2026-07-23.md) ·
> EPIC V6.

## Три обязательных инварианта

| Инвариант | Когда | Уровень | Пример |
|-----------|-------|---------|--------|
| `linear-live` | `status=active` и `linearId ≠ null` | **HARD_BLOCK** | тикет удалён или закрыт |
| `github-exists` | задан `githubIssue` | **WARNING** | мёртвая ссылка на иссью |
| `closed-at` | иссью на GitHub **closed** | **DATALOSS** | `githubIssueClosedAt` пуст |

Неизвестность внешней системы (`unknown`) **не** поднимает уровень до HARD_BLOCK —
упавший прокси / 403 Linear из РФ не красят реестр красным.

## Контракт

```ts
checkCardIntegrity(card, apiCache?) → { status, violations[], sync }
checkRegistryIntegrity(cards, apiCache?) → { byCard, summary, violations[] }
```

- Чистые функции: [`scripts/lib/task-invariants.mjs`](../../scripts/lib/task-invariants.mjs).
- Слепок / кэш: [`scripts/lib/task-invariants-links.mjs`](../../scripts/lib/task-invariants-links.mjs).
- Цвет: `green` / `yellow` / `red` / `unchecked` (нет свежего слепка).

### Режимы

| Режим | Источник | Когда |
|-------|----------|-------|
| **fast** (утро) | кэш `scripts/cache/task-invariants-api.json`, TTL **4h** | без сети; miss/stale → `unchecked` + подсказка `--full` |
| **full** (вечер) | GitHub `gh` + снимок `linear-snapshot@1` | пишет кэш |

Linear live GraphQL из РФ **не** зовём (403). Полный режим читает
[`docs/tasks/snapshots/linear-snapshot-live-ref.json`](./snapshots/linear-snapshot-live-ref.json)
(производитель media-NL). Путь снимка: `--snapshot <rel>`.

Если `DRU-N` **выше** максимального номера в снимке — состояние `unknown`
(снимок устарел/усечён), не `missing`. Иначе ложный HARD_BLOCK на свежих тикетах.

### Граница с соседями

| | `task:validate` (V5) | `task:invariants` (V6) | `tasks:audit` |
|--|---------------------|------------------------|---------------|
| Вопрос | цела ли карточка как запись | жива ли сцепка + провенанс | что из active закрыто на деле |
| Поглощение | нет | нет | нет |

## Восстановление (без авто)

Автофикс запрещён. Явный план:

```bash
yarn task:invariants:repair <id> --clear-linear          # dry-run
yarn task:invariants:repair <id> --manual-linear DRU-N --execute
yarn task:invariants:repair <id> --clear-issue --execute
yarn task:invariants:repair <id> --link-new               # → yarn task:start, не создаёт сам
```

Дыру `githubIssueClosedAt` закрывает существующий `yarn tasks:sync-issues` (не этот CLI).

## CLI

```bash
yarn task:invariants [cardId] [--fast|--full] [--json]
yarn tasks:sync-check   # alias
```

Зрение, не забор: exit `0` при любом вердикте; `2` — ошибка CLI / нет карточки.

Оболочки: [`scripts/task-invariants.mjs`](../../scripts/task-invariants.mjs),
[`scripts/task-invariants-repair.mjs`](../../scripts/task-invariants-repair.mjs).
