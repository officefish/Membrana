# Research: agent-tooling-friction-2 (Perplexity, 2026-07-14)

## Q1 — реестр без конфликтов (ti-3 task:register)

**Запрос:** Patterns to avoid git merge conflicts in a shared JSON registry/array file edited concurrently by multiple parallel branches or agents (task registries, changelogs): append-at-end vs sorted insertion, JSONL, file-per-entry (changesets style), custom merge drivers. Trade-offs and what real tools (changesets, towncrier, yarn version plugins) chose and why.

To avoid Git merge conflicts in shared JSON registry/array files edited concurrently, the most effective patterns are **append-at-end** (with a sentinel) or **file-per-entry** (changesets style), while **sorted insertion** and **single-file JSON** are high-conflict strategies. Real tools like **@changesets**, **towncrier**, and **Yarn/NPM lock file generators** explicitly reject sorted insertion in favor of append-only or ephemeral regeneration to prioritize merge safety and automation over history cleanliness.

### Core Trade-offs of Patterns

| Pattern | Conflict Risk | Merge Difficulty | Tooling Complexity | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Append-at-End** | **Low** | Automatic (line-based) | Low (sentinel needed) | Task registries, changelogs |
| **Sorted Insertion** | **High** | Manual (re-sorting) | High (deterministic logic) | Ordered lists (rarely used now) |
| **JSONL (Line-based)** | **Low** | Automatic | Medium (parser needed) | Large logs, audit trails |
| **File-per-Entry** | **None** | Automatic (tree merge) | Medium (aggregator script) | **@changesets**, PR-based workflows |
| **Custom Merge Driver** | **Medium** | Config-dependent | High (script maintenance) | `package-lock.json`, NPM |

#### 1. Append-at-End (with Sentinel)
*   **Mechanism:** Add new entries to the end of the array. A **sentinel value** (e.g., `// END`) is placed at the bottom to ensure Git sees parallel additions as non-conflicting line-insertions [4].
*   **Trade-off:** History becomes unsorted; requires a post-processing step to sort if human readability is needed.
*   **Why it works:** Git merges line-by-line. If two branches append to the end, Git simply combines the lines without conflict markers [4].

#### 2. File-per-Entry (Changesets Style)
*   **Mechanism:** Each concurrent change (e.g., a PR) creates a separate file (e.g., `changeset-uuid.json`). A build script aggregates them into a single `CHANGELOG.md` or registry at release time.
*   **Trade-off:** **Zero merge conflicts** in the source files; requires an aggregation step.
*   **Winner:** Adopted by **@changesets** because it allows hundreds of PRs to modify versioning independently without blocking each other [1].

#### 3. Sorted Insertion
*   **Mechanism:** New entries are inserted alphabetically or by timestamp to maintain order.
*   **Trade-off:** **High conflict risk.** If two agents insert near the same index, Git detects overlapping line changes and forces a conflict.
*   **Reality:** Most modern tools avoid this. It defeats the purpose of parallel distributed development unless a merge driver is used.

#### 4. JSONL (JSON Lines)
*   **Mechanism:** Store each object as a single line in a text file (`.jsonl`), removing the outer array brackets and commas.
*   **Trade-off:** Removes the need for complex JSON merging; Git treats it as a plain text file.
*   **Limitation:** Not valid standard JSON; requires a parser for consumption.

#### 5. Custom Merge Drivers
*   **Mechanism:** Configure `.gitattributes` to invoke a script (e.g., `npm/parse-conflict-json`) that resolves conflicts programmatically by merging JSON objects rather than lines [6][7].
*   **Trade-off:** Powerful but fragile; requires maintaining a custom script that handles edge cases (e.g., type mismatches) [6].
*   **Use Case:** Primarily used for `package-lock.json` where the tool regenerates the file rather than manually merging [7][10].

---

### What Real Tools Chose and Why

| Tool | Strategy | Why This Was Chosen |
| :--- | :--- | :--- |
| **@changesets** | **File-per-Entry** | Enables **parallel PRs** without blocking. Each PR creates a unique file; conflicts are impossible at the source level. Aggregation happens at release [1]. |
| **Towncrier** | **File-per-Entry** (or Append) | Typically uses a `changes/` directory with individual files. It aggregates them into a single `CHANGELOG` on release, avoiding manual merge conflicts in the final file. |
| **Yarn/NPM (`package-lock.json`)** | **Regeneration (Ephemeral)** | Tools like `npm install` or `yarn install` **delete and regenerate** the lock file. They do not attempt to merge conflicting JSON; the lock file is treated as build output, not source [10]. |
| **Git-json-merge** | **Custom Driver** | A niche solution for teams that *must* keep a single sorted JSON file. It uses a custom driver to merge objects semantically, but requires setup [4]. |
| **npm/parse-conflict-json** | **Conflict Parser** | Used internally by NPM to *recover* from a conflict if it happens, but the primary strategy is still regeneration [6]. |

