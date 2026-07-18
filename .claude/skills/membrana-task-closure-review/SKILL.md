---
name: membrana-task-closure-review
description: >-
  Automatically runs the Membrana Teamlead closure review for a registered GitHub Issue,
  task, sprint, or epic after successful commit/push; prepares the exact-SHA manifest,
  produces an LGTM/BLOCK artifact, reports status, and guards final archive. Use when the
  user asks to finish, close, publish and review, perform Team Lead review, or continue the
  task lifecycle after push. Do not use for daily evening review or when the user explicitly
  requests commit/push only and asks to stop there.
---

# Membrana task closure review

Follow [`TASK_CLOSURE_REVIEW_REGULATION.md`](../../../docs/prompts/TASK_CLOSURE_REVIEW_REGULATION.md)
and [`TASK_CLOSURE_REVIEW_PROMPT.md`](../../../docs/prompts/TASK_CLOSURE_REVIEW_PROMPT.md).

## Порядок: доделать ВСЁ до `prepare` (#510)

Артефакт ревью **неизменяем по SHA** — любой новый коммит обнуляет LGTM и требует полного
повтора: `prepare` → CI → `run`. 2026-07-15 это стоило двух лишних циклов CI (~8 мин каждый):
дописал промпт после ревью, слил `main` после ревью.

Правило не ослабляет гейт (он в тот же день спас: `finalize` отказался закрывать задачу на
конфликтующем PR) — оно лишь экономит циклы. **До `prepare`:**

1. `git merge origin/main` — если `main` ушёл вперёд, слить СЕЙЧАС, а не после LGTM.
2. Промпт задачи существует и заполнен (`task:register` кладёт заготовку — дописать).
3. Все коммиты пакета на месте; после `prepare` в ветку не коммитить.
4. `gh pr view <N> --json mergeable` = `MERGEABLE`.

## Workflow

1. Resolve exactly one active `taskId` from `docs/tasks/registry.json`. Fail closed if
   ambiguous or missing.
2. After successful push, run:

   ```bash
   yarn task:review:prepare --id <task-id> [--base <ref>] [--pr N]
   ```

   Use `--base` for a multi-commit sprint; the default reviews the latest commit only.
3. Run Teamlead review with relevant domain checks:

   ```bash
   yarn task:review:run --id <task-id> --check "<domain command>"
   ```

   The runner uses the configured Anthropic provider. If unavailable, perform the review in
   the current IDE using the canonical prompt, save the strict output to a temporary file
   outside the repository, and pass `--review-file <temp-path>`.
4. Report Tier, exact SHA, artifact path, P0/P1/P2, and `LGTM | BLOCK` without waiting for
   the user to repeat “team lead review”.
5. On BLOCK, do not archive or close the Issue. Fix, commit, push, prepare, and review the
   new SHA when the user authorized completion of the implementation.
6. Finalize only after GitHub confirms merge, or after the user explicitly accepts a
   branch-only result with a reason:

   ```bash
   yarn task:review:finalize --id <task-id>
   yarn task:review:finalize --id <task-id> --accepted-branch-only "<reason>"
   ```

## Safety

- Pass the FULL DoD evidence set in `--check` on the FIRST run (turbo lint+typecheck+test
  for touched packages, check:boundaries, verify:wire-sync, client typecheck as applicable):
  the review artifact is IMMUTABLE per SHA — недобор evidence = BLOCK, чинится только новым
  SHA и повторным ревью (прецеденты 2026-07-09: detection-ensemble-service, basn-1).
- Never reuse LGTM after SHA or diff-scope changes.
- Never infer merge, Issue closure, tests, or remote state.
- Never use branch-only acceptance without explicit user authorization.
- Preserve unrelated worktree changes; closure review is commit-diff based.
- If the user says “commit/push only” or “stop after publishing”, stop before `prepare`.

## Dry run and status

```bash
yarn task:review:prepare --id <task-id> --dry-run
yarn task:review:run --id <task-id> --dry-run
yarn task:review:status --id <task-id>
yarn task:review:finalize --id <task-id> --dry-run
```
