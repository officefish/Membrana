# Subgroup analysis — cowork-free-fragment-usercases leftover (cat.5 A2)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Parent | Category 5 — Эксперимент leftover (`category-5-attention-2026-07-21.md`, tier A2) |
| Scope | Три block-ветки Cowork Sprint `cowork-free-fragment-usercases` (local only; origin twins уже отсутствуют) |
| Base | `origin/main` `f372fff2` (после `git fetch`; work branch `chore/git-gc-free-fragment` from origin/main) |
| Method | Existence · ahead/behind · `gh pr list --head` · last 5 commits · `git diff --stat origin/main...BRANCH` · tip blob compare vs main for phase1+2 paths · landed-on-main check |
| Gate note | Subgroup of cat.5 leftover, not full Scenario B — report under `analysis/` OK |
| Cache | `docs/audit/git/cache/free-fragment-*.json` (gitignored) |

## Package verdict (prefer one fate)

**discard** — все три локальные ветки.

Почему пакетом: sprint уже влит squash-PR [#489](https://github.com/officefish/Membrana/pull/489) (2026-07-15, merge `22cfc319`), follow-up [#490](https://github.com/officefish/Membrana/pull/490) MERGED, Issue [#487](https://github.com/officefish/Membrana/issues/487) CLOSED, карточка `cowork-free-fragment-usercases` в `docs/tasks/archive/`. Origin twins **уже нет** (`git ls-remote --heads origin 'cowork/cowork-free-fragment-usercases/*'` → пусто). Открытых PR на block-heads нет. Tip SHA не предки main (squash) — `ahead=4` = phase0 brief + ritual + phase1 + phase2; уникальный код либо 1:1 на main (sample), либо **устарел** (neuro всё ещё `stampCompetitionDocumentMeta`; spectrum на `is-recording-window-full` без PC-2 `is-window-elapsed`).

Не удалять без явного ok владельца после этого отчёта.

---

## Inventory

| Branch | Local | Origin twin | Tip SHA | Ahead | Behind | Bucket | Open/any PR `--head` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cowork/cowork-free-fragment-usercases/neuro-detection` | yes | **gone** | `e2c482db` | 4 | 286 | diverged | none |
| `cowork/cowork-free-fragment-usercases/sample-recording` | yes | **gone** | `6cec99e9` | 4 | 286 | diverged | none |
| `cowork/cowork-free-fragment-usercases/spectrum-live` | yes | **gone** | `c0fdabc5` | 4 | 286 | diverged | none |

Shared fork point (phase0): `80d746c6` — `docs(cowork): brief cowork-free-fragment-usercases (#487)` (общая история с `53e47546` ritual MAIN_DAY_ISSUE; merge-base с main: `743f2f38`).

Integration landed as: `cowork/cowork-free-fragment-usercases/integration` → PR **#489** MERGED (`22cfc319`, 2026-07-15T06:08Z). Follow-up: PR **#490** (`c58a7217`) — commit-msg `cowork` + FREE combined не competition-locked. Post-merge эволюция spectrum: PC-2 (`is-window-elapsed`, #505/#507/#511).

Worktree: ни одна из трёх целей не checked out (`chore/git-gc-free-fragment` — текущая).

---

## Per branch

### 1. `cowork/cowork-free-fragment-usercases/neuro-detection`

**Last 5 commits**

```
e2c482db cowork(.../neuro-detection): phase2 нейро-деривация + честный fallback
bdcde5af cowork(.../neuro-detection): phase1 concept
80d746c6 docs(cowork): brief cowork-free-fragment-usercases (#487) — три фрагментарных UC FREE
53e47546 docs(ritual): MAIN_DAY_ISSUE 2026-07-15 — упаковка FREE, три фрагментарных UC
743f2f38 chore(tasks): архив agent-tooling-friction-2 (#469) — …
```

**`git diff --stat origin/main...BRANCH`:** 8 files, +1199 / −94. Phase1+2 product surface: CONCEPT/EXPECTATIONS + `usercase-free-neuro-detection.ts` (+ test). Shared: BRIEF + registry/README/MAIN_DAY noise.

**Tip contains:** docs team-neuro + FREE neuro graph builder (деривация из combined) + tests. Device-board graph only.

**Blob check phase1+2 (+ BRIEF) vs `origin/main`:** identical **3**, differs **2**, missing **0**.

| Path | Status |
| --- | --- |
| `team-neuro-detection/CONCEPT.md` | identical |
| `team-neuro-detection/EXPECTATIONS.md` | identical |
| `COWORK_SPRINT_BRIEF.md` | identical |
| `usercase-free-neuro-detection.ts` | **differs** (tip→main: +15/−10) |
| `usercase-free-neuro-detection.test.ts` | **differs** (tip→main: +17/−8) |

Differs (tip **older**): tip всё ещё вызывает `stampCompetitionDocumentMeta(document)`; на main штамп снят (адаптер A3 интеграции / ретро: «снят competition-штамп neuro»), остался поясняющий комментарий про `isCompetitionStructureLocked`. Re-PR tip = регрессия FREE-палитры.

| Verdict | Why |
| --- | --- |
| **discard** | Sprint влит #489; tip docs 1:1; tip code устарел vs post-integration main. |

### 2. `cowork/cowork-free-fragment-usercases/sample-recording`

**Last 5 commits**

```
6cec99e9 cowork(.../sample-recording): phase2 запись-цепочка деривацией вычитанием + 20 тестов
fdf7a340 cowork(.../sample-recording): phase1 concept
80d746c6 docs(cowork): brief cowork-free-fragment-usercases (#487) — …
53e47546 docs(ritual): MAIN_DAY_ISSUE 2026-07-15 — …
743f2f38 chore(tasks): архив agent-tooling-friction-2 (#469) — …
```

**`git diff --stat origin/main...BRANCH`:** 8 files, +1178 / −94. Phase1+2: CONCEPT/EXPECTATIONS + `usercase-free-sample-library.ts` (+ test).

**Tip contains:** docs team-sample-recording + FREE sample-library graph (деривация вычитанием) + 20 tests.

**Blob check phase1+2 (+ BRIEF) vs `origin/main`:** identical **5/5**, missing **0**.

| Verdict | Why |
| --- | --- |
| **discard** | Tip freeze `6cec99e9` уже на main побайтно через #489. |

### 3. `cowork/cowork-free-fragment-usercases/spectrum-live`

**Last 5 commits**

```
c0fdabc5 cowork(.../spectrum-live): phase2 билдер документа + 20 тестов деривации
1c22b152 cowork(.../spectrum-live): phase1 concept
80d746c6 docs(cowork): brief cowork-free-fragment-usercases (#487) — …
53e47546 docs(ritual): MAIN_DAY_ISSUE 2026-07-15 — …
743f2f38 chore(tasks): архив agent-tooling-friction-2 (#469) — …
```

**`git diff --stat origin/main...BRANCH`:** 8 files, +1195 / −94. Phase1+2: CONCEPT/EXPECTATIONS + `usercase-free-spectrum-live.ts` (+ test).

**Tip contains:** docs team-spectrum-live + FREE spectrum graph builder + tests. Tip таймер = `is-recording-window-full` (рекордер как часы).

**Blob check phase1+2 (+ BRIEF) vs `origin/main`:** identical **3**, differs **2**, missing **0**.

| Path | Status |
| --- | --- |
| `team-spectrum-live/CONCEPT.md` | identical |
| `team-spectrum-live/EXPECTATIONS.md` | identical |
| `COWORK_SPRINT_BRIEF.md` | identical |
| `usercase-free-spectrum-live.ts` | **differs** (tip→main: +124/−36) |
| `usercase-free-spectrum-live.test.ts` | **differs** (tip→main: +163/−34) |

Differs (tip **older**): main после PC-2 (#505/#507/#511) держит `is-window-elapsed` по host-часам; tip ещё на `node-is-recording-window-full-…`. Re-PR tip откатит PC-2.

| Verdict | Why |
| --- | --- |
| **discard** | Sprint влит #489; docs 1:1; tip spectrum superseded PC-2 на main. |

---

## Already on main?

| Evidence | Status |
| --- | --- |
| `docs/cowork-sprint/cowork-free-fragment-usercases/` (BRIEF, INTERFACE_CONTRACT, RETROSPECTIVE, 3× team CONCEPT/EXPECTATIONS) | present on `origin/main` |
| `packages/device-board/src/graph/usercase-free-{neuro-detection,sample-library,spectrum-live}.ts` (+ tests) | present (и эволюционировали post-merge) |
| Issue #487 | CLOSED 2026-07-15 |
| Task archive `docs/tasks/archive/cowork-free-fragment-usercases.md` | present (archived 2026-07-15) |
| `docs/COWORK_SPRINT_ACTIVE.md` | отмечает #487 закрыт, PR #489 squash `22cfc319` |
| Tip SHAs ancestors of main? | **no** (squash) — expected; do not use `git branch --merged` |
| Origin twins | **already deleted / never present after prune** |

---

## Verdict table (Russian summary)

| Ветка | Ahead/Behind | PR | Вердикт | Почему (одна строка) |
| --- | --- | --- | --- | --- |
| neuro-detection | 4 / 286 | нет | **discard** | #489 влит; tip docs 1:1; tip code ещё competition-stamp → регрессия |
| sample-recording | 4 / 286 | нет | **discard** | Tip phase1+2 = main побайтно |
| spectrum-live | 4 / 286 | нет | **discard** | Tip docs 1:1; tip без PC-2 `is-window-elapsed` |

**Пакет:** discard ×3 (**только local** — origin twins уже gone). Не PR. Archive tip commits не нужен — freeze в ретро/#489; уникального salvage нет.

**Next (только после явного ok владельца):** `git branch -D` на три локальные ветки (или `yarn repo:clean` dry-run → `--execute` scoped). Remote delete не требуется.

---

## Analysis only — await human for GC