### Critical Insights & Recommendations

1.  **Avoid Sorted Insertion:** Do not manually sort JSON arrays in a shared registry. If two developers add items, they will likely conflict at the same index.
2.  **Prefer Ephemeral Aggregation:** The industry standard (e.g., **@changesets**) is to treat the "master" JSON/Changelog as a **build artifact**. Store source changes in individual files or append-only logs, then generate the final file during release.
3.  **Sentinel Values for Append-Only:** If you must use a single JSON array, add a constant sentinel line at the bottom (e.g., `// DO NOT EDIT BELOW`) to force Git to treat parallel appends as non-conflicting [4].
4.  **Regenerate Lock Files:** For dependency lock files (`package-lock.json`, `yarn.lock`), never merge manually. Always run the install command (`npm install`) on the merged branch to regenerate the file [10].

**Final Recommendation:** For task registries and changelogs, use **File-per-Entry** (like @changesets) to eliminate conflicts entirely. If a single file is required, use **Append-at-End** with a sentinel value [4]. Avoid sorted insertion.

## Q2 — пост-squash-merge автоматизация (ti-1 task:review:ship)

**Запрос:** CLI automation for post-merge bookkeeping bound to exact commit SHA after GitHub squash merge: how to reliably derive the squash merge commit SHA and its parent (base) via gh CLI / GitHub API, common pitfalls (branch deleted, concurrent pushes to main between merge and pull), patterns used by release/deploy bots.

To reliably derive the squash merge commit SHA and its parent (base) via GitHub CLI or API, use `gh pr view` with the `--json mergeCommit` flag to extract the `oid` (SHA), then immediately fetch the parent SHA using `git show -s --format=%P` locally or the GitHub API’s `parents` field for the commit object.

### 1. Deriving the Squash Merge Commit SHA

The squash merge commit SHA is exposed in the Pull Request object as `mergeCommit.oid`. You can retrieve it non-interactively:

```bash
gh pr view <PR_NUMBER> --json mergeCommit | jq -r '.mergeCommit.oid'
```
This returns the exact SHA of the new squash commit created on the base branch (e.g., `main`)[4].

If you are merging via CLI, you can also capture the output of `gh pr merge` if you use `--auto` and parse stderr/stdout, but `pr view` is more reliable post-merge because it reflects the final state on the server[1].

### 2. Deriving the Parent (Base) Commit SHA

The parent of the squash merge commit is the previous tip of the base branch (e.g., `main`) **before** the merge. To get it:

**Option A: Local Git (after fetching)**
```bash
git fetch origin main
git show -s --format=%P origin/main
```
This gives the parent SHA of the *current* `main`, which is the base commit for the squash merge. However, if you want the parent of the *specific* squash commit:

```bash
SQUASH_SHA=$(gh pr view <PR_NUMBER> --json mergeCommit | jq -r '.mergeCommit.oid')
git show -s --format=%P $SQUASH_SHA
```
This outputs the direct parent SHA of the squash commit, which is exactly the base commit the PR was built on[4].

**Option B: GitHub API (remote-only)**
```bash
curl -sH "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/commits/$SQUASH_SHA" | \
  jq -r '.parents[0].sha'
```
This retrieves the parent SHA directly from the API without needing local git state.

### 3. Common Pitfalls

| Pitfall | Risk | Mitigation |
|--------|------|------------|
| **Source branch deleted** | `gh pr view` still works (PR metadata persists), but `git show` fails if you don’t have the squash commit locally[1] | Fetch the commit first: `git fetch origin $SQUASH_SHA` |
| **Concurrent pushes to `main`** | The parent SHA may change if someone merges another PR between your merge and your bookkeeping step | Capture the parent SHA *immediately* after merge; use API to avoid local race conditions |
| **Race condition between merge and query** | `mergeCommit` may not be populated yet if queried too soon | Poll `gh pr view` with `--json state,mergeCommit` until `state == "MERGED"` and `mergeCommit.oid` is non-empty[3] |
| **Branch renamed or deleted locally** | Local `git show` may fail if you don’t have the commit | Always use `git fetch origin <SHA>` before inspecting |

### 4. Patterns Used by Release/Deploy Bots

Release bots (e.g., in GitHub Actions, CircleCI, or custom Deployment Pipelines) typically follow this pattern:

1. **Wait for merge event**: Use `push` event on `main` with a filter for `merge_commit_sha` in the webhook payload.
2. **Extract PR number**: Parse the `pull_request` field from the webhook or use `gh api repos/:owner/:repo/commits/:sha/pulls` to get the associated PR[not directly in results, but standard API practice].
3. **Retrieve squash SHA**: Use `gh pr view <PR_NUM> --json mergeCommit` to get the SHA.
4. **Get parent SHA**: Use `git show -s --format=%P $SQUASH_SHA` or API call to `.parents[0].sha`.
5. **Bind bookkeeping**: Store `(SQUASH_SHA, PARENT_SHA, PR_NUM, timestamp)` in a database or config file for release tracking.

