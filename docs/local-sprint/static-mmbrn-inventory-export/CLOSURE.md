# Membrana Local Sprint closure: static-mmbrn-inventory-export

**Status:** CLOSED

**Procedure:** `membrana-local-sprint`

**Registry task:** `static-mmbrn-inventory-export` (#1305-A)

**Parent epic:** `static-mmbrn-container`

## Outcome

PR #1806 delivered an offline-only Affine inventory tool and merged into `main`
as `741a403360497f4d62c427757e807ad00e94cd6a`. The tool accepts an explicit
fenced source bundle, reconciles exact database/export sets, recomputes content
hashes and sizes, emits a canonical manifest, and writes a detached SHA-256 seal.

The work does not read production Affine, `.env`, SSH or the network. Live INV-1
remains `NOT_PERFORMED`; migration, disposition, rehydration, storage binding and
the `static.mmbrn.tech` deployment remain later phases of the parent epic.

## Definition of Done

| Requirement | Evidence | Result |
|-------------|----------|--------|
| Offline fail-closed CLI | explicit input/output/SHA; negative process tests | PASS |
| Exact-set reconciliation | DB/export set, metadata, relation and grant checks | PASS |
| Deterministic sealed output | byte-identical fixture runs and detached seal | PASS |
| Filesystem containment | traversal and junction escape tests | PASS |
| Assigned reviewers saw their blocks | Ozhegov, Dynin and Vesnin final LGTM | PASS |
| Full local sprint procedure | cut contract; gate 3/3 honest_pair; journal pass | PASS |
| Exact-SHA closure and PR review | closure LGTM and review/teamlead on `0b559221` | PASS |
| Server verification and delivery | all GitHub checks green; PR #1806 merged | PASS |

## Review and delivery

The first exact-SHA review BLOCKed nested relation/grant ordering and permissive
calendar validation. Profile reviewers also rejected a vacuous one-element
fixture and the `Date.UTC` handling of years 0000-0099. The fixes added
multi-value ordering evidence and explicit Gregorian arithmetic.

The final reviewed head `0b559221bff118efaeecf8512ba0e132f5d78d5e`
passed the focused suite (16/16), the full script suite (3770 pass, 0 fail, 4
skip), `git diff --check`, the execution gate, canonical Teamlead review and all
server checks before auto-merge.

## Follow-up, not closure debt

The canonical PR reviewer recorded two non-blocking P2 observations: the PR was
larger than the preferred review target, and cross-runtime canonical JSON would
need a standard such as RFC 8785 if the Node-only boundary is ever removed.
Neither changes this task's offline Node scope. The parent epic remains active.
