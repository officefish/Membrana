# 2026-08-22 — `pr:ship` exit code is lost by the caller wrapper, not by `pr-ship.mjs`

## Symptom

Three live reports on 2026-08-22 said that `yarn pr:ship` looked successful (`exit 0`) although the PR was not merged. The reports covered failed `push`, failed `ci-wait`, and a two-minute timeout while waiting for CI.

## Reproduction

Worktree: `C:\Users\user190825\practice\Membrana-prship-exit-code`, branch `codex/prship-exit-code`, based on `origin/main` at `e42e3a4c`.

| Probe | Result |
|-------|--------|
| `node scripts/pr-ship.mjs --merge-only --execute` with no PR for the branch | failed at `ci-wait`, exit `1` |
| `yarn pr:ship --merge-only --execute` via Yarn 4.5.0 after per-worktree install | failed at `ci-wait`, exit `1` |
| `node scripts/pr-ship.mjs --type chore --message "exit-code-probe" --no-commit --no-merge --execute` with local pre-push `trace-gate` failure | failed at `push`, exit `1` |
| `yarn pr:ship --type chore --message "exit-code-probe" --no-commit --no-merge --execute` with the same local pre-push failure | failed at `push`, exit `1` |
| PowerShell `Start-Process node ...` without `-Wait` | parent command returned `0` while the child printed the `pr:ship` failure |

The temporary remote branch accidentally created during an unsafe bad-remote probe was deleted: `git push origin --delete codex/prship-exit-code`.

## Verdict

The current `scripts/pr-ship.mjs` path is fail-loud for the observed non-optional steps. The exit code is lost outside the script, by caller wrappers that launch `pr:ship` in the background or let an external timeout kill the waiting shell while the child process continues or fails later.

## Norm

Do not run `pr:ship` through background `Start-Process`, detached shells, pipes, or outer timeouts when the exit code is used for a report. Run it in the foreground. If PowerShell `Start-Process` is required, use `-Wait -PassThru` and propagate `$p.ExitCode` explicitly:

```powershell
$p = Start-Process -FilePath node -ArgumentList @('scripts/pr-ship.mjs', '--merge-only', '--execute') -Wait -PassThru
exit $p.ExitCode
```

For delivery reports, assert the state after the command: `yarn pr:verify <N>` or `gh pr view <N> --json state,mergeCommit`. Exit code of the parent wrapper is not a merge fact.
