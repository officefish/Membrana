# Night Build HANDOFF — graphify-public-graph (2026-07-15)

**Epic:** `graphify-public-graph` · **Branch:** `night/graphify-public-graph-2026-07-15`
**Mode:** SPIKE (no deploy — owner-gate). **Invariant honoured:** CODE-ONLY, zero LLM, zero leak.
**Result in one line:** Tool installs and works; code-only path is genuinely $0 / zero-leak;
BUT a full-monorepo public graph is **not viable** (13 415 nodes > tool's own 5000 viz limit),
and even scoped graphs need pre-deploy hardening. **Recommendation: do NOT deploy now — rework if pursued.**

> **Закрытие (решение владельца 2026-07-16):** спайк закрыт, доработка отложена в
> M-задачу [#529](https://github.com/officefish/Membrana/issues/529) (пост-FREE, не
> переоткрывать). В `main` сохранены только текстовые записи (этот HANDOFF + `METRICS.md`
> + `GRAPH_REPORT-core-scoped.md`); `graph.json`/`graph.html` **НЕ коммитятся** (утечка
> юзернейма + 20 МБ блоб, репо публичный) — репро-командой в разделе NB0/«NOT committed».

---

## NB0 · Installation — встал

- Real package: **`graphifyy`** (PyPI, double-y), CLI **`graphify`** + `graphify-mcp`.
  Install: `uv tool install graphifyy` (isolated, NOT in package.json). ~30 deps incl.
  tree-sitter grammars + numpy/networkx/rapidfuzz.
- **Real version: `0.9.16`** (Jul 2026). Research was wrong twice: neither v0.5.0 nor v8.
- **Research-invented flags `--exclude-private` / `--scope=code+docs` DO NOT EXIST.**
  Real mechanisms:
  - `graphify extract <path> --code-only` — "index code (local AST, no API key) and skip
    doc/paper/image files". This is the zero-LLM, zero-leak path.
  - `.graphifyignore` (`.gitignore` syntax) + respects `.gitignore` automatically.
- First automated bg-install reported completed prematurely (numpy 12 MB still downloading)
  and left a malformed uv receipt; a clean reinstall fixed it. Note for future night installs:
  verify `graphify --version` after install, don't trust early exit.

## NB1 · Code-only run — получен (full graph.json; graph.html только scoped)

- Command: `graphify extract . --code-only --out .graphify-spike` from repo root.
- Scope guard: `.graphifyignore` (copied to `artifacts/graphifyignore.used`) excludes
  `docs/ prd/ data/ datasets/ deploy/ deploy-artifacts/ logs/ .env* ssl/ node_modules/ dist/ .git/`.
  `--code-only` additionally skips all 216 doc files. **No API key in env** → doc-extraction
  physically impossible even if triggered. Belt + suspenders + no belt loops.
- Parsed **2067 code files**, 0 docs/papers/images sent anywhere. `graph.json` (20 MB) written.
- **graph.html was REFUSED by the tool**: `Skipped graph.html: Graph has 13415 nodes -
  too large for HTML viz (limit: 5000).` → did a scoped run on `packages/core` (477 nodes)
  to produce a real, readable `graph.html` (see `artifacts/graph-core-scoped.html`).

## NB2 · Metrics (full numbers in `artifacts/METRICS.md`)

- Full monorepo: **13 415 nodes · 29 010 edges · ~695 communities**, graph.json 20 MB,
  **Token cost 0 / 0** (zero LLM confirmed by the tool's own report).
- Node types: 12 574 code symbols + 841 `concept` (= dependency names from package.json/tsconfig, not doc text).
- **Function-level layer: YES** — ~5129 function/method nodes with a genuine call graph
  (`calls` 4907, `method` 1275, `indirect_call` 411, `imports` 5923, `extends`/`inherits`/`implements`).
  This is the one thing we did NOT already have (package graph is canon in ARCHITECTURE.md §1 + turbo).
- Scoped `packages/core`: **477 nodes · 1172 edges**, graph.html 680 KB — readable.
- **Readability**: full graph busts BOTH the tool's 5000-node viz hard-limit (won't render)
  and the consilium's ~2000-node human threshold. Only per-package/family scope is renderable/readable.
  (Cannot screenshot — no browser; `graph-core-scoped.html` handed off for owner's visual eval.)

## NB3 · Leak audit — ЧИСТ (от секретов/приватного); одна гигиеническая заметка

Audited `graph.json` (13 415 nodes) + `GRAPH_REPORT.md` + scoped `graph.html`:

- **0 nodes** from `docs/`, `docs/seanses`, `docs/discussions`, `docs/virtual-team/memory`,
  `data/`, `datasets/`, `prd/`, `logs/` — the scope held completely.
- **0 `.env` nodes. 0 secret VALUES.** 5 "secret" grep hits are all **symbol names** in code
  (`SECRET_PATTERNS`, `API_TOKEN_SECURITY`) from secret-scanning scripts — identifiers, not values.
- **0 persona/owner names** (Vesnin/Ozhegov/Dynin/Rodchenko/owner email) anywhere.
- 152 "private-dir" grep hits were **false positives**: source *code* files whose names contain
  `persona`/`insight`/`journal`/`memory` (feature implementations), NOT the private `.md` content.
- **HYGIENE ISSUE (must fix before any public deploy):** node `id`s embed the **absolute
  filesystem path incl. Windows username `<owner-username>`** and the worktree name — appears
  **1672×** in the scoped `graph.html` alone. Not a secret/credential, but publishing it
  publicly would expose the owner's username + local path structure. Needs id/path normalization.
- **Not self-contained:** `graph.html` loads `vis-network@9.1.6` from **unpkg.com CDN**
  (not d3, contrary to research). A static Caddy deploy would carry that external dependency
  (also fails strict CSP). Would need vendoring the JS locally.

## NB4 · Recommendation — НЕ деплоить сейчас; доработать, если владелец захочет

**Positive:** the tool is real, installs cleanly, and the code-only mode is exactly what the
invariant demanded — deterministic AST, $0, nothing leaves the machine (proven by env + token-cost 0).
The function-level call graph IS new value over our package-level canon.

**Blockers to a public brand showcase (why not deploy the auto-graph as-is):**
1. **Scale**: 13 415-node whole-repo graph won't even render (tool's own 5000 hard limit) and
   is unreadable by the consilium's threshold. A public showcase must be **scoped per family**
   (foundation / analyzer / detectors / apps), each <5000 nodes — i.e. a curated multi-graph
   index, not one auto-generated blob.
2. **Path/username leak** in node ids (1672×) must be normalized before anything is published.
3. **Theming**: default vis-network render has none of DESIGN.md (dark palette, Inter, family
   legend) — Verstalshchik's concern stands; a branded showcase needs restyling.
4. **External CDN** (unpkg) must be vendored for a self-hosted static deploy.

**Suggested path IF pursued (owner decision, not tonight):** scoped per-family graphs →
id-sanitizer pass → DESIGN.md theme + legend → vendored vis-network → Caddy file_server on
`graphify.mmbrn.tech` after DNS-gate (panel/OM4-C ritual). That is a small M-task, not a
one-liner. Absent that appetite, close as **"проверено: Graphify 0.9.16 работает code-only и
даёт function-level граф, но полный авто-граф монорепо не является жизнеспособной публичной
витриной без скоупинга+санитайза+темизации"** — do not re-open (consilium: negative/partial
result is valid and documented).