Example bot script snippet:
```bash
SQUASH_SHA=$(gh pr view $PR_NUM --json mergeCommit | jq -r '.mergeCommit.oid')
PARENT_SHA=$(git show -s --format=%P $SQUASH_SHA)
echo "$SQUASH_SHA $PARENT_SHA $PR_NUM" >> release-bookkeeping.log
```

This ensures the release is bound to the *exact* commit that was merged, not a potentially changing `main` tip.

### 5. Verification & Reliability Tips

- Always verify the merge state: `gh pr view $PR_NUM --json state,mergeCommit` until `state == "MERGED"`[3].
- Prefer API over local git for CI environments to avoid network/sync issues.
- If `mergeCommit` is null, the PR isn’t merged yet—wait and retry.

By combining `gh pr view` for the SHA and `git show` or API for the parent, you achieve deterministic, race-resistant bookkeeping bound to the exact squash commit.

## Q3 — координация параллельных агентов (ti-4 neighbors)

**Запрос:** Practices for coordinating multiple parallel AI coding agents or developers working in one repository simultaneously: lightweight work-claim / intent files, scanning recent branches PRs and task registries to detect scope overlap before starting work, examples from multi-agent dev tools (2025-2026).

The most effective practices for coordinating multiple parallel AI coding agents in a single repository combine **structural isolation** (one writer per file, separate Git worktrees) with **lightweight intent signaling** (coordination files locking hotspots) and **pre-flight scope detection** (scanning recent branches/PRs).

### 1. Structural Collision Prevention
To make collisions "structurally impossible," the strongest pattern is restricting access at the file level:
*   **One Writer Per File:** Assign exclusive responsibility for specific files or domains to single agents to prevent overlapping edits [2][3].
*   **Single Committer:** Use one centralized agent or human to perform all Git commits, ensuring a linear history and avoiding merge conflicts from parallel pushes [3].
*   **Isolated Environments:** Isolate each agent in a separate **Git worktree** so they operate on independent copies of the codebase, requiring automated verification before merging [4].

### 2. Lightweight Work-Claim & Intent Files
Instead of shared memory chats, agents should use explicit, file-based coordination:
*   **Coordination/Locking Files:** A coordinator agent creates a dedicated file (e.g., `coordination.md`) that explicitly lists which files are **locked** (in use) and encodes rules for access/unlocking [5].
*   **Intent/Plan Files:** A shared plan with a single "scribe" agent defines the scope and acceptance criteria, ensuring all worker agents align to one spec before starting [3][4].
*   **Session Log Synchronization:** Agents maintain standardized session logs (e.g., `YYYY-MM-DD-[agent]-log.md`) that are cross-referenced to reveal the full implementation story and prevent context drift [2].

### 3. Pre-Start Scope Overlap Detection
Before an agent begins work, it must validate its scope against the current state of the repository:
*   **Scan Recent Activity:** Agents should scan **recent branches, PRs, and task registries** to detect if another agent is already modifying the same module [7].
*   **Domain Boundary Checks:** Define clear **domain boundaries** (e.g., Agent A handles infrastructure, Agent B handles validation) so agents only claim tasks within their exclusive responsibility [2].
*   **Non-Overlapping Chunks:** A coordinator breaks the codebase into **mutually exclusive task groups** based on dependencies (e.g., separating "Workouts" from "Meals") before assigning work [5].

### 4. Examples from Multi-Agent Tools (2025–2026)
Emerging tools and frameworks in this period emphasize orchestration over freeform collaboration:
*   **CodeMachine CLI:** An orchestration engine transforming terminals into a software factory, enabling coordinated multi-agent workflows locally for Codex, Claude Code, and Opencode [15].
*   **Claude Flow:** A platform focused on Claude that features **multi-agent swarms** and autonomous workflows with explicit handoff protocols [15].
*   **ChatDev Framework:** Emphasizes a unified **"memory stream"** of all dialogues and heavy cross-review during generation so agents agree on a single codebase before finalization [8].
*   **Hierarchy Pattern:** Tools increasingly use a hierarchy where an **Architect** plans, a **Manager** breaks tasks, and **Engineers** execute in isolated environments, tracked via a Kanban board [6].
*   **Event-Driven Orchestration:** Modern platforms use event-driven patterns (Agent A finishes → fires event → Agent B starts) rather than polling or parallel "everything-at-once" approaches [11].

### Key Trade-offs
*   **When to use:** Tasks must be cleanly separable by domain with well-defined integration points; the breakeven point for overhead vs. benefit often occurs around the **3-week mark** [2].
*   **When to avoid:** Do not use multi-agent coordination for highly interdependent tasks, quick iterations, or when token budgets are constrained [2].
*   **Conflict Resolution:** A hard rule is that **humans resolve agent conflicts**, not other agents, to prevent autonomous loops or overwrites [14].
