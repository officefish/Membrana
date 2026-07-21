# Subgroup analysis — cowork-execution-registry leftover (cat.5 A1)

## Meta

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Parent | Category 5 — Эксперимент leftover (`category-5-attention-2026-07-21.md`, tier A1) |
| Scope | Три block-ветки Cowork Sprint `cowork-execution-registry` (+ origin twins) |
| Base | `origin/main` (после `git fetch`; work branch `chore/git-gc-cat5` rebased) |
| Method | Existence · ahead/behind · `gh pr list --head` · last 5 commits · `git diff --stat origin/main...BRANCH` · tip blob compare vs main for phase1+2 paths · landed-on-main check |
| Gate note | Subgroup of cat.5 leftover, not full Scenario B — report under `analysis/` OK |

## Package verdict (prefer one fate)

**discard** — все три ветки (local + origin twins).

Почему пакетом: sprint уже влит squash-PR [#675](https://github.com/officefish/Membrana/pull/675) (2026-07-19), Issue [#660](https://github.com/officefish/Membrana/issues/660) CLOSED, карточка `cowork-execution-registry` в `docs/tasks/archive/`. Уникальный tip phase1+2 либо побайтно на main, либо **устарел** относительно post-merge эволюции (media egress #692, живая проверка Linear в словаре). Открытых PR нет. Tip SHA не предки main (squash) — `ahead=24` раздут общей pre-phase0 историей, не salvage-worthy delta.

Не удалять без явного ok владельца после этого отчёта.

---

## Inventory

| Branch | Local | Origin twin | Tip SHA | Ahead | Behind | Bucket | Open/any PR `--head` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cowork/cowork-execution-registry/lead-persona` | yes | yes (=tip) | `740f2bdd` | 24 | 106 | diverged | none |
| `cowork/cowork-execution-registry/snapshot-cold-migration` | yes | yes (=tip) | `000e1bd9` | 24 | 106 | diverged | none |
| `cowork/cowork-execution-registry/units-trace-measure` | yes | yes (=tip) | `7fff51ec` | 24 | 106 | diverged | none |

Shared fork point (phase0): `221d7801` — `cowork(cowork-execution-registry): phase0 open — brief, ACTIVE, карточка #660`.

Integration landed as: `cowork/cowork-execution-registry/integration` → PR **#675** MERGED (`4d197ab2`, 2026-07-19T19:35Z). Follow-up: PR **#692** moved/wired `linear-snapshot@1` onto media-NL.

---

## Per branch

### 1. `cowork/cowork-execution-registry/lead-persona`

**Last 5 commits**

```
740f2bdd cowork(.../lead-persona): phase2 isolated build — Angelina persona, delegate predicate, isValid
8f927146 cowork(.../lead-persona): phase1 concept
221d7801 cowork(cowork-execution-registry): phase0 open — brief, ACTIVE, карточка #660
d5fbcb70 docs(storm): третий шторм дня — бриф передачи между сессиями и кеш current_task
0acc3bf3 docs(meeting): второе заседание закрыто эпиком + хендофф на коворкинг
```

**`git diff --stat origin/main...BRANCH`:** 82 files, +7613 / −123 (раздут shared history). Phase1+2 alone: **12 files** — docs persona + Angelina prompt/journal + `scripts/lib/angelina-*.mjs` + tests.

**Tip contains:** docs CONCEPT/EXPECTATIONS/stub + Angelina persona surface (PROMPT, MEMORY_SCHEMA, delegate/validate libs). No product app UI; tooling + docs.

**Blob check phase1+2 vs `origin/main`:** identical **12/12**, missing **0**.

| Verdict | Why |
| --- | --- |
| **discard** | Tip freeze `740f2bdd` уже влит через #675; content на main 1:1. |

### 2. `cowork/cowork-execution-registry/snapshot-cold-migration`

**Last 5 commits**

```
000e1bd9 cowork(.../snapshot-cold-migration): phase2 isolated build — снимок, холод, миграция на стабах
03a6b1ec cowork(.../snapshot-cold-migration): phase1 concept
221d7801 cowork(cowork-execution-registry): phase0 open — brief, ACTIVE, карточка #660
d5fbcb70 docs(storm): третий шторм дня — …
0acc3bf3 docs(meeting): второе заседание закрыто эпиком + …
```

**`git diff --stat origin/main...BRANCH`:** 96 files, +9347 / −123. Phase1+2 alone: **26 files** — CONCEPT/EXPECTATIONS/fixtures, office `linear-snapshot/*`, cold-reader/writer, debt-*, snapshot-contract/freshness.

**Tip contains:** docs + JSON stubs/fixtures + Nest office producer stubs + scripts for cold archive / debt gate / snapshot contract. Isolated-build shape; post-#675 main has adapters + media path.

**Blob check phase1+2 vs `origin/main`:** identical **18**, differs **8**, missing **0**.

Differs (tip **older** than main — main evolved):

- `packages/background-office/src/linear-snapshot/*` (4) — main thinned/rewired after integration + #692 (media host + office client)
- `scripts/lib/snapshot-contract.mjs` (+ test) / `snapshot-freshness.test.mjs` — contract tightened on main

| Verdict | Why |
| --- | --- |
| **discard** | Sprint landed #675; tip stubs superseded by main (+ #692). Re-PR tip would regress. |

### 3. `cowork/cowork-execution-registry/units-trace-measure`

**Last 5 commits**

```
7fff51ec cowork(.../units-trace-measure): phase2 isolated build
81e74793 cowork(.../units-trace-measure): phase1 concept
221d7801 cowork(cowork-execution-registry): phase0 open — brief, ACTIVE, карточка #660
d5fbcb70 docs(storm): третий шторм дня — …
0acc3bf3 docs(meeting): второе заседание закрыто эпиком + …
```

**`git diff --stat origin/main...BRANCH`:** 84 files, +8046 / −123. Phase1+2 alone: **14 files** — CONCEPT/EXPECTATIONS, `UNITS_DICTIONARY.md`, measure-* + trace-* libs/tests.

**Tip contains:** docs + measurement/trace tooling (acceptance, exit codes, leadPersona, metrics/report). No Nest/UI.

**Blob check phase1+2 vs `origin/main`:** identical **13**, differs **1** (`docs/tasks/UNITS_DICTIONARY.md`), missing **0**.

`UNITS_DICTIONARY.md`: main **богаче** tip — живая проверка Linear 19.07 (`delegate` vs `delegatedAgent`, DRU-93, geo-block) дописана на интеграции; tip = pre-live research wording.

| Verdict | Why |
| --- | --- |
| **discard** | Tip freeze `7fff51ec` влит #675; единственный diff — устаревший словарь. |

---

## Already on main?

| Evidence | Status |
| --- | --- |
| `docs/cowork-sprint/cowork-execution-registry/` (BRIEF, INTERFACE_CONTRACT, RETROSPECTIVE, 3× team CONCEPT/EXPECTATIONS/stubs) | present on `origin/main` |
| Angelina / cold / debt / snapshot-contract / trace / measure scripts | present |
| office + media `linear-snapshot` | present (media added #692) |
| Issue #660 | CLOSED 2026-07-19 |
| Task archive `docs/tasks/archive/cowork-execution-registry.md` | notes: COMPLETED; squash-PR #675 |
| Consilium freeze SHAs | `docs/discussions/cowork-sprint-cowork-execution-registry-interface-consilium.md` cites `740f2bdd` / `7fff51ec` / `000e1bd9` |
| Tip SHAs ancestors of main? | **no** (squash) — expected; do not use `git branch --merged` |

---

## Verdict table (Russian summary)

| Ветка | Ahead/Behind | PR | Вердикт | Почему (одна строка) |
| --- | --- | --- | --- | --- |
| lead-persona | 24 / 106 | нет | **discard** | Tip phase1+2 = main побайтно; sprint влит #675 |
| snapshot-cold-migration | 24 / 106 | нет | **discard** | Tip stubs устарели vs main/#692; регрессия при revive |
| units-trace-measure | 24 / 106 | нет | **discard** | Tip влит #675; словарь на main новее |

**Пакет:** discard ×3 (local + origin). Не PR. Archive tip commits не нужен — freeze SHA уже в consilium/ретро; уникального salvage нет.

**Next (только после явного ok владельца):** `yarn repo:clean` dry-run → `--execute` на эти шесть refs (3 local + 3 `origin/...`), либо точечный `git push origin --delete` + `git branch -D`.

---

## Analysis only — await human for GC
