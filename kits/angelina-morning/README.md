# angelina-morning — кит подготовки утра

Первый жилец слоя [`kits/`](../README.md). Именованный набор точек входа, чтобы
секретарь **Ангелина** подготовила день и довела до `ritual:day` / связанных
шагов (ласточка, hermes).

**Owner пина:** `angelina` (`leadPersona` в [`MANIFEST.json`](./MANIFEST.json)).  
**Эпик:** `kits-angelina-morning` (#814) · фаза K3 (#818).  
**Прецеденты:** [`docs/precedents/2026-07-21-morning-ritual-*`](../../docs/precedents/).

## Режимы

| Режим | Когда | Поведение |
|-------|--------|-----------|
| **latest** | интерактивная сессия, владелец рядом | дерево `scripts/` может быть новее пина; `yarn kits:audit --mode latest` — `sha_drift` = warn |
| **pinned** | autonomous (night / cron / office) | только от пина; `yarn kits:audit` (default) — drift = BLOCK |

Обновление пина — **отдельный** ревьюируемый коммит `MANIFEST.json`, не побочный
эффект правки скрипта.

## Корни (yarn / файлы)

| Корень | Типичный yarn |
|--------|----------------|
| `scripts/morning-care.mjs` | `yarn morning-care` |
| `scripts/worktree-sync.mjs` | (в `ritual:day`) |
| `scripts/repo-clean.mjs` | `yarn repo:clean` |
| `scripts/deps-watch.mjs` | (в `ritual:day`) |
| `scripts/plan-week-if-monday.mjs` | (в `ritual:day`) |
| `scripts/strategy-day.mjs` | `yarn strategy:day` |
| `scripts/daily-standup.mjs` | `yarn standup` |
| `scripts/main-day-probe.mjs` | (в `ritual:day`) |
| `scripts/main-day-issue.mjs` | (в `ritual:day`) |
| `scripts/angelina.mjs` | (в `ritual:day`) |
| `scripts/morning-gate.mjs` | `yarn morning:gate` |
| `scripts/telegram-swallow.mjs` | `yarn telegram:swallow` |
| `scripts/hermes-brief.mjs` | `yarn hermes:brief` |

Цепочка утра: `yarn ritual:day` (часть корней). Ласточка и hermes — соседние
шаги после артефакта; в кит входят как корни для пина.

## Аудит

```bash
yarn kits:audit --id angelina-morning
yarn kits:audit --id angelina-morning --mode latest
```

## Чеклист PINNED_SUBGRAPH (этот кит)

1. ✅ Единица версии — подграф в `MANIFEST.json` (`pins`).
2. ✅ Пины — git blob SHA; копий файлов нет.
3. ✅ Аудит полноты — `yarn kits:audit --id angelina-morning`.
4. ✅ Режимы latest/pinned — таблица выше + CLI `--mode`.
5. ✅ Обновление пина — отдельный ревьюируемый коммит манифеста.
6. ✅ Владелец пина — `leadPersona: angelina`.
7. ✅ Дрейф — табличный вывод audit (`missing_pin` / `sha_drift`).

Канон слоя: [`kits/README.md`](../README.md). Паттерн:
[`PINNED_SUBGRAPH_VERSIONING`](../../docs/patterns/PINNED_SUBGRAPH_VERSIONING.md).

## Вне скоупа (соседи)

- Ценностный доклад утра (#788) — не подменяет этот кит.
- `repo:clean --execute` — только по ok владельца.
- Процедура утра: [`docs/procedures/ritual-day/`](../../docs/procedures/ritual-day/) (`kitVersion`: `kits/angelina-morning`).
