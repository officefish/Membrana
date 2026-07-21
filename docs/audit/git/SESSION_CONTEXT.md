# SESSION_CONTEXT — git audit container

Краткий рабочий контекст для продолжения. При старте сессии читать **перед** Scenario A/B/Assortment.

| | |
|---|---|
| **Worktree** | `C:\Users\user190825\practice\Membrana-codex` |
| **Ветка** | `docs/branch-mintlify-engine` |
| **Активный спринт** | `branch-mintlify-engine` · [#823](https://github.com/officefish/Membrana/issues/823) · lead **vesnin** |
| **Фаза сейчас** | F0–F4 в дереве; next ship → F5 archive |
| **Не путать с** | `Membrana-grok` (`feature/kam-k0-brief` / kits) · `Membrana-product` (`feat/pl-r4-grammar`) |

## Server-first (норма владельца, 2026-07-21)

У каждого контейнера — свой **движок**. Для `docs/audit/git/`:

| Слой | Путь | Роль |
|------|------|------|
| Контейнер | `docs/audit/git/` | registry · analysis · Scenario A/B/Assortment |
| Движок | **Mintlify** → `apps/docs/**` | cookbooks «ветка → случай» с примерами |
| Пин | манифест подграфа инструкций | [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) · path→SHA · latest/pinned |

**Пин ≠** hygiene-реестр веток и **≠** киты скриптов (`kits-angelina-morning` / #814 / #761).
Киты пинят `scripts/` + `lib/`; этот спринт пинит **MDX/`docs.json` инструкций**.

Источник правды страниц спринта: **`apps/docs`**. Внешний
`mintlify-community/docs-membrana-*` — вне scope.

## Спринт `branch-mintlify-engine`

| Фаза | id | Issue | lead | Статус |
|------|-----|------:|------|--------|
| F0 | `bme-f0-brief` | [#824](https://github.com/officefish/Membrana/issues/824) | vesnin | ✅ артефакты |
| F1 | `bme-f1-cases` | [#825](https://github.com/officefish/Membrana/issues/825) | ozhegov | ✅ `analysis/branch-cases-catalog-2026-07-21.md` |
| F2 | `bme-f2-pages` | [#826](https://github.com/officefish/Membrana/issues/826) | rodchenko | ✅ 5 cookbooks + group в `docs.json` · `yarn docs:lint` OK |
| F3 | `bme-f3-wire` | [#827](https://github.com/officefish/Membrana/issues/827) | ozhegov | ✅ README/AGENT_PROMPT → cookbooks |
| F4 | `bme-f4-pins` | [#828](https://github.com/officefish/Membrana/issues/828) | dynin | ✅ `pins/…manifest.json` + `yarn audit:branch-instructions-pin` |
| F5 | `bme-f5-closure` | [#829](https://github.com/officefish/Membrana/issues/829) | vesnin | после ship: CLOSURE / archive фаз |

Цепь: F0→F5. Эпик-промпт: [`BRANCH_MINTLIFY_ENGINE_PROMPT.md`](../../prompts/BRANCH_MINTLIFY_ENGINE_PROMPT.md).

**Запрещено без слова владельца:** `repo:clean --execute`; Scenario B без явной категории 1–7;
колонизация `kits/` / Р4-движка (`pl-r4-grammar` #813 — соседний PR, не наш скоуп).

## Два измерения контейнера (фон)

| Измерение | Вопрос | Орган |
|-----------|--------|-------|
| **Гигиена** (7 cat) | Можно ли трогать / сносить / salvage? | `registry/BRANCHES_DECOMPOSE_LIST.md` + Scenario B |
| **Ассортимент** | Есть ли представитель жанра для рефактора/CR? | [`analysis/branch-assortment-coverage-2026-07-21.md`](./analysis/branch-assortment-coverage-2026-07-21.md) |
| **Кейсы → движок** (новый) | Какую форму имени взять под случай? | `analysis/branch-cases-catalog-*.md` → Mintlify (F2+) |

Assortment-спринт (#801) **закрыт** (PR #810/#811). Его артефакты — вход F1.

## Дыры ассортимента (не закрывать в F0/F1 кодом)

1. `cowork/*` — нет live после GC  
2. `research` / `hackathon` — нет веток в живом registry  
3. `feature/*` — live много, вне словаря kind Р4 (антипример)

## Gotcha

`cursor` `move_agent_to_root` → Membrana-codex **падает**, если ветка занята в другом дереве.
Продолжать по явному `working_directory`. `main` держит `Membrana-grok` — ff-sync после ship пропускается (ожидаемо).

## Опоры

- Entry: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md)
- Layout: [`README.md`](./README.md)
- Skills: `membrana-branch-audit` · `membrana-branch-decompose`
- Coverage: [`analysis/branch-assortment-coverage-2026-07-21.md`](./analysis/branch-assortment-coverage-2026-07-21.md)
- Ретро: [`analysis/branch-taxonomy-retrospective-2026-07-21.md`](./analysis/branch-taxonomy-retrospective-2026-07-21.md)
- Паттерны: [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md)
