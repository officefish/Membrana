# tasks-master — кит мастерской задач

Поставка инструментов primary-мастерской [`docs/tasks`](../../docs/tasks/WORKSHOP.md)
(decision-verbs + контракты спринта tasks-workshop). Код — в `scripts/`; здесь только
манифест и README ([`kits/README.md`](../README.md)).

**Owner пина:** `vesnin` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).  
**Дверь дома:** [`docs/tasks/WORKSHOP.md`](../../docs/tasks/WORKSHOP.md) · `yarn task:tools`.  
**Мастерская заказывает кит:** [`workshop.manifest.json`](../../docs/tasks/workshop.manifest.json) → `"kit": "kits/tasks-master"`.

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактив | дерево может быть новее; `yarn kits:audit --id tasks-master --mode latest` |
| **pinned** | autonomous | только от пина; `yarn kits:audit --id tasks-master` |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`.

## Roots → yarn

| Root | yarn |
|------|------|
| `scripts/task-inspect.mjs` | `task:inspect` |
| `scripts/task-list.mjs` | `task:list` |
| `scripts/task-validate.mjs` | `task:validate` |
| `scripts/task-invariants.mjs` | `task:invariants` |
| `scripts/task-invariants-repair.mjs` | `task:invariants:repair` |
| `scripts/one-shot-rank.mjs` | `one-shot:rank` |
| `scripts/one-shot-trail.mjs` | `one-shot:trail` |
| `scripts/task-tools.mjs` | `task:tools` (инвентарь) |

Инвентарь: `yarn task:tools` читает `docs/tasks/workshop.catalog.json`.

## Вне кита

- **V2 writers/sync/start:** `task:register`, `archive`, `close-github`, `sync-readme`, `sync-issues`, `task:start`.
- **Neighbor audit-family:** `tasks:audit`, `tasks:decompose` → [`docs/audit/tasks`](../../docs/audit/tasks/).
- **Объявлены в package.json, движков нет в дереве** (известная дыра SCRIPTS_LIST):  
  `task:board` → `generate-active-tasks-board.mjs`,  
  `tasks:bookkeeping` → `tasks-bookkeeping.mjs`,  
  `tasks:reviewing` → `tasks-reviewing.mjs`.  
  В catalog остаются как decision-verbs; в pins **не** входят, пока файлов нет.

## Аудит

```bash
yarn kits:audit --id tasks-master
yarn kits:audit --id tasks-master --mode latest
```
