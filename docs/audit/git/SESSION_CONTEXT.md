# SESSION_CONTEXT — git audit container

Краткий рабочий контекст для продолжения. При старте сессии читать **перед** Scenario A/B/Assortment.

| | |
|---|---|
| **Worktree** | `C:\Users\user190825\practice\Membrana-codex` |
| **Активный спринт** | — (последний: `branch-mintlify-engine` **CLOSED**) |
| **Движок** | **Mintlify** · cookbooks `apps/docs/git/cookbooks/` |
| **Пин** | `pins/branch-instructions.manifest.json` · `yarn audit:branch-instructions-pin` |

## Server-first (норма)

| Слой | Путь | Роль |
|------|------|------|
| Контейнер | `docs/audit/git/` | registry · analysis · Scenario A/B/Assortment |
| Движок | Mintlify → `apps/docs/**` | инструкции «ветка → случай» |
| Пин | манифест path→SHA | подграф инструкций · latest/pinned |

**Не путать с** `kits-angelina-morning` (#814) — киты пинят `scripts/`.

## Спринт `branch-mintlify-engine` — CLOSED

Эпик [#823](https://github.com/officefish/Membrana/issues/823) · delivery [#835](https://github.com/officefish/Membrana/pull/835) ·
[`CLOSURE.md`](../../day-sprint/branch-mintlify-engine/CLOSURE.md)

| Фаза | Issue | Статус |
|------|------:|--------|
| F0–F4 | #824–#828 | delivered in #835 |
| F5 | #829 | archive + CLOSURE |

## Три измерения контейнера

| Измерение | Орган |
|-----------|-------|
| Гигиена | `registry/BRANCHES_DECOMPOSE_LIST.md` · Scenario A/B |
| Ассортимент | `analysis/branch-assortment-coverage-*.md` |
| Кейсы → engine | `analysis/branch-cases-catalog-*.md` → Mintlify cookbooks |

## Gotcha

`main` может держать соседний worktree — ff через `origin/main`. Scenario B — только с явной категорией 1–7 в текущем сообщении.

## Опоры

- [`AGENT_PROMPT.md`](./AGENT_PROMPT.md) · [`README.md`](./README.md)
- Skills: `membrana-branch-audit` · `membrana-branch-decompose`
- Паттерны: [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md)
