# OPEN: docs/actions — фаза A (device-board processes)

| Поле | Значение |
|------|----------|
| **Sprint** | `docs-actions-phase-a-2026-06-26` |
| **Registry** | `docs-actions-phase-a-2026-06-26` |
| **Issue** | [#182](https://github.com/officefish/Membrana/issues/182) |
| **Kind** | day-sprint |
| **Status** | **closed** (see [`CLOSURE.md`](./CLOSURE.md)) |
| **Started** | 2026-06-26 |
| **Closed** | 2026-06-26 |
| **Size** | L (1 PR) |

**Prompt:** [`DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md`](../../prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md)  
**Actions hub:** [`docs/actions/README.md`](../../actions/README.md)  
**Fixtures hub:** [`docs/device-board-scripts/README.md`](../../device-board-scripts/README.md)

---

## Phases

| Phase | Registry id | Deliverable | Status |
|-------|-------------|-------------|--------|
| **A0** | `da-a0-taxonomy-adr` | `docs/actions/README.md` | ✅ |
| **A1** | `da-a1-scaffold-mv` | git mv 13 MD + redirect-stubs | ✅ |
| **A2** | `da-a2-link-audit` | 57 files link-replace | ✅ |
| **A3** | `da-a3-steering-sync` | skills, `.cursorrules`, `AGENTS.md` | ✅ |
| **A4** | `da-a4-verify-ci` | verify-paths + grep gate | ✅ |
| **A5** | `da-a5-rag-index` | `yarn rag:index` incremental | ✅ defer documented (run locally post-merge, D-ACT-7) |
| **A6** | `da-a6-closure` | LGTM + archive | ✅ |

---

## Gate checklist (A4)

- [x] `docs/actions/device-board/` populated
- [x] Redirect-stubs on old MD paths
- [x] Skills + `.cursorrules` #11 updated
- [x] `node scripts/usercase.mjs verify-paths` green
- [x] `node scripts/usercase.mjs verify-competition` green
- [x] `rg 'device-board-scripts/[A-Z_].*\.md'` — только stubs (+ migration script)
- [x] LGTM Teamlead — see [`CLOSURE.md`](./CLOSURE.md)

---

## Первые команды

```bash
node scripts/usercase.mjs verify-paths
node scripts/usercase.mjs verify-competition
yarn task:sync-readme
```