---

## Artifacts

**В `main` (текстовые записи, санитайзны):**
- `artifacts/GRAPH_REPORT-core-scoped.md` — scoped report (477 nodes)
- `artifacts/METRICS.md` — all numbers

**НЕ в `main` (только локальная night-ветка `night/graphify-public-graph-2026-07-15`; утечка юзернейма / блоб):**
- `artifacts/graph-core-scoped.html` / `.json` — 477-node граф (утечка пути 1672×, unpkg CDN)
- `artifacts/GRAPH_REPORT-full-monorepo.md` — full-repo report (2688 строк)
- `artifacts/graphifyignore.used`, `/.graphifyignore` — репро-конфиг
- Full-monorepo `graph.json` (20 MB) — регенерируется репро-командой ниже

## NOT committed (deliberate)
- Full-monorepo `graph.json` (20 MB) — reproducible via:
  `graphify extract . --code-only --out <dir>` (needs `uv tool install graphifyy`).
- `.graphify-spike/` working dir (venv/cache/20 MB json) — gitignored.

## Process notes for coordinator
- Worktree had **no `node_modules`** and **no active night build** → `yarn night:checkpoint`
  could not run (findPackageLocation error). Checkpoints were logged manually to
  `docs/NIGHT_BUILD_LOG.md`. The epic docs (prompt/research/seanses) live in the **main**
  working tree, not on this branch — I read them from `../Membrana`.
- No push, no PR, no deploy (per regulation). Ready for morning review.

**Blocker:** none (spike completed; deploy is an owner-gated decision, not a blocker).
