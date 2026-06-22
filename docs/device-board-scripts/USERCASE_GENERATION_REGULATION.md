# UserCase Generation — регламент (normative)

> **Для агентов:** читать **в этом порядке** перед любой генерацией / pack / collapse UserCase.  
> **Task-промпт:** [`docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md)  
> **RCA / история:** [`USERCASE_COMPETITION_LESSONS.md`](./USERCASE_COMPETITION_LESSONS.md) (L1–L12)  
> **CLI:** `node scripts/usercase.mjs help`  
> **LGTM Teamlead (Vesnin):** 2026-06-21 — канон discovery для AI; merge sprint forks не требуется.

---

## 1. Когда применять

- Новый `usercase-<kebab-id>` или fork MVP (collapse + comment groups).
- Пересборка после правок `usercase-competition-pack.ts`, `collapse-to-function.ts`, runtime L9–L12.
- Пользователь просит «сгенерировать / упаковать / собрать UserCase».

**Не применять** для правок только runtime без нового document — см. recording-gate / observation epics.

---

## 2. Обязательный порядок чтения

| # | Документ | Зачем |
|---|----------|--------|
| 1 | Этот регламент | Правила без истории |
| 2 | [`DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md`](../prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md) | Workflow, DoD, agent block |
| 3 | [`USERCASE_COMPETITION_LESSONS.md`](./USERCASE_COMPETITION_LESSONS.md) | Если ошибка не в таблице §3 |
| 4 | [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §20 | Catalog contract |
| 5 | Эталон Run | [`USERCASE_MVP_MICROPHONE_LGTM.md`](./USERCASE_MVP_MICROPHONE_LGTM.md) |

---

## 3. Запреты (hard)

| # | Запрет | Урок |
|---|--------|------|
| Z1 | Ручное редактирование `*.generated.ts` | — |
| Z2 | Collapse без leaf → root order | L6 |
| Z3 | > 9 pins на сторону function | L7 |
| Z4 | Exec wiring через `firstInternalExecIn` вместо boundary edges | L2 |
| Z5 | Fan-in boundary pins без dedupe | L1 |
| Z6 | Второй collapse без `deserialize(..., functions)` | L10 |
| Z7 | Pure policy nodes на exec chain | L12 |
| Z8 | Merge sprint fork в bundled MVP без отдельной product-задачи | CLOSURE |

---

## 4. Обязательные команды (gates)

```bash
# Baseline (если трогали MVP source)
yarn usercase:build usercase-mvp-microphone

# Сборка целевого id
yarn usercase:build <usercase-id>

# Автоматические gates
node scripts/usercase.mjs verify-pack <usercase-id>

# Pack / collapse tests
yarn workspace @membrana/device-board test usercase-competition-pack collapse-to-function

# Все sprint forks (optional)
node scripts/usercase.mjs verify-competition
```

**Manual Run gate (не заменяется скриптами):** mic device → Apply → Run → `docs/device-board-scripts/logs/info.txt` без `scenario-runtime error`.

**CI (automated):** `.github/workflows/usercase-competition.yml` (PR, path filter) + weekly `scheduled-ci.yml` — `yarn usercase:verify-competition` после одной сборки `@membrana/device-board` (`USERCASE_VERIFY_SKIP_BUILD=1`).

---

## 5. Collapse — норматив

| Правило | Деталь |
|---------|--------|
| Порядок | Leaf → root: trends/observation → gate → policy (если отдельная function) |
| Node ids | Только из актуального `default-usercase-mvp-microphone.generated.ts` |
| Exec false branch | `exec-false-out` → `function-output` → parent `main-infinity` (не trends каждый tick) |
| Data into function | Parent edge → block pin → `function-input` (runtime bridge) |
| Data out of pure function | Block pin → internal pure node via `function-output` (beta policy-build) |
| Hydrate | Block pins sync из `scenario.functions` на любом load path |
| onConnect collapse | Опционально (alpha bootstrap); flat onConnect — OK |

**Reference patterns (все Run-green, без «победителя»):**

| Pattern | id suffix | Functions |
|---------|-----------|-----------|
| Observation + gate | `-alpha` | 3 (+ bootstrap onConnect) |
| Modular policy + gate + trends | `-beta` | 3 |
| Poster gate + trends | `-gamma` | 2 |

---

## 6. DoD (краткий)

```text
[ ] CONCEPT / collapse spec (или явный reuse pattern)
[ ] yarn usercase:build <id>
[ ] node scripts/usercase.mjs verify-pack <id>
[ ] device-board tests (pack + collapse)
[ ] Manual Run: reports + tracks, no runtime error
[ ] catalog entry если нужен picker (bundled-user-case-entries.ts)
[ ] Новый класс ошибки → L13+ в USERCASE_COMPETITION_LESSONS.md
```

---

## 7. Где лежат артефакты

| Артефакт | Путь |
|----------|------|
| Manifest + branches | `docs/device-board-scripts/usercase-<id>/` |
| Embedded document | `packages/device-board/src/graph/default-usercase-<id>.generated.ts` |
| Pack logic | `packages/device-board/src/graph/usercase-competition-pack.ts` |
| Catalog | `packages/device-board/src/catalog/bundled-user-case-entries.ts` |

---

## 8. Routing для координатора (VIRTUAL_TEAM)

| Запрос пользователя | Первый документ |
|---------------------|-----------------|
| «Сгенерируй UserCase» | этот регламент + GENERATION_PROMPT |
| «Добавь в catalog / picker» | + `DEVICE_BOARD_USERCASES_EPIC_PROMPT.md` (U9) |
| «Run падает на collapsed function» | `USERCASE_COMPETITION_LESSONS.md` L9–L12 |
| «Новый node kind / runtime» | отдельный device-board epic, не этот регламент |

---

*Обновлять при новых Z-правилах или yarn-командах. Историю ошибок — только в LESSONS.*
