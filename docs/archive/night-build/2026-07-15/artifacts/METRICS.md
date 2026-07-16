# Graphify spike — metrics (2026-07-15)

Tool: `graphifyy` **0.9.16** (PyPI, double-y), CLI `graphify` / `graphify-mcp`.
Command (code-only, zero LLM): `graphify extract <path> --code-only`.
Built from commit `8b7f412c`. Token cost: **0 input · 0 output** (confirmed no LLM).

## Full monorepo (scope: repo root, `.graphifyignore` excludes docs/data/prd/etc.)

| Metric | Value |
|--------|-------|
| Code files parsed (AST) | 2067 |
| Docs skipped (`--code-only`) | 216 (0 sent to any LLM) |
| Nodes | **13 415** |
| Edges | **29 010** |
| Communities (Leiden) | 695–697 |
| graph.json size | ~20 MB |
| graph.html | **NOT generated — 13 415 nodes > tool's hard viz limit 5000** |

### Node file_type
| file_type | count | meaning |
|-----------|-------|---------|
| code | 12 574 | code symbols (files, functions, methods, classes) |
| concept | 841 | dependency names from `package.json` / `tsconfig` (e.g. `@membrana/core`, `react`) — NOT doc text |

### Edge relations (function/symbol-level call graph)
| relation | count |
|----------|-------|
| contains | 8897 |
| imports | 5923 |
| calls | 4907 |
| imports_from | 3141 |
| re_exports | 2306 |
| references | 1723 |
| method | 1275 |
| indirect_call | 411 |
| extends | 372 |
| cites | 32 |
| inherits | 15 |
| implements | 8 |

Extraction quality (tool self-report): 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS.

### Function-level layer — YES
~5129 function/method nodes (labels ending `()`), with a real call graph
(`calls` + `method` + `indirect_call` + `extends`/`inherits`/`implements`).
This is the layer we did NOT already have (package graph is canon in ARCHITECTURE.md §1).

## Scoped: `packages/core` (foundation) — readable demo

| Metric | Value |
|--------|-------|
| Code files | 58 |
| Nodes | **477** |
| Edges | 1172 |
| Communities | 25 |
| graph.html | **generated, 680 KB** (`graph-core-scoped.html`) |

477 nodes = within tool viz limit and within the consilium "hundreds, not thousands"
readability band. This is the shape a public showcase would have to take (per-family scope).

## Readability verdict
- Full monorepo (13 415 nodes) exceeds BOTH the tool's own 5000-node viz hard limit
  (won't render at all) AND the consilium's ~2000-node human-readability threshold.
- Only scoped-to-one-package/family graphs (hundreds of nodes) are renderable + readable.
